# Pitch Perfect - Master Reference (As-Is)

This document is a comprehensive reference for the Pitch Perfect fantasy cricket app as it exists in this repo. It is intended to give any LLM or new engineer enough context to reason about the system, data model, APIs, flows, and design without reading the code.

## Product Overview

Pitch Perfect is a draft-based fantasy cricket app focused on the IPL. Users join or create leagues, build squads via draft orders, apply boosted roles to players, track match performance, and trade players throughout a season. The app is mobile-first with a "Liquid Glass" UI system and supports dark/light themes.

Core user-facing features:
- Account creation, login, JWT-based auth, and user profile preferences (theme).
- League creation/joining via league code; max team size and season selection.
- Squad creation and management, including current squad and core/boosted assignments.
- Pre-season drafts and mid-season draft windows.
- Match views and match previews (league or general context).
- Player stats, team stats, and league analytics dashboards.
- Trading workflow (create, accept, reject; conflict handling).
- Standalone/mobile UX polish (bottom navigation, pull-to-refresh, safe areas).

## Architecture

High-level structure:
- Frontend: React SPA (React Router v6), Tailwind CSS + custom Liquid Glass design system.
- Backend: Django 5 + Django REST Framework (DRF) + JWT auth.
- Data source integration: CricketData API (via `api.services.cricket_data_service`).
- Database: Postgres in production (via `DATABASE_URL`), MySQL in local docker-compose (see notes).
- Caching: Django LocMemCache (in-process).

Key runtime paths:
- Frontend requests the backend API via `REACT_APP_API_URL`.
- Backend exposes `/api/` endpoints and uses JWT for authentication.
- Match data is synced from CricketData API, which drives points and stats.

## Repository Layout

Top-level:
- `frontend/` React UI and static assets.
- `backend/` Django project, API app, and management commands.
- `docker-compose.yml` local MySQL container (note database mismatch vs settings).
- `requirements.txt` and `backend/requirements.txt` Python deps.
- `Procfile`, `railway.toml` for deployment.

Backend structure:
- `backend/backend/settings.py` core Django settings.
- `backend/backend/settings_railway.py` Railway-specific overrides.
- `backend/api/models.py` domain data model.
- `backend/api/serializers.py` DRF serializers.
- `backend/api/views.py` primary API endpoints.
- `backend/api/views_stats.py` stats-focused endpoints.
- `backend/api/user_views.py` profile and password endpoints.
- `backend/api/admin_views.py` admin web endpoints for draft ops.
- `backend/api/services/` domain services for drafts and stats.
- `backend/api/management/commands/` CLI utilities for data ops.

Frontend structure:
- `frontend/src/App.js` routes and app shell.
- `frontend/src/context/` global state (auth, modals).
- `frontend/src/components/` UI components by domain.
- `frontend/src/styles/` Tailwind + Liquid Glass system.
- `frontend/src/utils/` API and domain helpers.
- `frontend/public/` manifest, icons, and images.

## Data Model (Backend)

Base mixins:
- `SoftDeleteModel`: `is_active`, `deleted_at`.
- `TimeStampedModel`: `created_at`, `updated_at`.

Cricket domain:
- `Competition`: name, format (T20/ODI/TEST), grade.
- `Season`: competition, year, name, start/end, status (UPCOMING/ONGOING/COMPLETED/CANCELLED), `default_draft_order`.
- `SeasonPhase`: phase timeline with `open_at`, `lock_at`, `start`, `end`.
- `IPLTeam`: team metadata, colors, logo, `other_names`, `is_active`.
- `TeamSeason`: many-to-many join for `IPLTeam` and `Season`.
- `IPLPlayer`: role, styles, `cricdata_id`, `is_active`, image.
- `PlayerTeamHistory`: per-season player assignment to team with `points`.
- `IPLMatch`: season, match number, teams, date, status, toss/winner, scores, `cricdata_id`.
- `IPLPlayerEvent`: per-match player stats and derived point totals.

User and fantasy domain:
- `UserProfile`: per-user theme preference.
- `FantasyLeague`: name, logo, color, admin, season, league code, draft state.
- `FantasySquad`: user team in a league, `current_squad`, `current_core_squad`, `future_core_squad`, `total_points`.
- `SquadPhaseBoost`: phase-specific boost assignments for a squad.
- `DraftWindow`: draft windows per season (pre, mid, playoff, custom), draft pool, retention phase.
- `FantasyDraft`: per-squad preference order for draft windows.
- `FantasyBoostRole`: multipliers for specific player roles and stat categories.
- `FantasyPlayerEvent`: per-squad per-match player event with boost points.
- `FantasyTrade`: trade offers and status.
- `FantasyMatchEvent`: per-squad per-match totals and running ranks.
- `FantasyStats`: precomputed league stats cache (JSON fields).

