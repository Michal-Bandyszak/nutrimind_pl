-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "personAName" TEXT NOT NULL DEFAULT 'Michał',
    "personAKcal" INTEGER NOT NULL DEFAULT 2500,
    "personBName" TEXT NOT NULL DEFAULT 'Osoba B',
    "personBKcal" INTEGER NOT NULL DEFAULT 1800,
    "defaultBatchConfig" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
