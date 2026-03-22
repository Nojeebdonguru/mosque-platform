-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Enums
CREATE TYPE denomination AS ENUM ('sunni','shia','sufi','ahmadiyya','ibadi','other');
CREATE TYPE mosque_status AS ENUM ('active','under_review','closed','pending');
CREATE TYPE data_source AS ENUM ('scraped','user_submitted','official');
CREATE TYPE user_role AS ENUM ('viewer','contributor','moderator','admin');
CREATE TYPE user_status AS ENUM ('active','suspended','pending_verification');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  status user_status NOT NULL DEFAULT 'pending_verification',
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  preferences JSONB NOT NULL DEFAULT '{}',
  contribution_count INT NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mosques
CREATE TABLE mosques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_primary TEXT NOT NULL,
  name_arabic TEXT,
  address_street TEXT,
  address_city TEXT NOT NULL,
  address_country TEXT NOT NULL,
  address_country_code CHAR(2) NOT NULL,
  address_formatted TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  denomination denomination NOT NULL DEFAULT 'sunni',
  status mosque_status NOT NULL DEFAULT 'pending',
  capacity INT,
  facilities TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  phone TEXT,
  email TEXT,
  website TEXT,
  data_source data_source NOT NULL DEFAULT 'scraped',
  confidence NUMERIC(4,3),
  source_url TEXT,
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mosques_location ON mosques USING GIST (location);
CREATE INDEX idx_mosques_country ON mosques (address_country_code);
CREATE INDEX idx_mosques_status ON mosques (status);

-- Prayer times
CREATE TABLE prayer_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mosque_id UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  timezone TEXT NOT NULL,
  fajr TIME NOT NULL,
  sunrise TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  jumuah_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mosque_id, date)
);

-- Scraper jobs
CREATE TABLE scraper_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  country CHAR(2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority SMALLINT NOT NULL DEFAULT 5,
  retry_count SMALLINT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed admin user
INSERT INTO users (email, username, display_name, role, status)
VALUES ('admin@mosque-platform.com', 'admin', 'Platform Admin', 'admin', 'active')
ON CONFLICT DO NOTHING;
