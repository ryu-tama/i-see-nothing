"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { decryptSecret } from "@/src/lib/crypto";

export default function SecretReader() {
  const params = useParams<{ id: string }>();
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyError, setCopyError] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  async function handleRevealSecret() {
    if (loading) return;

    setLoading(true);
    setError("");
    setCopyError("");

    try {
      const keyString = window.location.hash.replace(/^#/, "");
      if (!keyString) {
        throw new Error(
          "Kunci dekripsi tidak ditemukan di URL. Pastikan tautan disalin secara utuh."
        );
      }

      const res = await fetch(`/api/secrets/${params.id}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Pesan tidak ditemukan atau sudah pernah dibuka."
        );
      }

      const plainText = await decryptSecret(data.ciphertext, data.iv, keyString);
      setDecryptedMessage(plainText);

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
    setCopyError("");

    try {
      await navigator.clipboard.writeText(decryptedMessage);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("Teks belum tersalin. Pilih dan salin pesan secara manual.");
    }
  }

  const buttonClassName =
    "inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#252420] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#403e38] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a4492c] disabled:cursor-not-allowed disabled:bg-[#e5e3dc] disabled:text-[#88857b] motion-reduce:transition-none cursor-pointer";

  return (
    <div className="w-full max-w-lg [color-scheme:light]">
      <header className="mb-12 flex items-center gap-2.5 sm:mb-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a4492c]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="size-6 text-[#a4492c]"
          >
            <path
              d="M13 3c1 5-4 6-4 10a3 3 0 0 0 6 0c0-1-.3-2-1-3 3 2 5 5 4 8a6.5 6.5 0 0 1-12-1C4 11 10 9 13 3Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg font-semibold tracking-[-0.04em]">BurnNote</span>
        </Link>
      </header>

      <section aria-labelledby="reader-heading">
        <div className="mb-8">
          <p className="mb-3 text-xs font-medium tracking-[0.12em] text-[#a4492c] uppercase">
            {decryptedMessage
              ? "Pesan terbuka • Data di server telah dihapus"
              : error
                ? "Tidak dapat dibuka"
                : "Pesan rahasia. Sekali baca."}
          </p>
          <h1
            id="reader-heading"
            className="text-4xl leading-[1.15] font-medium tracking-[-0.045em] sm:text-5xl"
          >
            {decryptedMessage
              ? "Isi pesan rahasia."
              : error
                ? "Pesan sudah tidak tersedia."
                : "Ada pesan untukmu."}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#6f6b62]">
            {decryptedMessage
              ? "Simpan isi pesan bila perlu. Setelah halaman ini ditutup atau dimuat ulang, pesan tidak dapat diakses lagi."
              : error
                ? "Tautan ini mungkin sudah pernah dibuka, kedaluwarsa, atau tidak lengkap."
                : "Pesan ini dilindungi enkripsi end-to-end dan hanya dapat dilihat satu kali."}
          </p>
        </div>

        {!decryptedMessage && !error && (
          <div>
            <div className="rounded-xl border border-[#d9d6cd] bg-[#fffefa] p-5">
              <p className="text-xs font-medium text-[#6f6b62]">Sebelum membuka</p>
              <p className="mt-2 text-sm leading-6 text-[#454239]">
                Begitu kamu menekan tombol di bawah, pesan akan langsung didekripsi di
                perangkatmu dan dihapus permanen dari server.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRevealSecret}
              disabled={loading}
              className={`${buttonClassName} mt-5 w-full`}
            >
              {loading ? "Mendekripsi pesan…" : "Buka & hancurkan pesan"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </div>
        )}

        {error && (
          <div>
            <div
              role="alert"
              className="rounded-xl border border-[#e8c9bd] bg-[#fbefea] px-5 py-4 text-sm leading-6 text-[#963d27]"
            >
              {error}
            </div>
            <Link href="/" className={`${buttonClassName} mt-5 w-full`}>
              Kembali ke beranda
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {decryptedMessage && (
          <div>
            <div className="overflow-hidden rounded-xl border border-[#d9d6cd] bg-[#fffefa]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eae7df] px-5 py-3">
                <span className="text-xs font-medium text-[#6f6b62]">
                  Pesan berhasil didekripsi
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[#d9d6cd] bg-[#f8f7f2] px-2.5 py-1 text-xs font-medium text-[#252420] transition-colors hover:bg-[#efede6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a4492c] cursor-pointer"
                >
                  <span role="status" aria-live="polite">
                    {copied ? "Tersalin" : "Salin teks"}
                  </span>
                  <span aria-hidden="true">{copied ? "✓" : "↗"}</span>
                </button>
              </div>
              <pre className="max-h-96 w-full max-w-full overflow-x-hidden overflow-y-auto px-5 py-4 font-mono text-sm leading-6 whitespace-pre-wrap break-all text-[#252420] select-all">
                {decryptedMessage}
              </pre>
            </div>

            {copyError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-[#e8c9bd] bg-[#fbefea] px-4 py-3 text-sm leading-6 text-[#963d27]"
              >
                {copyError}
              </p>
            )}

            <Link
              href="/"
              className="mt-6 inline-block rounded py-1 text-sm font-medium text-[#454239] underline decoration-[#c9c4b7] underline-offset-4 transition-colors hover:text-[#a4492c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a4492c] motion-reduce:transition-none"
            >
              Buat pesan rahasia baru
            </Link>
          </div>
        )}
      </section>

      <footer className="mt-10 flex items-start gap-2 border-t border-[#dfdcd3] pt-5 text-xs leading-5 text-[#817c70] sm:mt-12">
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="mt-0.5 size-4 shrink-0"
        >
          <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
          <path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" />
        </svg>
        <p>Enkripsi end-to-end. Kami tidak bisa membaca isi pesanmu.</p>
      </footer>
    </div>
  );
}
