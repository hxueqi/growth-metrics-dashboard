-- CreateTable
CREATE TABLE "DerivedMetric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numeratorMetric" TEXT NOT NULL,
    "denominatorMetric" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DerivedMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DerivedMetric_name_key" ON "DerivedMetric"("name");

-- CreateIndex
CREATE INDEX "DerivedMetric_name_idx" ON "DerivedMetric"("name");
