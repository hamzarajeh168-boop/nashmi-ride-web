UPDATE "AgentSettings"
SET "name" = 'Jordan Inspiration Tours',
    "greeting" = replace("greeting", 'Nashmi', 'Jordan Inspiration Tours')
WHERE "id" = 'agent'
  AND "name" = 'Nashmi';
