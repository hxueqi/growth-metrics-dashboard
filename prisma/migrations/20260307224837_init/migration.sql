-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variant" TEXT,
    "country" TEXT,
    "device" TEXT,
    "segment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Metric_timestamp_idx" ON "Metric"("timestamp");

-- CreateIndex
CREATE INDEX "Metric_name_idx" ON "Metric"("name");

-- CreateIndex
CREATE INDEX "Metric_variant_idx" ON "Metric"("variant");

-- CreateIndex
CREATE INDEX "Metric_country_idx" ON "Metric"("country");

-- CreateIndex
CREATE INDEX "Metric_device_idx" ON "Metric"("device");

-- CreateIndex
CREATE INDEX "Metric_segment_idx" ON "Metric"("segment");

-- CreateIndex
CREATE INDEX "Metric_createdAt_idx" ON "Metric"("createdAt");
