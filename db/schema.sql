-- Blobbed durable metadata (Neon / Postgres)
-- Blob ciphertext stays on Shelby; this DB is index + keys for the owner library.
-- Note: encrypted_key at rest is MVP risk — later wrap with wallet-derived key.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY,
  owner_address VARCHAR(66) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY,
  owner_address VARCHAR(66) NOT NULL,
  storage_account VARCHAR(66) NOT NULL DEFAULT '',
  blob_name VARCHAR(500) NOT NULL,
  shelby_hash VARCHAR(500),
  original_name VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(128) DEFAULT 'application/octet-stream',
  encrypted_key TEXT NOT NULL DEFAULT '',
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (owner_address, blob_name)
);

-- Legacy shares table (optional short links later)
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  share_token VARCHAR(64) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  download_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders (owner_address);
CREATE INDEX IF NOT EXISTS idx_files_owner ON files (owner_address);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files (folder_id);
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares (share_token);

-- Migrate older files table (no folders / storage_account) if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'files'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'files' AND column_name = 'storage_account'
    ) THEN
      ALTER TABLE files ADD COLUMN storage_account VARCHAR(66) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'files' AND column_name = 'folder_id'
    ) THEN
      ALTER TABLE files ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'files' AND column_name = 'shelby_hash'
    ) THEN
      ALTER TABLE files ADD COLUMN shelby_hash VARCHAR(500);
    END IF;
  END IF;
END $$;