Relationships (simplified):
- `Competition` -> `Season` -> `SeasonPhase` -> `IPLMatch`.
- `IPLTeam` <-> `IPLPlayer` via `PlayerTeamHistory` and seasons.
- `FantasyLeague` -> `FantasySquad` -> `FantasyDraft`/`FantasyTrade`.
- `IPLPlayerEvent` -> `FantasyPlayerEvent` -> `FantasyMatchEvent`.
- `DraftWindow` ties to `Season` and `SquadPhaseBoost` for retention.

## Scoring and Boost System

Base points live in `IPLPlayerEvent` and are computed on save:
- Batting: runs + fours + 2* sixes + milestones (+50/+100) + strike-rate bonus/penalty.
- Bowling: wickets*25 + maidens*8 + milestone bonuses + economy bonus/penalty.
- Fielding: catches, stumpings, run-outs.
- Other: player of match (+50) + playing bonus (+4).
- Duck penalty applies for non-bowlers dismissed for 0.

Boosts (`FantasyBoostRole`) apply multipliers to subsets of the base scoring categories:
- Batting multipliers: runs, fours, sixes, strike rate, milestones.
- Bowling multipliers: wickets, maidens, economy, milestones.
- Fielding multipliers: catches, stumpings, run outs.
- Other: POTM and participation.

Boost application:
- Core squad assignments (`current_core_squad`) map boost roles to player IDs.
- `CricketDataService` applies boosts when creating `FantasyPlayerEvent` entries.

## API Surface (Backend)

Base URL: `/api/`
Auth: JWT Bearer tokens.

Auth and user:
- `POST /api/token/` (JWT login via SimpleJWT).
- `POST /api/token/refresh/`.
- `POST /api/register/` (register user).
- `POST /api/verify-token/` (token validation placeholder).
- `GET /api/user/` (current user + profile).
- `POST /api/user/preferences/` (theme update).
- `GET|PATCH /api/user/profile/` (profile fields).
- `POST /api/user/change-password/`.

Core viewsets (REST CRUD):
- `/api/competitions/`
- `/api/seasons/`
- `/api/phases/`
- `/api/draft-windows/`
- `/api/teams/`
- `/api/players/`
- `/api/matches/`
- `/api/leagues/`
- `/api/squads/`
- `/api/drafts/`
- `/api/trades/`

Notable viewset actions:
- Seasons: `/api/seasons/:id/matches/`, `/api/seasons/:id/phases/`.
- Teams: `/api/teams/:id/seasons/`, `/api/teams/:id/players/?season=YYYY`.
- Players: `/api/players/:id/history/`.
- Matches: `/api/matches/upcoming/`, `/api/matches/live/`, `/api/matches/by_season/?season=&phase=`.
- Drafts: `/api/drafts/get_draft_order/?league_id=`, `/api/drafts/:id/update_order/`.
- Trades: `/api/trades/:id/accept/`, `/api/trades/:id/reject/`.

Additional endpoints:
- Squads: `/api/squads/:id/players/`, `/api/squads/:id/player-events/`, `/api/squads/:id/phase-boosts/`, `/api/squads/:id/core-squad/`.
- Boost roles: `/api/fantasy/boost-roles/`.
- League player stats: `/api/leagues/:league_id/players/:player_id/`.
- Match events: `/api/leagues/:league_id/matches/:match_id/events/`, `/api/matches/:match_id/events/`.
- Match stats: `/api/matches/:match_id/stats/`, `/api/matches/:match_id/standings/`.
- Match preview: `/api/matches/:match_id/preview/`, `/api/leagues/:league_id/matches/:match_id/preview/`.
- Recent matches: `/api/seasons/:season_id/matches/recent/`.
- Manual points update: `/api/update-match-points/`.

Stats endpoints:
- `/api/leagues/:league_id/stats/season-mvp/`
- `/api/leagues/:league_id/stats/match-mvp/`
- `/api/leagues/:league_id/stats/season-total-actives/`
- `/api/leagues/:league_id/stats/most-players-in-match/`
- `/api/leagues/:league_id/stats/most-points-in-match/`
- `/api/leagues/:league_id/stats/rank-breakdown/`
- `/api/leagues/:league_id/stats/domination/`
- `/api/leagues/:league_id/stats/running-total/`
- `/api/leagues/:league_id/stats/table`

Mid-season draft:
- `/api/leagues/:league_id/mid-season-draft/order/`
- `/api/leagues/:league_id/mid-season-draft/pool/`
- `/api/leagues/:league_id/mid-season-draft/retained-players/`
- `/api/admin/run-fantasy-draft/`
- `/api/admin/run-mid-season-draft/`
- `/api/admin/compile-mid-season-draft-pools/`
- `/api/admin/execute-mid-season-draft/:league_id/`

