-- CreateTable
CREATE TABLE "injections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_name" TEXT NOT NULL,
    "injection_time" DATETIME NOT NULL,
    "injection_type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "injections_user_name_idx" ON "injections"("user_name");

-- CreateIndex
CREATE INDEX "injections_injection_time_idx" ON "injections"("injection_time");

-- CreateIndex
CREATE INDEX "injections_injection_type_idx" ON "injections"("injection_type");
