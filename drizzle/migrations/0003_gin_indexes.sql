-- GIN indexes for array columns used in search filters.
-- arrayContains() on categories/languages does a full table scan without these.
-- CONCURRENTLY: creates the index without locking the table for reads/writes.
-- Safe to run on a live production database.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "host_profiles_categories_gin_idx"
  ON "host_profiles" USING GIN ("categories");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "host_profiles_languages_gin_idx"
  ON "host_profiles" USING GIN ("languages");

-- Prefix-match index for city name typeahead (Phase A city autocomplete).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "cities_name_prefix_idx"
  ON "cities" ("name" text_pattern_ops);
