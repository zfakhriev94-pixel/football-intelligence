# PitchAPI integration — setup and validation

This branch adds a **separate diagnostic proxy** at `/api/pitchapi`. It does not replace Soccer Data or change the current production UI.

## Required Vercel environment variable

Add `PITCHAPI_API_KEY` to **Preview** first (and Production only after validation). Keep the key server-side; never put it in browser code or Git.

Free plan currently advertises 15,000 requests/day, 600 requests/minute, and a separate 60 requests/minute limit for live snapshots. Poll live snapshots no faster than every 10 seconds; our app should initially poll them no more frequently than every 30 seconds.

## Diagnostic requests

- `GET /api/pitchapi?view=leagues` — list covered competitions.
- `GET /api/pitchapi?date=2026-11-28&status=all` — fixtures and results for a date.
- `GET /api/pitchapi?match_id=m_XXXXXX&view=live`
- `GET /api/pitchapi?match_id=m_XXXXXX&view=shots`
- `GET /api/pitchapi?match_id=m_XXXXXX&view=stats`
- `GET /api/pitchapi?match_id=m_XXXXXX&view=advanced`
- `GET /api/pitchapi?match_id=m_XXXXXX&view=lineups`
- `GET /api/pitchapi?match_id=m_XXXXXX&view=momentum`
- `GET /api/pitchapi?match_id=m_XXXXXX&view=events`
- `GET /api/pitchapi?match_id=m_XXXXXX&view=heatmaps`

The proxy validates route parameters, forwards the API key only from the server, returns the provider's JSON envelope, and surfaces quota headers. A missing key returns `503 PITCHAPI_NOT_CONFIGURED`.

## Validation gate before using PitchAPI in match analysis

1. Confirm the catalogue includes the competitions we actually use (especially J1 and J3; do not infer J3 from J1 coverage).
2. Compare the same completed matches against a second source: score, shots, xG, xGOT, lineups and event timestamps.
3. For live matches, check that `live` is true, `stale` is false, and `fetched_at/age_seconds` are fresh; separately verify whether the shots endpoint includes in-progress shots and xG.
4. Record which fields are missing by competition and match. Never convert missing values to zero.
5. Keep Soccer Data as the existing fixture/live-stat source until the validation passes. Do not combine xG totals from different providers in one calculation.

## Important implementation note

PitchAPI match IDs (`m_...`) are different from Soccer Data IDs (`match_...`). A later integration must resolve fixtures by date + home/away team identity and verify the match before requesting PitchAPI analytics. Do not pass one provider's ID to the other.
