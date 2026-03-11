# Growth Metrics Dashboard

Full-stack dashboard to post and visualize growth metrics. Single-page UI: filters, line chart, and an Add metric modal.

## Overview

The app lets you **post metrics** (name, value, timestamp, unit), **persist** them in PostgreSQL, and **view** them in a line chart with time-range and metric selection. The UI is defensive: date and value validation, skeleton loading, and clear error states. Data is fetched with SWR (on-demand revalidation, no background polling), and the API limits responses to 5000 rows.

## Tech stack

- **Next.js** (App Router), **TypeScript**
- **Prisma** + **PostgreSQL**
- **Recharts** for the line chart
- **TailwindCSS** for styling
- **SWR** for data fetching

## Project structure

```
prisma/
└── schema.prisma           # Database schema and migrations

src/
├── app/                    # Routes, layout, API
│   ├── api/metrics/        # GET / POST / DELETE metrics, names, reset-sample
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── dashboard/          # Re-exports Dashboard, MetricSelector, TimeRangeSelector, MetricsChart
│   ├── ui/                 # Card, Skeleton, ErrorBanner, StatCard, Modal
│   ├── Dashboard.tsx       # Main page container
│   ├── MetricSelector.tsx
│   ├── TimeRangeSelector.tsx
│   ├── MetricsChart.tsx
│   └── MetricForm.tsx
├── services/
│   └── metricsService.ts
├── hooks/
│   ├── useMetrics.ts
│   ├── useMetricNames.ts
│   └── useDashboardFilters.ts
├── lib/
│   ├── api.ts
│   ├── chartData.ts
│   ├── constants.ts
│   ├── date.ts
│   ├── format.ts
│   ├── sampleMetrics.ts
│   ├── prisma.ts
│   └── db/metrics.ts
└── types/
    └── metric.ts
```

## Code organization

- **Services** – All metric API calls go through `services/metricsService`; components and hooks use it instead of `lib/api` directly.
- **Filter state** – `useDashboardFilters` holds time-range preset, date range, and selected metric names; it derives `currentParams` for the metrics API. Single source of truth for filters.
- **Dashboard** – **MetricSelector** (multi-select, same-unit rule), **TimeRangeSelector** (7d / 30d / 90d), **MetricsChart** (line chart with legend toggle). Export via `components/dashboard`.

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.
2. Run `npm install` (runs `prisma generate` via postinstall).
3. Run `npx prisma migrate dev` to create the database and tables.
4. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Deployment

1. Use a hosted PostgreSQL database (e.g. Vercel Postgres, Neon, Supabase) and set `DATABASE_URL` in the production environment.
2. Run `npx prisma migrate deploy` once after provisioning the database (or add it to your host’s build/release step).
3. Optionally set `RESET_SAMPLE_SECRET` if you need “Load sample dataset” in production; when set, requests to reset-sample must include the `x-internal-key` header. Leave unset to disable that route (the UI shows a friendly message).

**If you see database-related errors after deploy,** confirm `DATABASE_URL` is set and that `npx prisma migrate deploy` has been run against the production database.

- **Live demo:** `https://your-app.vercel.app` _(replace with your URL after deploy)_

## API

- **GET /api/metrics** – Query params: `name` (multiple allowed), `startDate`, `endDate` (ISO). Returns up to 5000 metrics, sorted by timestamp ascending.
- **POST /api/metrics** – Body: `{ name, value, timestamp; optional: unit, variant, country, device, segment }`. Creates one metric.
- **DELETE /api/metrics** – Query param: `name`. Deletes all data points for that metric name. **Unauthenticated by design** for this demo; suitable for single-tenant or internal use only.
- **GET /api/metrics/names** – Returns distinct metric names with units (for the selector and Add metric form).
- **POST /api/metrics/reset-sample** – Body: `{ startDate, endDate }`. Clears sample-named metrics in that range (used by “Load sample dataset”). In production, disabled unless `RESET_SAMPLE_SECRET` is set; when set, requires `x-internal-key` header.

## Features

- **Single-page dashboard** – Header (title + Load Sample Dataset, Download Report, Add metric), filter bar (metric selector + time range), and line chart.
- **Metric selector** – Multi-select from existing metric names; only metrics with the same unit can be combined. Remove (trash) deletes a metric’s data from the backend.
- **Time range** – Presets: Last 7 days, 30 days, 90 days.
- **Line chart** – Metrics over time with tooltips, unit-aware axes, and legend (click to show/hide series). Full-screen option. Empty states when no metrics selected or no data.
- **Add metric** – Modal with Name (dropdown + free text), Value, Date (no future), Unit (chips; locked when name matches an existing metric). Submit creates one data point and revalidates the chart.
- **Load sample dataset** – Clears unwanted/sample metrics then inserts **90 days** of demo data (multiple metrics, correct units) so the chart and time-range filters have data. Protected in production by `RESET_SAMPLE_SECRET`.
- **Download report** – Exports the chart area as PDF with metadata.
- **Defensive UI** – Validation (name length, value range, no future dates), skeleton loading, error banners with retry where applicable. Responsive layout; chart supports horizontal scroll and optional Y-axis hiding on narrow screens.
