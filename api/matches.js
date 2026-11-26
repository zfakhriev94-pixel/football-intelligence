// Vercel serverless proxy. The provider key stays server-side.
const BASE = "https://api.soccer-data.co/v1";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const key = process.env.SOCCER_DATA_KEY;
  if (!key) return res.status(503).json({ error: "SOCCER_DATA_KEY is not configured in Vercel." });

  const q = req.query || {};
  const matchId = typeof q.match_id === "string" ? q.match_id : "";
  const view = typeof q.view === "string" ? q.view : "";
  let path = "/matches";
  const params = new URLSearchParams();

  if (matchId) {
    if (!/^match_[a-z0-9]{12}$/i.test(matchId)) return res.status(400).json({ error: "Invalid match_id" });
    if (view === "live-stats") path += "/" + encodeURIComponent(matchId) + "/live-stats";
    else if (view === "stats") path += "/" + encodeURIComponent(matchId) + "/stats";
    else if (view === "timeline") path += "/" + encodeURIComponent(matchId) + "/timeline";
    else return res.status(400).json({ error: "Unsupported match view" });
  } else {
    for (const name of ["status", "date_from", "date_to", "team_id", "competition_id", "season_id", "page", "utc_offset"]) {
      const value = q[name];
      if (typeof value === "string" && value.trim()) params.set(name, value.trim());
    }
    if (params.get("status") && !["live","scheduled","finished","postponed","cancelled"].includes(params.get("status"))) {
      return res.status(400).json({ error: "Invalid status" });
    }
  }

  try {
    const url = BASE + path + (params.size ? "?" + params.toString() : "");
    const upstream = await fetch(url, {
      headers: { "X-Api-Key": key, "Accept": "application/json" },
      signal: AbortSignal.timeout(12000)
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: body?.error?.message || body?.message || "Soccer Data API request failed",
        code: body?.error?.code || "UPSTREAM_ERROR",
        provider_status: upstream.status
      });
    }
    res.setHeader("X-Data-Provider", "Soccer Data");
    const cache = upstream.headers.get("x-cache");
    if (cache) res.setHeader("X-Provider-Cache", cache);
    return res.status(200).json(body);
  } catch (error) {
    return res.status(502).json({ error: "Could not reach Soccer Data API", detail: error.name === "TimeoutError" ? "Provider timeout" : "Network error" });
  }
};
