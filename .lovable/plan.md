# CropSense AI — Build Plan

The spec is large, so it is delivered in phases. Each phase leaves a working, navigable app. Phase 1 starts right after approval; later phases follow in the next turns.

## Design direction
- Linear/Vercel-style enterprise dashboard: neutral off-white surfaces, charcoal text, deep agricultural green primary, light green accents, amber warnings, red only for serious alerts.
- Typography: Geist (UI) + Geist Mono (measurements, IDs). Tight 6px radius, hairline borders, no glass or neon.
- Logo: leaf inside a CV bounding-box frame (SVG).
- Generated realistic crop-field photography for the hero and demo records, with CV overlays drawn as SVG (masks, contours, boxes, labels) — never baked into the photo.

## Phase 1 — Foundation and core journey
- Lovable Cloud: auth (sign up, login, logout, forgot/reset password, protected routes).
- Database schema: profiles, fields, crops, analyses, analysis_images, analysis_regions, analysis_measurements, agent_actions, recommendations, reports, notifications — with relationships, timestamps, indexes and per-user access rules.
- Private storage buckets: uploads, processed, reports.
- Landing page: hero with CV-overlay visualization, How it works, Capabilities, Agentic vision workflow, Technology, CTA.
- App shell: sidebar (Overview, Analyze, Fields, History, Reports, Agent Activity, Anomalies, Recommendations, Settings), header with search, notifications, system status, profile.
- Dashboard: 4 metric cards, Crop Health chart (7D/30D/90D), donut distribution, recent analyses table.
- New Analysis: drag-and-drop upload (JPG/PNG/WEBP/MP4) with validation, field/crop/mode/notes.
- Analysis Progress: 9-step pipeline with pending/processing/completed/failed.
- Analysis Result: side-by-side original vs CV result, metrics, tabs (Overview, Vision, Measurements, Agent Activity, Recommendations), zoom/reset/fullscreen viewer.

## Phase 2 — Management and insights
- Fields: list, add/edit/delete, field detail with trend, alerts and history.
- Analysis History: search, filters, sort, pagination.
- Reports: weekly, monthly, comparison; View / Generate / Export PDF (backend-ready).
- AI Insights pages, notification center, Settings (profile, preferences, notifications, analysis, system status with health checks).

## Phase 3 — Hardening and docs
- 404/500/network/backend-unavailable states, skeletons and empty states everywhere.
- README with Mermaid architecture, AWS path, OpenCV integration guide; .env.example; Python FastAPI + OpenCV 5 reference service skeleton in a separate `vision-service/` folder.
- Tests for upload validation, analysis creation/retrieval, fields, reports.

## Honesty rules (all phases)
- A vision adapter interface with two implementations: `HttpVisionAdapter` (calls the configured FastAPI URL) and `DemoVisionAdapter` (clearly labelled mock).
- Every demo-produced record is stored with `source = 'demo'` and shown with a "Demo value" badge. With no backend configured, metrics show "Waiting for backend" rather than invented numbers.
- Agent abstraction returns REQUEST_REGION_ANALYSIS / REQUEST_NEW_IMAGE / FINAL_ASSESSMENT / HUMAN_REVIEW; the demo agent is rule-based and labelled as such. No disease names or treatment advice.

## Technical details
- TanStack Start file routes (`_authenticated` layout for app pages); this replaces the spec's `pages/` folder, with `services/`, `types/`, `lib/` kept as suggested.
- Server functions act as the app's API layer, mirroring the spec's `/api/*` contract; vision/agent calls go to `VISION_API_URL` when set.
- Recharts for charts; shadcn components restyled through design tokens.
