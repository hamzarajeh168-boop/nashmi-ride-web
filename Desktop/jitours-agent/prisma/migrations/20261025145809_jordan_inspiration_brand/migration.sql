-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'agent',
    "name" TEXT NOT NULL DEFAULT 'Jordan Inspiration Tours',
    "greeting" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "replyLength" TEXT NOT NULL DEFAULT 'short',
    "handoverMessage" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "collectLeadDetails" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AgentSettings" ("collectLeadDetails", "greeting", "handoverMessage", "id", "name", "replyLength", "tone", "updatedAt", "whatsapp") SELECT "collectLeadDetails", "greeting", "handoverMessage", "id", "name", "replyLength", "tone", "updatedAt", "whatsapp" FROM "AgentSettings";
DROP TABLE "AgentSettings";
ALTER TABLE "new_AgentSettings" RENAME TO "AgentSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
