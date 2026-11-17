export interface SecretRecord {
  ciphertext: string;
  iv: string;
  expiresAt: number;
}

// Menggunakan globalThis agar data tidak hilang saat Next.js melakukan hot-reload di mode dev
const globalForSecrets = globalThis as unknown as {
  secretStore?: Map<string, SecretRecord>;
};

export const secretStore =
  globalForSecrets.secretStore ?? new Map<string, SecretRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForSecrets.secretStore = secretStore;
}

// Membersihkan pesan yang sudah kedaluwarsa secara otomatis
export function cleanupExpiredSecrets() {
  const now = Date.now();
  for (const [id, record] of secretStore.entries()) {
    if (record.expiresAt <= now) {
      secretStore.delete(id);
    }
  }
}
