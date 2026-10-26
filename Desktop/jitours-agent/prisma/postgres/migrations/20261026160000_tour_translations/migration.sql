-- Per-language translations of tour content, keyed by language code.
ALTER TABLE "Tour" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
