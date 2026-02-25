-- CreateTable
CREATE TABLE "HealthLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "morningDone" TEXT NOT NULL DEFAULT '[]',
    "eveningDone" TEXT NOT NULL DEFAULT '[]',
    "waterGlasses" INTEGER,
    "sleepH" REAL,
    "sleepQuality" INTEGER,
    "energyLevel" INTEGER,
    "moodLevel" INTEGER,
    "pointsDiet" INTEGER,
    "pointsSupp" INTEGER,
    "pointsTrain" INTEGER,
    "pointsRoutine" INTEGER,
    "pointsRelax" INTEGER,
    "pointsMindset" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthLog_date_key" ON "HealthLog"("date");
