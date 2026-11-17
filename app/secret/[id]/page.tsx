"use client";

import { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { decryptSecret } from "@/src/lib/crypto";

function SecretReaderContent() {
  const params = useParams<{ id: string }>();
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleRevealSecret() {
    setLoading(true);
    setError("");

    try {
      // 1. Ambil kunci dekripsi dari URL fragment (#...) di browser
      const keyString = window.location.hash.replace(/^#/, "");
      if (!keyString) {
        throw new Error(
          "Kunci dekripsi tidak ditemukan di URL. Pastikan tautan disalin secara utuh."
        );
      }

      // 2. Minta ciphertext dari server (Server akan langsung menghapusnya setelah request ini!)
      const res = await fetch(`/api/secrets/${params.id}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Pesan tidak ditemukan atau sudah pernah dibuka."
        );
      }

      // 3. Dekripsi pesan di browser penerima menggunakan kunci dari URL
      const plainText = await decryptSecret(data.ciphertext, data.iv, keyString);
      setDecryptedMessage(plainText);

      // Hapus hash kunci dari address bar browser agar tidak tertinggal di history
      window.history.replaceState(null, "", window.location.pathname);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuka pesan. Kunci salah atau data telah rusak."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(decryptedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pesan Rahasia</h1>
        <p className="text-slate-400 text-sm mt-1">
          Pesan ini dilindungi enkripsi ujung-ke-ujung dan hanya dapat dilihat
          satu kali.
        </p>
      </div>

      {!decryptedMessage && !error && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 text-sm">
            <strong>Peringatan:</strong> Begitu kamu menekan tombol di bawah,
            pesan akan langsung dihapus permanen dari server dan tidak bisa
            dimuat ulang.
          </div>

          <button
            onClick={handleRevealSecret}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 font-semibold text-white transition cursor-pointer"
          >
            {loading ? "Mendekripsi Pesan..." : "Buka & Hancurkan Pesan"}
          </button>
        </div>
      )}

      {error && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
          <Link
            href="/"
            className="block text-center w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition"
          >
            Kembali ke Beranda
          </Link>
        </div>
      )}

      {decryptedMessage && (
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-emerald-400">
                Pesan berhasil didekripsi (Data di server sudah musnah)
              </span>
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 transition cursor-pointer"
              >
                {copied ? "Tersalin!" : "Salin Teks"}
              </button>
            </div>
            <pre className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 whitespace-pre-wrap wrap-break-words font-mono">
              {decryptedMessage}
            </pre>
          </div>

          <Link
            href="/"
            className="block text-center w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition"
          >
            Buat Pesan Rahasia Baru
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ReadSecretPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-slate-400 text-sm">Memuat halaman rahasia...</div>
        }
      >
        <SecretReaderContent />
      </Suspense>
    </main>
  );
}
