# Growth Metrics Dashboard

A full-stack dashboard to record and visualize growth metrics over time. Post data points (name, value, timestamp, unit), store them in PostgreSQL, and view trends in a line chart with filters and export.

## Overview

The app helps teams **track metrics** (e.g. signups, activation, revenue) by **posting** observations via a simple form and **viewing** them in a time-series chart. Data is persisted in PostgreSQL and fetched with SWR. The UI enforces validation, shows clear loading and error states, and supports PDF export. Built for internal or single-tenant use.

## Features

- **Duplicate timestamps** – For the same metric and timestamp, the chart uses the **last-created** record (by `createdAt`). Earlier duplicates are ignored so the series stays consistent.
- **Single-point metrics as lines** – Metrics with only one data point are expanded over the selected date range (missing times filled with 0) so a line is drawn instead of a single dot.
- **Single Y-axis** – Only the left Y-axis is shown for a cleaner chart.
- **Metric selector by unit** – The metric dropdown is ordered by unit type (Count, Percentage, Currency, Seconds, Custom) so related metrics are grouped.
- **Delete confirmation** – Removing a metric opens a confirmation modal; the metric is only deleted after the user confirms.
- **Sample dataset in development only** – The “Load Sample Dataset” button and related messages appear only when `NODE_ENV === "development"`. In production the button is hidden.
- **PDF export** – Export the current chart and metadata to a PDF report.

Additional behavior: multi-select metrics (same unit only), time-range presets (7d / 30d / 90d), unit-aware axes and tooltips, legend click-to-toggle, full-screen chart, skeleton loading, and defensive validation (value range, no future dates, name length).

## Tech stack

- **Next.js** (App Router), **TypeScript**
- **Prisma** + **PostgreSQL**
- **Recharts** for the line chart
- **TailwindCSS** for styling
- **SWR** for data fetching

## Setup

1. **Clone** the repository and install dependencies:

   ```bash
   npm install
   ```

   `prisma generate` runs automatically via `postinstall`.

2. **Configure environment** – Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/growth_metrics?schema=public`)

   Optional for production:

   - `RESET_SAMPLE_SECRET` – Set to any non-empty string to enable the server-only “Load sample dataset” flow; leave unset to keep the feature disabled.

3. **Database** – Create the schema and run migrations:

   ```bash
   npx prisma migrate dev
   ```

4. **Run the dev server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. **Build and run** – Vercel uses the default scripts:
   - Build: `npm run build` (runs `next build`)
   - Start: `npm run start` (runs `next start`)

2. **Environment variables** – In the Vercel project settings, set:
   - `DATABASE_URL` – Your production PostgreSQL connection string.
   - `RESET_SAMPLE_SECRET` (optional) – Set to a non-empty value if you want “Load sample dataset” available in production. The UI does not show the button in production unless you enable it via this variable; the server-only `POST /api/load-sample` checks it.

3. **Migrations** – After the first deploy (or when the DB is ready), run migrations against the production database:

   ```bash
   npx prisma migrate deploy
   ```

   Use the same `DATABASE_URL` as in Vercel (e.g. from a local `.env` or CI).

If you see database-related errors after deploy, confirm `DATABASE_URL` is set correctly and that `npx prisma migrate deploy` has been run against the production database.

**Live demo:** `https://your-app.vercel.app` _(replace with your deployed URL)_

## API summary

- **GET /api/metrics** – Query params: `name` (multiple allowed), `startDate`, `endDate` (ISO). Returns up to 5000 metrics, sorted by timestamp ascending. Duplicate (name, timestamp) rows are resolved by the chart logic using the last-created record (`createdAt`).
- **POST /api/metrics** – Body: `{ name, value, timestamp; optional: unit, variant, country, device, segment }`. Creates one metric. `createdAt` is set by the database.
- **DELETE /api/metrics** – Query param: `name`. Deletes all data points for that metric. Unauthenticated in this demo; suitable for internal/single-tenant use only.
- **GET /api/metrics/names** – Returns distinct metric names with units for the selector and Add metric form.
- **POST /api/load-sample** – No body. Server-only: clears sample data and inserts 90 days of demo metrics. Used by “Load sample dataset.” In production, allowed only when `RESET_SAMPLE_SECRET` is set; no client secret is sent.
- **POST /api/metrics/reset-sample** – Body: `{ startDate, endDate }`. Low-level clear of sample-named metrics in the given range. The UI uses `POST /api/load-sample` instead.

## Project structure

```
prisma/
└── schema.prisma

src/
├── app/
│   ├── api/           # metrics, load-sample, reset-sample
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── dashboard/     # ChartCard, etc.
│   ├── ui/            # Card, Skeleton, ErrorBanner, Modal
│   ├── Dashboard.tsx
│   ├── MetricSelector.tsx
│   ├── TimeRangeSelector.tsx
│   ├── MetricsChart.tsx
│   └── MetricForm.tsx
├── services/
│   └── metricsService.ts
├── hooks/
├── lib/
└── types/
```

## Screenshots

**Dashboard** – Header, filters, and line chart with legend.

![Dashboard](docs/dashboard.png)

**Metric selector** – Multi-select dropdown with units; same-unit rule and delete (trash) per metric.

![Metric selector](docs/metric-selector.png)

**Add metric** – Modal with Name, Value, Date, and Unit (locked for existing metrics).

![Add metric modal](docs/add-metric-modal.png)

**Delete confirmation** – Confirm before removing a metric and all its data.

![Delete metric confirmation](docs/delete-confirmation.png)
