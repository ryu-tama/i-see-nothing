# BurnNote 🔥

Aplikasi berbagi pesan teks dan file rahasia berbasis **Zero-Knowledge**, **End-to-End Encryption (E2EE)**, dan **Burn-After-Reading**. Seluruh proses enkripsi maupun dekripsi dilakukan sepenuhnya di sisi browser pengguna menggunakan Web Crypto API sehingga server tidak pernah mengetahui isi pesan, nama file asli, maupun kunci dekripsinya.

## ✨ Fitur Utama

- **Zero-Knowledge & End-to-End Encrypted (AES-GCM 256-bit):** Enkripsi dilakukan di browser pengirim dengan kunci acak 256-bit dan IV 96-bit. Kunci dekripsi disematkan pada URL fragment (`#key`) yang tidak pernah dikirimkan ke server HTTP.
- **Berbagi Pesan Teks & File (Maks. 50 MB):** Mendukung pengiriman teks sensitif maupun dokumen/file biner hingga 50 MB. Nama file asli dan MIME type ikut dienkripsi ke dalam *binary payload* sebelum diunggah.
- **Direct Presigned Upload:** File terenkripsi diunggah langsung dari browser ke **Supabase Storage** menggunakan *Signed Upload URL* untuk melewati batas *serverless payload* dan menjaga kecepatan unggah.
- **Burn-After-Reading (Atomik):** Tautan rahasia hanya dapat dibuka satu kali. Begitu diakses penerima, data di database maupun objek file di *storage* langsung dihapus secara permanen.
- **Auto-Expiration (TTL):** Mendukung masa kedaluwarsa otomatis (5 menit, 1 jam, 24 jam, atau 7 hari) apabila tautan tidak kunjung dibuka.
- **Perlindungan Terhadap Bot Preview:** Membutuhkan konfirmasi eksplisit di sisi klien sebelum mengeksekusi permintaan baca agar *link preview crawler* (WhatsApp, Telegram, Discord) tidak membakar pesan secara tidak sengaja.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router) & TypeScript
- **Styling & Tipografi:** Tailwind CSS v4, Montserrat & JetBrains Mono
- **Animasi UI:** Anime.js v4
- **Kriptografi:** Native Web Crypto API (`SubtleCrypto` AES-GCM 256-bit)
- **Database & Object Storage:** Supabase (PostgreSQL & Private Storage Bucket)

## 🚀 Cara Menjalankan di Lokal

### 1. Clone Repositori & Instal Dependensi
```bash
git clone [https://github.com/ryu-tama/burn-note.git](https://github.com/ryu-tama/burn-note.git)
cd burn-note
npm install
```

### 2. Konfigurasi Supabase
1. Buat proyek baru di [Supabase](https://supabase.com).
2. Buka **SQL Editor** dan jalankan skema tabel berikut:
   ```sql
   CREATE TABLE secrets (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     type TEXT NOT NULL CHECK (type IN ('text', 'file')),
     ciphertext TEXT,
     file_path TEXT,
     iv TEXT NOT NULL,
     expires_at TIMESTAMPTZ NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
   ```
3. Buka menu **Storage**, buat bucket baru bernama **`encrypted-files`** dengan status **Private (Public OFF)** dan batas ukuran file **50 MB**.

### 3. Atur Environment Variables
Buat file `.env.local` di direktori root proyek, lalu isi dengan kredensial proyek Supabase-mu:

```env
NEXT_PUBLIC_SUPABASE_CONFIG=https://[project-ref-kamu].supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_[kunci-secret-kamu]
```

### 4. Jalankan Server Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser.

## ☁️ Deployment ke Vercel

1. Push repositori ini ke GitHub.
2. Impor proyek ke dashboard **Vercel**.
3. Tambahkan variabel lingkungan (`NEXT_PUBLIC_SUPABASE_CONFIG` dan `SUPABASE_SERVICE_ROLE_KEY`) pada menu **Settings → Environment Variables**.
4. Klik **Deploy**.

## 🔒 Arsitektur Keamanan

1. **Pengirim** membuat teks atau memilih file di browser → browser menghasilkan kunci acak `AES-GCM 256-bit` dan `IV` 12-byte.
2. Untuk file, browser menggabungkan `[4-byte panjang metadata][JSON { name, type }][Isi File Biner]` dan mengenkripsinya menjadi satu *blob* biner acak.
3. Server hanya menerima *ciphertext* (atau mengeluarkan *Signed Upload URL* untuk *blob* terenkripsi) beserta `IV` dan waktu kedaluwarsa. Kunci enkripsi ditempel pada `#fragment` tautan (`https://domain.com/secret/<id>#<key>`).
4. **Penerima** membuka tautan dan menekan tombol konfirmasi → server mengambil data sekaligus menghapusnya secara atomik dari PostgreSQL dan Supabase Storage → browser penerima mendekripsi konten secara lokal menggunakan kunci pada `#fragment`.