## Data Sync and Stats Pipeline

CricketData API integration (`CricketDataService`):
- Fetches match scorecards (`match_scorecard` endpoint).
- Updates `IPLMatch` state (scores, toss, winner).
- Generates/updates `IPLPlayerEvent` for batting/bowling/fielding.
- Creates/updates `FantasyPlayerEvent` and `FantasyMatchEvent`.
- Updates squad totals and running ranks.

Stats pipeline:
- `FantasyStats` stores precomputed JSON for charts and tables.
- `api.services.stats_service` recalculates stats across matches and phases.
- `views_stats` serves cached stats (optional cache bypass header).

## Draft and Trade Workflows

Pre-season draft:
- Each squad maintains a ranked player order (`FantasyDraft.order`).
- League draft order uses `FantasyLeague.snake_draft_order` or derived default.
- Admin run flow in `admin_views.run_fantasy_draft`.

Mid-season draft:
- Draft windows (`DraftWindow.Kind.MID_SEASON`) define timeline and draft pool.
- Retained players come from `SquadPhaseBoost` assignments tied to a retention phase.
- Draft pool computed from non-retained players across squads.
- Execution can be triggered via admin view or API endpoint.

Trades:
- `FantasyTrade` contains players given/received and status.
- Accept flow rejects conflicting pending trades automatically.
- Trades during live matches can be deferred.

## Frontend: Routing and UX

Routes (see `frontend/src/App.js`):
- Public: `/login`, `/register`.
- Authenticated: `/dashboard`, `/profile`, `/how-it-works`.
- Leagues: `/leagues/:leagueId` with tabs (dashboard, matches, table, trades, stats, squads, my_squad).
- Squad: `/leagues/:leagueId/squads/:squadId`, plus legacy `/squads/:squadId` redirect.
- Roster: `/leagues/:leagueId/roster`.
- Matches: `/matches/:matchId`, `/matches/:matchId/preview`, league equivalents.

Key UI components:
- `Header`, `BottomNavigation`, `PullToRefresh`, `LoadingScreen`.
- League UI: `LeagueView`, `LeagueDashboard`, `LeagueTable`, `LeagueStats`, `LeagueSquads`, `TradeList`.
- Squad UI: `SquadView`, `RoleSlotGrid`, `PlayerSelectionPanel`, boost tabs.
- Matches UI: `MatchView`, `MatchPreview`, match cards.
- Stats UI: charts and tables under `components/stats/`.
- Player modals and profile pages.

State and API usage:
- Auth state in `AuthContext`; tokens stored in localStorage and injected into axios.
- API calls use `frontend/src/utils/axios.js` with `REACT_APP_API_URL`.
- Draft modal context for draft flows.

## Design System

The UI uses a custom "Liquid Glass" design system:
- Defined in `frontend/src/styles/liquid-glass.css`.
- Glassmorphism effects, animated gradients, and branded accent color.
- Mobile-first safe-area support and iOS viewport handling in `index.css`.
- Dark mode toggle supported; auth pages default to dark theme.

## Operations and Deployment

Environment variables:
- Backend:
  - `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`.
  - `CRICDATA_API_KEY` for CricketData API access.
  - `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`.
- Frontend:
  - `REACT_APP_API_URL`.

Deployment:
- Railway configs exist for both frontend and backend (`railway.toml`).
- Backend `start.sh` runs `collectstatic`, migrations, and gunicorn.
- Frontend uses `serve -s build` or express fallback via `server.js`.
- Dockerfile builds React app and serves it with Node.

Database:
- Production uses Postgres (via `DATABASE_URL`).
- Local `docker-compose.yml` provisions MySQL (note mismatch with settings).

Static assets:
- Django uses WhiteNoise for static serving.
- React build output served via `serve` or express.

## Management Commands (Backend)

Available commands under `backend/api/management/commands/`:
- `compile_draft_pools`: compute mid-season draft pools.
- `create_season_phases_from_matches`: generate `SeasonPhase` rows from match data.
- `create_squad_phase_boosts_from_events`: infer boost assignments by phase.
- `execute_mid_season_draft`: run mid-season draft (CLI).
- `run_fantasy_draft`: run pre-season draft (CLI).
- `update_points`, `update_player_event_points`, `recalculate_points`, `fix_points`: points maintenance.
- `process_trades`: process accepted trades.
- `export_data`: export data from the database.

## Testing

There are no automated tests implemented in the backend or frontend at this time (`backend/api/tests.py` is empty).

## Known Operational Notes

- JWT is used for API authentication; tokens are stored in localStorage on the client.
- Stats endpoints are cached; cache can be bypassed with `X-Bypass-Cache: 1`.
- Match data depends on CricketData API availability and correct `cricdata_id`.
- Draft pools and retained players are stored in JSON fields.

