-- =========================================================
-- Schema لنظام التذاكر — يعكس بيانات السلسلة + ملفات المستخدمين
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(150),
  role VARCHAR(20) DEFAULT 'user', -- 'user' أو 'organizer' (آخر دور اختاره بالواجهة)
  created_at TIMESTAMP DEFAULT NOW()
);

-- eventId هنا = نفس المعرّف الصادر من عقد EventRegistry (نفس الرقم بالضبط)
CREATE TABLE IF NOT EXISTS events (
  event_id INTEGER PRIMARY KEY,
  organizer_address VARCHAR(42) NOT NULL,
  name VARCHAR(200) NOT NULL,
  price_units NUMERIC NOT NULL,     -- بوحدات mUSDC الصغرى (6 decimals) كما بالعقد
  max_tickets INTEGER NOT NULL,
  tickets_sold INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- tokenId هنا = نفس المعرّف الصادر من عقد TicketNFT
CREATE TABLE IF NOT EXISTS tickets (
  token_id INTEGER PRIMARY KEY,
  event_id INTEGER REFERENCES events(event_id),
  owner_address VARCHAR(42) NOT NULL,
  checked_in BOOLEAN DEFAULT FALSE,
  purchase_price_units NUMERIC,
  tx_hash VARCHAR(66),
  purchased_at TIMESTAMP DEFAULT NOW(),
  checked_in_at TIMESTAMP
);

-- يخزّن آخر بلوك تمت معالجته لكل عقد، حتى ما نعيد قراءة كل السلسلة من الصفر بكل تشغيل
CREATE TABLE IF NOT EXISTS indexer_state (
  contract_name VARCHAR(50) PRIMARY KEY,
  last_processed_block BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner_address);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_address);
