-- D1データベース初期化スクリプト
-- 実行コマンド: wrangler d1 execute ai-tool-site-db --file=./schema.sql

-- OpenRouter APIレスポンスのキャッシュ
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  result TEXT NOT NULL,
  expires_at INTEGER NOT NULL -- unix timestamp
);

-- IPベースのレート制限
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,       -- "ratelimit:{ip}:{tool}"
  count INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL   -- unix timestamp（リセット時刻）
);

-- アクセスログ（任意：PV計測用）
CREATE TABLE IF NOT EXISTS access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_slug TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ratelimit_reset ON rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_log_tool ON access_log(tool_slug, created_at);
