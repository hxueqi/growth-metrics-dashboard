# Growth Metrics Dashboard

## Live Demo

https://growth-metrics-dashboard-sooty.vercel.app/

## Quick Start

```bash
git clone https://github.com/hxueqi/growth-metrics-dashboard.git
cd growth-metrics-dashboard
npm install
npx prisma migrate dev
npm run dev
```

Then open: http://localhost:3000

## Overview

A full-stack analytics dashboard for recording and visualizing growth metrics over time.  
Teams can post metric data points (name, value, timestamp, unit) and analyze trends through an interactive time-series chart.

## Features

- **Duplicate timestamps** – If multiple records exist for the same metric and timestamp, the chart uses the most recently created record (`createdAt`). Earlier duplicates are ignored so the series remains deterministic.
- **Single-point metrics as lines** – Metrics with only one data point are expanded over the selected date range (missing times filled with 0) so a line is drawn instead of a single dot.
- **Single Y-axis** – Only the left Y-axis is shown for a cleaner chart.
- **Metric selector by unit** – The metric dropdown is ordered by unit type (Count, Percentage, Currency, Seconds, Custom) so related metrics are grouped.
- **Delete confirmation** – Removing a metric opens a confirmation modal; the metric is only deleted after the user confirms.
- **Sample data via seed** – To get demo data after clone, run `npx prisma db seed` once (see Setup).
- **PDF export** – Export the current chart and metadata to a PDF report.

Additional behavior:

- Multi-select metrics (same unit only)
- Time-range presets (7d / 30d / 90d)
- Unit-aware axes and tooltips
- Legend click-to-toggle
- Full-screen chart
- Skeleton loading
- Defensive validation (value range, no future dates, name length)

## Tech stack

- **Next.js** (App Router), **TypeScript**
- **Prisma** + **PostgreSQL**
- **Recharts** for the line chart
- **TailwindCSS** for styling
- **SWR** for data fetching

## Architecture

The application follows a simple full-stack architecture with a Next.js frontend, API routes for backend logic, and PostgreSQL for persistence.

**Frontend**

- Next.js (App Router)
- SWR for client-side data fetching
- Recharts for visualization
- TailwindCSS for UI styling

**Backend**

- Next.js API routes
- Prisma ORM
- PostgreSQL database

**Data flow**

1. User submits a metric via the form
2. The API validates the request and stores the record in PostgreSQL
3. SWR revalidates the data
4. The dashboard updates and Recharts renders the updated time-series chart

## Setup

1. **Clone** the repository and install dependencies:

   ```bash
   npm install
   ```

   `prisma generate` runs automatically via `postinstall`.

2. **Configure environment** – Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/growth_metrics?schema=public`)

3. **Database** – Create the schema and run migrations:

   ```bash
   npx prisma migrate dev
   ```

4. **Seed sample data (optional)** – To populate 90 days of demo metrics (Website Visits, Signups, Revenue, etc.):

   ```bash
   npx prisma db seed
   ```

5. **Run the dev server**:

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

3. **Migrations** – After the first deploy (or when the DB is ready), run migrations against the production database:

   ```bash
   npx prisma migrate deploy
   ```

   Use the same `DATABASE_URL` as in Vercel (e.g. from a local `.env` or CI).

If database-related errors appear after deployment, confirm that:

- `DATABASE_URL` is correctly configured in Vercel
- `npx prisma migrate deploy` has been executed against the production database

## API summary

- **GET /api/metrics** – Query params: `name` (multiple allowed), `startDate`, `endDate` (ISO). Returns up to 5000 metrics, sorted by timestamp ascending. Duplicate (name, timestamp) rows are resolved by the chart logic using the last-created record (`createdAt`).
- **POST /api/metrics** – Body: `{ name, value, timestamp; optional: unit }`. Creates one metric. `createdAt` is set by the database. Response and GET responses include only `id`, `name`, `value`, `unit`, `timestamp`, `createdAt`.
- **`DELETE /api/metrics?name=<metric>`** – Deletes all data points for the specified metric. Intended for internal/demo use (no authentication).
- **GET /api/metrics/names** – Returns distinct metric names with units for the selector and Add metric form.

Sample data is not loaded via API. After cloning, run `npx prisma db seed` to insert 90 days of demo metrics.

## Future Improvements

Potential extensions for this project:

- Authentication and multi-tenant support
- Editing existing metrics instead of only append/delete
- Pagination or streaming for very large datasets
- Server-side aggregation for large metric volumes
- Alerts or threshold notifications

## Project structure

```
prisma/
└── schema.prisma

src/
├── app/
│   ├── api/           # metrics, metrics/names, metrics/batch
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
