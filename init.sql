-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- Trigram search for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS unaccent;   -- Accent-insensitive search

-- ── Enums ────────────────────────────────────────────────────
CREATE TYPE denomination AS ENUM (
  'sunni', 'shia', 'sufi', 'ahmadiyya', 'ibadi', 'other'
);
CREATE TYPE mosque_status AS ENUM (
  'active', 'under_review', 'closed', 'pending'
);
CREATE TYPE data_source AS ENUM (
  'scraped', 'user_submitted', 'official'
);
CREATE TYPE user_role AS ENUM (
  'viewer', 'contributor', 'moderator', 'admin'
);
CREATE TYPE user_status AS ENUM (
  'active', 'suspended', 'pending_verification'
);
CREATE TYPE review_decision AS ENUM (
  'approved', 'rejected', 'needs_edit'
);

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT,
  role            user_role NOT NULL DEFAULT 'viewer',
  status          user_status NOT NULL DEFAULT 'pending_verification',
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  bio             TEXT,
  location        TEXT,
  preferences     JSONB NOT NULL DEFAULT '{}',
  contribution_count INT NOT NULL DEFAULT 0,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email   ON users (email);
CREATE INDEX idx_users_role    ON users (role);
CREATE INDEX idx_users_status  ON users (status);

-- ── Mosques ──────────────────────────────────────────────────
CREATE TABLE mosques (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Names
  name_primary        TEXT NOT NULL,
  name_arabic         TEXT,
  name_transliteration TEXT,
  name_local          TEXT,

  -- Address
  address_street      TEXT,
  address_city        TEXT NOT NULL,
  address_state       TEXT,
  address_country     TEXT NOT NULL,
  address_country_code CHAR(2) NOT NULL,
  address_postal_code TEXT,
  address_formatted   TEXT,

  -- Geography (PostGIS)
  location            GEOGRAPHY(POINT, 4326) NOT NULL,

  -- Details
  denomination        denomination NOT NULL DEFAULT 'sunni',
  status              mosque_status NOT NULL DEFAULT 'pending',
  capacity            INT,
  facilities          TEXT[] NOT NULL DEFAULT '{}',
  languages           TEXT[] NOT NULL DEFAULT '{}',
  description         TEXT,
  founded_year        SMALLINT,
  image_urls          TEXT[] NOT NULL DEFAULT '{}',

  -- Contact
  phone               TEXT,
  email               TEXT,
  website             TEXT,
  social_media        JSONB NOT NULL DEFAULT '{}',

  -- Data provenance
  data_source         data_source NOT NULL DEFAULT 'scraped',
  confidence          NUMERIC(4,3),
  source_url          TEXT,
  verified_at         TIMESTAMPTZ,
  submitted_by        UUID REFERENCES users(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geospatial index (critical for nearby queries)
CREATE INDEX idx_mosques_location   ON mosques USING GIST (location);
-- Full-text search indexes
CREATE INDEX idx_mosques_name_trgm  ON mosques USING GIN (name_primary gin_trgm_ops);
CREATE INDEX idx_mosques_country    ON mosques (address_country_code);
CREATE INDEX idx_mosques_city       ON mosques (address_city);
CREATE INDEX idx_mosques_status     ON mosques (status);
CREATE INDEX idx_mosques_denomination ON mosques (denomination);

-- ── Prayer times ─────────────────────────────────────────────
CREATE TABLE prayer_times (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mosque_id       UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  timezone        TEXT NOT NULL,
  fajr            TIME NOT NULL,
  sunrise         TIME NOT NULL,
  dhuhr           TIME NOT NULL,
  asr             TIME NOT NULL,
  maghrib         TIME NOT NULL,
  isha            TIME NOT NULL,
  midnight        TIME NOT NULL,
  jumuah_time     TIME,
  is_ramadan      BOOLEAN NOT NULL DEFAULT FALSE,
  iftar_time      TIME,
  suhoor_time     TIME,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mosque_id, date)
);

CREATE INDEX idx_prayer_mosque_date ON prayer_times (mosque_id, date);

-- ── Prayer time overrides ────────────────────────────────────
CREATE TABLE prayer_time_overrides (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mosque_id       UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  prayer          TEXT NOT NULL,
  offset_minutes  SMALLINT NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mosque_id, prayer)
);

-- ── Scraper jobs ─────────────────────────────────────────────
CREATE TABLE scraper_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url             TEXT NOT NULL,
  source          TEXT NOT NULL,
  country         CHAR(2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  priority        SMALLINT NOT NULL DEFAULT 5,
  retry_count     SMALLINT NOT NULL DEFAULT 0,
  max_retries     SMALLINT NOT NULL DEFAULT 3,
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scraper_jobs_status   ON scraper_jobs (status, priority DESC, scheduled_at);
CREATE UNIQUE INDEX idx_scraper_jobs_url ON scraper_jobs (url);

-- ── Review queue ─────────────────────────────────────────────
CREATE TABLE review_queue (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID REFERENCES scraper_jobs(id),
  extracted_data      JSONB NOT NULL,
  existing_mosque_id  UUID REFERENCES mosques(id),
  review_type         TEXT NOT NULL DEFAULT 'new',
  assigned_to         UUID REFERENCES users(id),
  review_decision     review_decision,
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_decision ON review_queue (review_decision, created_at);
CREATE INDEX idx_review_queue_assigned ON review_queue (assigned_to);

-- ── Auto-update updated_at trigger ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mosques_updated_at
  BEFORE UPDATE ON mosques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed: admin user ─────────────────────────────────────────
INSERT INTO users (email, username, display_name, role, status)
VALUES ('admin@mosque-platform.com', 'admin', 'Platform Admin', 'admin', 'active')
ON CONFLICT DO NOTHING;
