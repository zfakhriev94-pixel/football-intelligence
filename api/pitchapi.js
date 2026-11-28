// PitchAPI diagnostic proxy. The API key stays server-side.
const BASE = "https://api.pitchapi.dev/v1";
const MATCH_ID = /^m_[A-Za-z0-9]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const VIEWS = new Set(["live", "shots", "stats", "advanced", "lineups", "momentum", "events", "heatmaps"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.PITCHAPI_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: "PITCHAPI_API_KEY is not configured in Vercel.",
      code: "PITCHAPI_NOT_CONFIGURED"
    });
  }

  const q = req.query || {};
  const view = typeof q.view === "string" ? q.view : "";
  const matchId = typeof q.match_id === "string" ? q.match_id : "";
  let path;
  const params = new URLSearchParams();

  if (view === "leagues" && !matchId && !q.date) {
    path = "/leagues";
  } else if (typeof q.date === "string" && !matchId && !view) {
    if (!DATE.test(q.date)) return res.status(400).json({ error: "date must use YYYY-MM-DD" });
    path = "/date/" + q.date;
    if (typeof q.status === "string" && q.status) {
      if (!["played", "upcoming", "all"].includes(q.status)) {
        return res.status(400).json({ error: "status must be played, upcoming, or all" });
      }
      params.set("status", q.status);
    }
  } else if (matchId && MATCH_ID.test(matchId) && VIEWS.has(view)) {
    const suffix = view === "live" ? "live" : view;
    path = "/matches/" + matchId + "/" + suffix;
  } else {
    return res.status(400).json({
      error: "Use view=leagues, date=YYYY-MM-DD, or match_id=m_XXXXXX with a supported view.",
      supported_views: Array.from(VIEWS)
    });
  }

  try {
    const url = BASE + path + (params.size ? "?" + params.toString() : "");
    const upstream = await fetch(url, {
      method: "GET",
      headers: { "X-API-KEY": key, "Accept": "application/json" },
      signal: AbortSignal.timeout(12000)
    });
    const body = await upstream.json().catch(() => ({}));

    res.setHeader("X-Data-Provider", "PitchAPI");
    const quotaRemaining = upstream.headers.get("x-quota-remaining");
    if (quotaRemaining) res.setHeader("X-PitchAPI-Quota-Remaining", quotaRemaining);
    const quotaLimit = upstream.headers.get("x-quota-limit");
    if (quotaLimit) res.setHeader("X-PitchAPI-Quota-Limit", quotaLimit);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: body?.error?.message || body?.message || "PitchAPI request failed",
        code: body?.error?.code || "PITCHAPI_UPSTREAM_ERROR",
        provider_status: upstream.status,
        request_id: body?.error?.request_id || null
      });
    }

    return res.status(200).json({
      ...body,
      provider: "PitchAPI",
      fetched_at: new Date().toISOString()
    });
  } catch (error) {
    return res.status(502).json({
      error: "Could not reach PitchAPI",
      detail: error.name === "TimeoutError" ? "Provider timeout" : "Network error"
    });
  }
};
