/*
  Warnings:

  - You are about to drop the `SettingChange` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `dailyTarget` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `missedDayPenalty` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `monthGoal` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `Group` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SettingChange";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "GroupSettingChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupSettingChange_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Group" ("createdAt", "id", "title", "updatedAt") SELECT "createdAt", "id", "title", "updatedAt" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
