/**
 * Durable metadata store — Neon Postgres when DATABASE_URL is set.
 * Falls back to in-memory so local/dev still works without Neon.
 *
 * Prefer @neondatabase/serverless on Vercel (HTTP, no sticky TCP).
 */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export type FolderMetadata = {
  id: string;
  ownerAddress: string;
  name: string;
  createdAt: string;
};

export type FileMetadata = {
  id: string;
  ownerAddress: string;
  storageAccount: string;
  blobName: string;
  shelbyHash: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  encryptedKey: string;
  createdAt: string;
  folderId?: string | null;
  expiresAt?: string;
};

export type LibrarySnapshot = {
  version: 1;
  folders: FolderMetadata[];
  files: FileMetadata[];
};

type Sql = NeonQueryFunction<false, false>;

let _sql: Sql | null = null;
let _schemaReady: Promise<void> | null = null;

/** In-memory fallback (cold-start volatile) */
const mem = {
  folders: [] as FolderMetadata[],
  files: [] as FileMetadata[],
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getSql(): Sql {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL not set');
  if (!_sql) _sql = neon(url);
  return _sql;
}

export async function ensureSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (_schemaReady) return _schemaReady;

  _schemaReady = (async () => {
    const sql = getSql();
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await sql`
      CREATE TABLE IF NOT EXISTS folders (
        id UUID PRIMARY KEY,
        owner_address VARCHAR(66) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
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
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID REFERENCES files(id) ON DELETE CASCADE,
        share_token VARCHAR(64) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        download_count INT DEFAULT 0
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders (owner_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_files_owner ON files (owner_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_files_folder ON files (folder_id)`;
    await sql`
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
            ALTER TABLE files ADD COLUMN folder_id UUID;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'files' AND column_name = 'shelby_hash'
          ) THEN
            ALTER TABLE files ADD COLUMN shelby_hash VARCHAR(500);
          END IF;
        END IF;
      END $$
    `;
  })().catch((err) => {
    _schemaReady = null;
    throw err;
  });

  return _schemaReady;
}

function normOwner(a: string): string {
  return a.trim().toLowerCase();
}

function rowToFolder(r: Record<string, unknown>): FolderMetadata {
  return {
    id: String(r.id),
    ownerAddress: String(r.owner_address),
    name: String(r.name),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at || new Date().toISOString()),
  };
}

function rowToFile(r: Record<string, unknown>): FileMetadata {
  const blobName = String(r.blob_name || r.shelby_hash || '');
  const folderId = r.folder_id == null || r.folder_id === '' ? null : String(r.folder_id);
  return {
    id: String(r.id),
    ownerAddress: String(r.owner_address),
    storageAccount: String(r.storage_account || r.owner_address || ''),
    blobName,
    shelbyHash: String(r.shelby_hash || blobName),
    originalName: String(r.original_name),
    sizeBytes: Number(r.size_bytes || 0),
    mimeType: String(r.mime_type || 'application/octet-stream'),
    encryptedKey: String(r.encrypted_key || ''),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at || new Date().toISOString()),
    folderId,
    expiresAt: r.expires_at
      ? r.expires_at instanceof Date
        ? r.expires_at.toISOString()
        : String(r.expires_at)
      : undefined,
  };
}

// ─── Library ───────────────────────────────────────────────────────────────

export async function getLibrary(ownerAddress: string): Promise<LibrarySnapshot> {
  const owner = normOwner(ownerAddress);
  if (!isDatabaseConfigured()) {
    return {
      version: 1,
      folders: mem.folders.filter((f) => normOwner(f.ownerAddress) === owner),
      files: mem.files.filter((f) => normOwner(f.ownerAddress) === owner),
    };
  }
  await ensureSchema();
  const sql = getSql();
  const folders = await sql`
    SELECT * FROM folders WHERE lower(owner_address) = ${owner}
    ORDER BY created_at DESC
  `;
  const files = await sql`
    SELECT * FROM files WHERE lower(owner_address) = ${owner}
    ORDER BY created_at DESC
  `;
  return {
    version: 1,
    folders: (folders as Record<string, unknown>[]).map(rowToFolder),
    files: (files as Record<string, unknown>[]).map(rowToFile),
  };
}

