-- PostgreSQL DDL for Natural Flow
-- This schema matches the OptionFlow JPA entity

CREATE TABLE IF NOT EXISTS option_flow (
    id BIGSERIAL PRIMARY KEY,
    ts_utc TIMESTAMP NOT NULL,
    underlying VARCHAR(20) NOT NULL,
    option_symbol VARCHAR(50),
    side VARCHAR(10),
    action VARCHAR(10),
    strike NUMERIC(15, 2),
    expiry DATE,
    premium NUMERIC(18, 2),
    size INTEGER,
    raw_json TEXT NOT NULL,
    src VARCHAR(50) DEFAULT 'polygon'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_underlying ON option_flow(underlying);
CREATE INDEX IF NOT EXISTS idx_ts_utc ON option_flow(ts_utc);
CREATE INDEX IF NOT EXISTS idx_premium ON option_flow(premium);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_underlying_ts ON option_flow(underlying, ts_utc DESC);
CREATE INDEX IF NOT EXISTS idx_underlying_premium_ts ON option_flow(underlying, premium, ts_utc);

-- Comments for documentation
COMMENT ON TABLE option_flow IS 'Stores all options flow events from Polygon or other providers';
COMMENT ON COLUMN option_flow.ts_utc IS 'Timestamp of the flow event in UTC';
COMMENT ON COLUMN option_flow.underlying IS 'Ticker symbol (e.g., SPY, QQQ)';
COMMENT ON COLUMN option_flow.option_symbol IS 'Full option symbol (OCC format or provider format)';
COMMENT ON COLUMN option_flow.side IS 'CALL or PUT';
COMMENT ON COLUMN option_flow.action IS 'BUY, SELL, HIT, or LIFT';
COMMENT ON COLUMN option_flow.strike IS 'Strike price of the option';
COMMENT ON COLUMN option_flow.expiry IS 'Expiration date of the option';
COMMENT ON COLUMN option_flow.premium IS 'Total premium in dollars';
COMMENT ON COLUMN option_flow.size IS 'Number of contracts';
COMMENT ON COLUMN option_flow.raw_json IS 'Full JSON payload from provider - never throw data away';
COMMENT ON COLUMN option_flow.src IS 'Source of the data (default: polygon)';
