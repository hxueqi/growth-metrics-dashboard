/**
 * Prisma seed: insert 90 days of sample metrics for demo.
 * Run with: npx prisma db seed
 *
 * Clears existing sample-named metrics in the DB, then inserts new data.
 * Does not touch user-created metrics with other names.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SAMPLE_DAYS = 90;
const SAMPLE_NAMES = [
  "Website Visits",
  "Signups",
  "Activated Users",
  "Revenue",
  "Ad Spend",
  "Conversion Rate",
  "Churn Rate",
  "Page Load Time",
];
const UNIT = {
  "Website Visits": "Count",
  "Signups": "Count",
  "Activated Users": "Count",
  "Revenue": "Currency",
  "Ad Spend": "Currency",
  "Conversion Rate": "Percentage",
  "Churn Rate": "Percentage",
  "Page Load Time": "Seconds",
};

function valueForDay(baseMin, baseMax, dayIndex) {
  const trend = 1 + (dayIndex / SAMPLE_DAYS) * 0.5;
  const base = baseMin + Math.random() * (baseMax - baseMin);
  return Math.round(base * trend * 100) / 100;
}

function buildPoint(name, value, daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return {
    name,
    value,
    timestamp: date,
    unit: UNIT[name] || "Count",
  };
}

async function main() {
  const deleted = await prisma.metric.deleteMany({
    where: { name: { in: SAMPLE_NAMES } },
  });
  console.log(`Seed: deleted ${deleted.count} existing sample metrics.`);

  const data = [];
  for (let dayIndex = 0; dayIndex < SAMPLE_DAYS; dayIndex++) {
    const daysAgo = SAMPLE_DAYS - 1 - dayIndex;
    data.push(buildPoint("Website Visits", valueForDay(800, 1600, dayIndex), daysAgo));
    data.push(buildPoint("Signups", valueForDay(38, 72, dayIndex), daysAgo));
    data.push(buildPoint("Activated Users", valueForDay(38, 72, dayIndex), daysAgo));
    data.push(buildPoint("Revenue", valueForDay(4200, 9800, dayIndex), daysAgo));
    data.push(buildPoint("Ad Spend", valueForDay(800, 2200, dayIndex), daysAgo));
    data.push(
      buildPoint(
        "Conversion Rate",
        Math.min(100, Math.max(0, valueForDay(3.2, 6.8, dayIndex))),
        daysAgo
      )
    );
    data.push(
      buildPoint(
        "Churn Rate",
        Math.min(100, Math.max(0, valueForDay(1.2, 3.5, dayIndex))),
        daysAgo
      )
    );
    data.push(buildPoint("Page Load Time", valueForDay(1.2, 3.8, dayIndex), daysAgo));
  }

  const { count } = await prisma.metric.createMany({ data });
  console.log(`Seed: created ${count} sample metrics (${SAMPLE_DAYS} days × ${SAMPLE_NAMES.length} metrics).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