/** Upsert full library snapshot (used for localStorage → DB migrate). */
export async function putLibrary(
  ownerAddress: string,
  snapshot: { folders: FolderMetadata[]; files: FileMetadata[] }
): Promise<LibrarySnapshot> {
  const owner = normOwner(ownerAddress);
  const folders = snapshot.folders || [];
  const files = snapshot.files || [];

  if (!isDatabaseConfigured()) {
    mem.folders = [
      ...mem.folders.filter((f) => normOwner(f.ownerAddress) !== owner),
      ...folders.map((f) => ({ ...f, ownerAddress })),
    ];
    mem.files = [
      ...mem.files.filter((f) => normOwner(f.ownerAddress) !== owner),
      ...files.map((f) => ({ ...f, ownerAddress })),
    ];
    return getLibrary(ownerAddress);
  }

  await ensureSchema();
  const sql = getSql();

  await sql`DELETE FROM files WHERE lower(owner_address) = ${owner}`;
  await sql`DELETE FROM folders WHERE lower(owner_address) = ${owner}`;

  for (const f of folders) {
    await sql`
      INSERT INTO folders (id, owner_address, name, created_at)
      VALUES (
        ${f.id}::uuid,
        ${ownerAddress},
        ${f.name || 'Untitled'},
        ${f.createdAt || new Date().toISOString()}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;
  }

  for (const file of files) {
    const blobName = file.blobName || file.shelbyHash;
    await sql`
      INSERT INTO files (
        id, owner_address, storage_account, blob_name, shelby_hash,
        original_name, size_bytes, mime_type, encrypted_key, folder_id, created_at, expires_at
      ) VALUES (
        ${file.id}::uuid,
        ${ownerAddress},
        ${file.storageAccount || ownerAddress},
        ${blobName},
        ${file.shelbyHash || blobName},
        ${file.originalName},
        ${file.sizeBytes || 0},
        ${file.mimeType || 'application/octet-stream'},
        ${file.encryptedKey || ''},
        ${file.folderId || null}::uuid,
        ${file.createdAt || new Date().toISOString()}::timestamptz,
        ${file.expiresAt || null}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        original_name = EXCLUDED.original_name,
        folder_id = EXCLUDED.folder_id,
        encrypted_key = EXCLUDED.encrypted_key,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes
    `;
  }

  return getLibrary(ownerAddress);
}

// ─── Folders ───────────────────────────────────────────────────────────────

export async function createFolder(
  ownerAddress: string,
  name: string,
  id?: string
): Promise<FolderMetadata> {
  const folder: FolderMetadata = {
    id: id || crypto.randomUUID(),
    ownerAddress,
    name: (name || 'Untitled folder').trim() || 'Untitled folder',
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    mem.folders.unshift(folder);
    return folder;
  }

  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO folders (id, owner_address, name, created_at)
    VALUES (
      ${folder.id}::uuid,
      ${folder.ownerAddress},
      ${folder.name},
      ${folder.createdAt}::timestamptz
    )
  `;
  return folder;
}

export async function renameFolder(
  ownerAddress: string,
  folderId: string,
  name: string
): Promise<boolean> {
  const owner = normOwner(ownerAddress);
  const next = name.trim();
  if (!next) return false;

  if (!isDatabaseConfigured()) {
    const f = mem.folders.find(
      (x) => x.id === folderId && normOwner(x.ownerAddress) === owner
    );
    if (!f) return false;
    f.name = next;
    return true;
  }

  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE folders SET name = ${next}
    WHERE id = ${folderId}::uuid AND lower(owner_address) = ${owner}
    RETURNING id
  `;
  return (rows as unknown[]).length > 0;
}

export async function deleteFolder(ownerAddress: string, folderId: string): Promise<boolean> {
  const owner = normOwner(ownerAddress);

  if (!isDatabaseConfigured()) {
    const before = mem.folders.length;
    mem.folders = mem.folders.filter(
      (f) => !(f.id === folderId && normOwner(f.ownerAddress) === owner)
    );
    for (const file of mem.files) {
      if (file.folderId === folderId && normOwner(file.ownerAddress) === owner) {
        file.folderId = null;
      }
    }
    return mem.folders.length < before;
  }

  await ensureSchema();
  const sql = getSql();
  await sql`
    UPDATE files SET folder_id = NULL
    WHERE folder_id = ${folderId}::uuid AND lower(owner_address) = ${owner}
  `;
  const rows = await sql`
    DELETE FROM folders
    WHERE id = ${folderId}::uuid AND lower(owner_address) = ${owner}
    RETURNING id
  `;
  return (rows as unknown[]).length > 0;
}

// ─── Files ─────────────────────────────────────────────────────────────────

export async function insertFile(file: FileMetadata): Promise<FileMetadata> {
  const row: FileMetadata = {
    ...file,
    id: file.id || crypto.randomUUID(),
    shelbyHash: file.shelbyHash || file.blobName,
    folderId: file.folderId ?? null,
    createdAt: file.createdAt || new Date().toISOString(),
    mimeType: file.mimeType || 'application/octet-stream',
    sizeBytes: file.sizeBytes ?? 0,
    encryptedKey: file.encryptedKey || '',
    storageAccount: file.storageAccount || file.ownerAddress,
  };

  if (!isDatabaseConfigured()) {
    mem.files.unshift(row);
    return row;
  }

  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO files (
      id, owner_address, storage_account, blob_name, shelby_hash,
      original_name, size_bytes, mime_type, encrypted_key, folder_id, created_at, expires_at
    ) VALUES (
      ${row.id}::uuid,
      ${row.ownerAddress},
      ${row.storageAccount},
      ${row.blobName},
      ${row.shelbyHash},
      ${row.originalName},
      ${row.sizeBytes},
      ${row.mimeType},
      ${row.encryptedKey},
      ${row.folderId || null}::uuid,
      ${row.createdAt}::timestamptz,
      ${row.expiresAt || null}::timestamptz
    )
    ON CONFLICT (owner_address, blob_name) DO UPDATE SET
      original_name = EXCLUDED.original_name,
      size_bytes = EXCLUDED.size_bytes,
      mime_type = EXCLUDED.mime_type,
      encrypted_key = EXCLUDED.encrypted_key,
      folder_id = EXCLUDED.folder_id,
      storage_account = EXCLUDED.storage_account,
      shelby_hash = EXCLUDED.shelby_hash
  `;
  return row;
}

export async function listFilesDb(
  ownerAddress: string,
  folderId?: string | null
): Promise<FileMetadata[]> {
  const lib = await getLibrary(ownerAddress);
  if (folderId === undefined) return lib.files;
  if (folderId === null || folderId === '' || folderId === 'root') {
    return lib.files.filter((f) => !f.folderId);
  }
  return lib.files.filter((f) => f.folderId === folderId);
}

export async function deleteFile(ownerAddress: string, fileId: string): Promise<boolean> {
  const owner = normOwner(ownerAddress);

  if (!isDatabaseConfigured()) {
    const before = mem.files.length;
    mem.files = mem.files.filter(
      (f) => !(f.id === fileId && normOwner(f.ownerAddress) === owner)
    );
    return mem.files.length < before;
  }

  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    DELETE FROM files
    WHERE id = ${fileId}::uuid AND lower(owner_address) = ${owner}
    RETURNING id
  `;
  return (rows as unknown[]).length > 0;
}

export function dbStatus(): { configured: boolean; backend: 'neon' | 'memory' } {
  return {
    configured: isDatabaseConfigured(),
    backend: isDatabaseConfigured() ? 'neon' : 'memory',
  };
}
