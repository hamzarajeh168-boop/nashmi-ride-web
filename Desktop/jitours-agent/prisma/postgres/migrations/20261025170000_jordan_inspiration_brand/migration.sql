ALTER TABLE "AgentSettings"
ALTER COLUMN "name"
SET DEFAULT 'Jordan Inspiration Tours';

UPDATE "AgentSettings"
SET "name" = 'Jordan Inspiration Tours',
    "greeting" = replace("greeting", 'Nashmi', 'Jordan Inspiration Tours')
WHERE "id" = 'agent'
  AND "name" = 'Nashmi';
