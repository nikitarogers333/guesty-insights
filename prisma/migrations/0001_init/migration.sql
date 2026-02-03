CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guesty_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  property_type VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guesty_id VARCHAR(50) UNIQUE NOT NULL,
  email_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guesty_id VARCHAR(50) UNIQUE NOT NULL,
  listing_id UUID REFERENCES listings(id),
  guest_id UUID REFERENCES guests(id),
  source VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP NOT NULL,
  booked_at TIMESTAMP NOT NULL,
  total_price BIGINT DEFAULT 0,
  nights INTEGER DEFAULT 0,
  lead_time_days INTEGER DEFAULT 0,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guesty_id VARCHAR(50) UNIQUE NOT NULL,
  listing_id UUID REFERENCES listings(id),
  guest_id UUID REFERENCES guests(id),
  reservation_id UUID REFERENCES reservations(id),
  source VARCHAR(50) NOT NULL,
  converted_to_booking BOOLEAN DEFAULT FALSE,
  first_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  records_synced INTEGER DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'running',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_source ON reservations(source);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_booked_at ON reservations(booked_at);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_source_status ON reservations(source, status);

CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source);
CREATE INDEX IF NOT EXISTS idx_conversations_converted ON conversations(converted_to_booking);
