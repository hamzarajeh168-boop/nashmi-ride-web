-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'ai',
    "encryptedApiKey" TEXT,
    "updatedAt" DATETIME NOT NULL
);
