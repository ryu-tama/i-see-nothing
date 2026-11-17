# BurnNote

**Zero-Knowledge, End-to-End Encrypted, Burn-After-Reading Secret Sharing Application.**

BurnNote memungkinkan pengguna membagikan informasi sensitif (password, API key, token kredensial, atau catatan rahasia) melalui tautan sekali pakai. Seluruh proses enkripsi dan dekripsi terjadi sepenuhnya di sisi klien (*browser*), sementara server hanya menyimpan *ciphertext* sementara yang langsung dimusnahkan begitu dibaca satu kali atau melewati batas waktu kedaluwarsa (TTL).

---

## Arsitektur Keamanan (Zero-Knowledge Design)

BurnNote dirancang dengan prinsip bahwa **server tidak boleh pernah mengetahui isi pesan maupun kunci dekripsinya**:

1. **Client-Side Encryption (Web Crypto API):**
   - Pesan dienkripsi langsung di browser pengirim menggunakan algoritma **AES-GCM 256-bit** dengan *Initialization Vector* (IV) acak 96-bit yang unik untuk setiap pesan.
2. **URL Fragment Key Storage (`#key`):**
   - Kunci dekripsi disisipkan ke dalam bagian *URL fragment* (`https://domain.com/secret/[id]#[key]`).
   - Berdasarkan spesifikasi HTTP, bagian setelah tanda `#` tidak pernah dikirimkan oleh browser ke server dalam *HTTP Request*, sehingga administrator server maupun log jaringan tidak dapat mendekripsi data yang tersimpan.
3. **Burn-After-Reading & TTL Enforcement:**
   - Endpoint pembacaan (`/api/secrets/[id]`) menggunakan metode `POST` (bukan `GET`) dan memerlukan konfirmasi eksplisit pengguna untuk mencegah *link preview bot* (seperti WhatsApp, Telegram, atau Slack) menghanguskan pesan secara tidak sengaja.
   - Begitu *ciphertext* diambil, data langsung dihapus permanen dari penyimpanan server.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Cryptography:** Native Browser Web Crypto API (`SubtleCrypto` — AES-GCM 256-bit)
- **Deployment:** Vercel

---

## Struktur Proyek

```text
burn-note/
├── app/
│   ├── api/
│   │   └── secrets/
│   │       ├── route.ts          # Endpoint POST untuk menyimpan ciphertext & TTL
│   │       └── [id]/
│   │           └── route.ts      # Endpoint POST untuk mengambil & menghapus pesan (one-time read)
│   ├── secret/
│   │   └── [id]/
│   │       └── page.tsx          # Halaman penerima & dekripsi sisi klien
│   ├── layout.tsx
│   └── page.tsx                  # Halaman utama pembuatan pesan rahasia
├── lib/
│   ├── crypto.ts                 # Modul enkripsi/dekripsi AES-GCM (Web Crypto API)
│   └── store.ts                  # Penyimpanan sementara in-memory & pembersihan TTL
└── README.md
```

---

## Menjalankan Secara Lokal

1. **Clone repositori:**
   ```bash
   git clone [https://github.com/ryu-tama/burn-note.git](https://github.com/ryu-tama/burn-note.git)
   cd burn-note
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan:**
   ```bash
   npm run dev
   ```

4. Buka `http://localhost:3000` di browser.

---

## Batasan Saat Ini & Roadmap Pengembangan (AppSec Hardening)

Versi ini merupakan *Minimum Viable Product* (MVP) yang menggunakan penyimpanan *in-memory* (`Map`). Rencana peningkatan keamanan dan skalabilitas berikutnya meliputi:

- [ ] **Persistent Serverless Storage:** Migrasi dari penyimpanan memori lokal ke **Upstash Redis** untuk mendukung *atomic one-time read* (`GETDEL`) di lingkungan *serverless* multi-instance.
- [ ] **Rate Limiting:** Pembatasan frekuensi *request* pada endpoint `/api/secrets` untuk mencegah serangan *Denial of Service* (DoS) / kehabisan memori.
- [ ] **Content Security Policy (CSP):** Penambahan *HTTP Security Headers* yang ketat untuk memitigasi risiko *Cross-Site Scripting* (XSS) yang berpotensi mencuri *URL fragment*.
- [ ] **Optional Passphrase Layer:** Penambahan kata sandi kedua (*PBKDF2 key derivation*) di atas kunci URL untuk perlindungan ekstra.
