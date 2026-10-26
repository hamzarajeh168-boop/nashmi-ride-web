-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "cities" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "durationNights" INTEGER NOT NULL,
    "hotelClass" TEXT NOT NULL DEFAULT '4 star',
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "gallery" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "itinerary" JSONB NOT NULL,
    "singleSupplement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "seasonalNote" TEXT NOT NULL DEFAULT '',
    "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
    "included" JSONB NOT NULL,
    "excluded" JSONB NOT NULL,
    "startPoint" TEXT NOT NULL DEFAULT '',
    "endPoint" TEXT NOT NULL DEFAULT '',
    "availableDates" TEXT NOT NULL DEFAULT 'Daily',
    "minGroupSize" INTEGER NOT NULL DEFAULT 1,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 20,
    "difficulty" TEXT NOT NULL DEFAULT 'Easy',
    "whatToBring" TEXT NOT NULL DEFAULT '',
    "practicalNotes" TEXT NOT NULL DEFAULT '',
    "agentNotes" TEXT NOT NULL DEFAULT '',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPrice" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "groupSize" TEXT NOT NULL,
    "adult" DOUBLE PRECISION NOT NULL,
    "child" DOUBLE PRECISION NOT NULL,
    "infant" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TourPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInfo" (
    "id" TEXT NOT NULL DEFAULT 'company',
    "name" TEXT NOT NULL DEFAULT 'Jordan Inspiration Tours',
    "about" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "officeHours" TEXT NOT NULL DEFAULT '',
    "bookingSteps" TEXT NOT NULL DEFAULT '',
    "cancellationPolicy" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSettings" (
    "id" TEXT NOT NULL DEFAULT 'agent',
    "name" TEXT NOT NULL DEFAULT 'Jordan Inspiration Tours',
    "greeting" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "replyLength" TEXT NOT NULL DEFAULT 'short',
    "handoverMessage" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "collectLeadDetails" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'ai',
    "encryptedApiKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeItem" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT '',
    "firstMessage" TEXT NOT NULL DEFAULT '',
    "messages" JSONB NOT NULL,
    "lead" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TourPrice_tourId_groupSize_key" ON "TourPrice"("tourId", "groupSize");

-- AddForeignKey
ALTER TABLE "TourPrice" ADD CONSTRAINT "TourPrice_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
