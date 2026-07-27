-- CardFolio schema (PostgreSQL / Neon)
-- Safe to re-run: every object is created only if absent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text        NOT NULL,
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Emails are compared case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  username   text        NOT NULL,
  full_name  text        NOT NULL DEFAULT '',
  title      text        NOT NULL DEFAULT '',
  bio        text        NOT NULL DEFAULT '',
  photo      text,
  logo       text,
  cover      text,
  company    text,
  phone      text,
  email      text,
  whatsapp   text,
  location   text,
  website    text,
  template   text        NOT NULL DEFAULT 'minimal',
  accent     text        NOT NULL DEFAULT '#2E6BE6',
  published  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One card per user for now; usernames are the public handle, case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS cards_user_id_key  ON cards (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS cards_username_key ON cards (lower(username));

CREATE TABLE IF NOT EXISTS card_links (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id  uuid    NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  platform text    NOT NULL,
  url      text    NOT NULL,
  label    text,
  position integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS card_links_card_id_idx ON card_links (card_id, position);

-- Append-only event log; the dashboard aggregates from it.
CREATE TABLE IF NOT EXISTS card_events (
  id         bigserial PRIMARY KEY,
  card_id    uuid        NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('view', 'click', 'scan')),
  link_id    uuid        REFERENCES card_links (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_events_card_id_idx ON card_events (card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_events_type_idx    ON card_events (card_id, type);

-- ---------------------------------------------------------------- Google SSO
-- Added after launch, so these are ALTERs rather than part of the CREATE above.
-- `google_sub` is Google's stable subject id; email can change, sub cannot.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Google accounts have no password, so the column can no longer be NOT NULL.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub) WHERE google_sub IS NOT NULL;

-- ------------------------------------------------------------------- Plans
-- Everyone starts on free; upgrading is a deliberate write to this column.
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- ADD CONSTRAINT has no IF NOT EXISTS, and this file has to stay re-runnable.
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'pro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------- card preferences
-- All three are Pro settings; the defaults are what a free card gets and are
-- also the safe fallback for rows written before this migration.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS hide_branding boolean NOT NULL DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS indexable     boolean NOT NULL DEFAULT true;

-- Account-level, not card-level: it is the person who gets the email.
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_email boolean NOT NULL DEFAULT true;

-- The plate drawn behind an uploaded logo on the templates that place it over
-- a photo. On by default: most logo artwork is dark and needs it to stay
-- legible, but a logo made for dark surfaces looks better without.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS logo_plate boolean NOT NULL DEFAULT true;
