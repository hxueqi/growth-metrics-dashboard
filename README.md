# Growth Metrics Dashboard

Production-quality full-stack dashboard to post and visualize growth metrics.

## Overview

This dashboard is built to support **decision-making** for Growth teams: it surfaces current values, averages, and **vs. previous period** trends so you can spot changes quickly. The UI is **defensive by design**—date and value validation, clear error states, skeleton loading, and friendly fallbacks when data or sample loading isn’t available—so it stays usable under bad data or network. **Performance** is considered through SWR caching and deduping, on-demand revalidation (no background polling), and API limits (e.g. 5000 rows) to keep responses fast and predictable.

## Visuals

_Add screenshots here to showcase the dashboard across viewports._

| Mobile (229px) | Desktop dashboard | Date picker (Add metric) |
|----------------|-------------------|---------------------------|
| _Screenshot_   | _Screenshot_      | _Screenshot_              |

## Tech stack

- **Next.js** (App Router), **TypeScript**
- **Prisma** + **PostgreSQL**
- **Recharts** for line chart
- **TailwindCSS** for styling
- **SWR** for data fetching

## Project structure

```
prisma/
└── schema.prisma           # Database schema and migrations

src/
├── app/                    # Routes, layout, API
│   ├── api/metrics/        # GET/POST metrics, reset-sample
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── dashboard/
│   │   └── index.ts        # Re-exports Dashboard, MetricSelector, TimeRangeSelector, MetricsChart, MetricsSummary
│   ├── ui/                 # Card, Skeleton, ErrorBanner, StatCard, Modal
│   ├── Dashboard.tsx       # Main page container
│   ├── MetricSelector.tsx
│   ├── TimeRangeSelector.tsx
│   ├── MetricsChart.tsx
│   ├── MetricSummary.tsx
│   └── MetricForm.tsx
├── services/
│   ├── metricsService.ts
│   └── index.ts
├── hooks/
│   ├── useMetrics.ts
│   └── useDashboardFilters.ts
├── lib/
│   ├── api.ts
│   ├── chartData.ts
│   ├── constants.ts
│   ├── date.ts
│   ├── format.ts
│   ├── metrics.ts
│   ├── breakdown.ts
│   ├── sampleMetrics.ts
│   ├── utils.ts
│   ├── prisma.ts
│   └── db/metrics.ts
└── types/
    ├── metric.ts
    └── index.ts
```

## Code organization

- **Services** – All metric API calls go through `services/metricsService`. Components and hooks use `metricsService.fetchMetrics`, `metricsService.createMetric`, `metricsService.createSampleMetrics` instead of `lib/api` directly.
- **Filter state** – `hooks/useDashboardFilters` holds preset, dateRange, and metricSelection, and derives `currentParams` and `previousParams` for API calls. Single source of truth for filters. (Breakdown is supported in the data layer but not exposed in the current UI.)
- **Dashboard components** – Clear boundaries: **MetricSelector**, **TimeRangeSelector**, **MetricsChart**, **MetricsSummary**. Export via `components/dashboard` for a single import path.
- **Chart reuse** – `lib/chartData.ts` exposes `buildSeriesFromMetrics(metrics, options)` and `filterMetricsForChart`. **MetricsChart** accepts either `(metrics, selectedName?, selectedVariant?, breakdownBy?)` or pre-built `(series, seriesNames)` for use outside the dashboard.
- **Types** – `types/metric.ts` includes `MetricSelection`; use `@/types` or `@/types/metric`.
- **UI primitives** – `components/ui/` for Card, Skeleton, ErrorBanner, StatCard, Modal.

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.
2. Run `npm install` (runs `prisma generate` via postinstall).
3. Run `npx prisma migrate dev` to create the database and tables.
4. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy the app to a hosting service (e.g. Vercel, Heroku) so reviewers can use it without running the code locally.

1. Use a hosted PostgreSQL database (e.g. Vercel Postgres, Neon, Supabase) and set `DATABASE_URL` in the production environment.
2. Apply the database schema: run `npx prisma migrate deploy` once after provisioning the database (or add it to your host’s build/release step).
3. Optionally set `RESET_SAMPLE_SECRET` in production if you need to call the reset-sample endpoint server-side; leave it unset to disable “Load sample dataset” for that environment (the UI will show a friendly message).
4. Add your live URL below once deployed.

**If the app shows database-related errors after deploy,** confirm that `DATABASE_URL` is set correctly in your host environment and that you have run `npx prisma migrate deploy` against the production database.

- **Live demo:** `https://your-app.vercel.app` _(replace with your URL after deploy)_

## API

- **GET /api/metrics** – Query params: `name`, `startDate`, `endDate` (ISO dates). Returns up to 5000 metrics, sorted by timestamp ascending.
- **POST /api/metrics** – Body: `{ name, value, timestamp; optional: variant, country, device, segment }`.
- **POST /api/metrics/reset-sample** – Body: `{ startDate, endDate }`. Clears sample-named metrics in range (used when upgrading sample data). In production, the route is disabled unless `RESET_SAMPLE_SECRET` is set; when set, requests must include `x-internal-key` with that value.

## Features

- **Metric selector** – All metrics or a single metric; chart and summary update accordingly.
- **Time range** – Last 7 days, 30 days, or 90 days (presets).
- **Line chart** (Recharts) – Metrics over time with tooltips and legend.
- **Summary** – For a single metric: current value, average, and **Vs previous period** (% change). For **All metrics**: total events, global % change, and top performing metric.
- **Add metric** – Modal with metric, value, and timestamp; new points appear after submit with immediate revalidation.
- **Load sample dataset** – Inserts 60 days of funnel-style demo data (current + previous 30-day windows) so "Vs previous period" works for 7d and 30d; avoids duplicates and can replace older 7-day sample.
- **Real-time data** – SWR for fetching and caching; revalidation on demand (e.g. after adding a metric or loading sample). Skeleton loading and error states with retry.
- **Responsive design** – Layout adapts from narrow (e.g. 229px) to ultra-wide; summary cards switch to a list-style layout on very small screens; chart supports horizontal scroll and optional Y-axis hiding when space is tight.
- **Defensive UI** – Date/time validation (no future timestamps), value range checks, required metric selection, and clear error messages.
