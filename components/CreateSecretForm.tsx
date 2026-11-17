"use client";

import { useState, useEffect, useRef } from "react";
import { encryptSecret } from "@/src/lib/crypto";

export default function CreateSecretForm() {
  const [secretText, setSecretText] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(3600);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  async function handleCreateSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!secretText.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const { ciphertext, iv, keyString } = await encryptSecret(secretText);

      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext, iv, ttlSeconds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat tautan rahasia.");

      const fullUrl = `${window.location.origin}/secret/${data.id}#${keyString}`;
      setGeneratedLink(fullUrl);
      setSecretText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    setError("");

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Tautan belum tersalin. Pilih dan salin tautan secara manual.");
    }
  }

  function handleReset() {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setGeneratedLink("");
    setCopied(false);
    setError("");
  }

  const buttonClassName =
    "inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#252420] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#403e38] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a4492c] disabled:cursor-not-allowed disabled:bg-[#e5e3dc] disabled:text-[#88857b] motion-reduce:transition-none";

  return (
    <div className="w-full max-w-lg [color-scheme:light]">
      <header className="mb-12 flex items-center gap-2.5 sm:mb-16">
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
      </header>

      <section aria-labelledby="form-heading">
        <div className="mb-8">
          <p className="mb-3 text-xs font-medium tracking-[0.12em] text-[#a4492c] uppercase">
            {generatedLink ? "Siap dibagikan" : "Pesan pribadi. Sekali baca."}
          </p>
          <h1
            id="form-heading"
            className="text-4xl leading-[1.15] font-medium tracking-[-0.045em] sm:text-5xl"
          >
            {generatedLink ? "Rahasiamu siap dikirim." : "Kirim sekali. Lalu hilang."}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#6f6b62]">
            {generatedLink
              ? "Bagikan tautan ini ke penerima. Pesan akan dihapus setelah dibaca satu kali."
              : "Untuk password, API key, atau hal yang cukup diketahui berdua. Dienkripsi di browser, dihapus setelah dibaca."}
          </p>
        </div>

        {!generatedLink ? (
          <form onSubmit={handleCreateSecret} aria-busy={loading}>
            <div className="overflow-hidden rounded-xl border border-[#d9d6cd] bg-[#fffefa] focus-within:border-[#8b8577] focus-within:ring-2 focus-within:ring-[#8b8577]/15">
              <label
                htmlFor="secret-text"
                className="block px-5 pt-4 text-xs font-medium text-[#6f6b62]"
              >
                Pesan rahasia
              </label>
              <textarea
                id="secret-text"
                rows={7}
                required
                disabled={loading}
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Tulis yang ingin kamu bagikan…"
                spellCheck={false}
                autoComplete="off"
                className="block min-h-48 w-full resize-y bg-transparent px-5 pt-3 pb-5 text-base leading-7 text-[#252420] placeholder:text-[#aaa598] focus:outline-none disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eae7df] px-5 py-3">
                <label htmlFor="secret-ttl" className="text-xs text-[#6f6b62]">
                  Jika belum dibaca, hapus dalam
                </label>
                <select
                  id="secret-ttl"
                  value={ttlSeconds}
                  disabled={loading}
                  onChange={(e) => setTtlSeconds(Number(e.target.value))}
                  className="min-h-8 cursor-pointer rounded bg-transparent py-1 pr-1 pl-2 text-sm font-medium text-[#454239] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a4492c] disabled:cursor-wait"
                >
                  <option value={300}>5 menit</option>
                  <option value={3600}>1 jam</option>
                  <option value={86400}>24 jam</option>
                  <option value={604800}>7 hari</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !secretText.trim()}
              className={`${buttonClassName} mt-5 w-full`}
            >
              {loading ? "Mengenkripsi pesan…" : "Buat tautan rahasia"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-[#817c70]">
              Tanpa akun. Hanya penerima tautan yang bisa membaca.
            </p>
          </form>
        ) : (
          <div>
            <div className="rounded-xl border border-[#d9d6cd] bg-[#fffefa] p-5">
              <label
                htmlFor="generated-link"
                className="mb-3 block text-xs font-medium text-[#6f6b62]"
              >
                Tautan sekali baca
              </label>
              <input
                id="generated-link"
                type="text"
                readOnly
                autoFocus
                value={generatedLink}
                onFocus={(e) => e.currentTarget.select()}
                className="min-h-11 w-full min-w-0 rounded-md border border-[#e5e2d9] bg-[#f8f7f2] px-3 py-2 font-mono text-sm text-[#454239] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a4492c]"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`${buttonClassName} mt-3 w-full`}
              >
                <span role="status" aria-live="polite">
                  {copied ? "Tautan tersalin" : "Salin tautan"}
                </span>
                <span aria-hidden="true">{copied ? "✓" : "↗"}</span>
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6f6b62]">
              <span className="font-medium text-[#454239]">Jangan dibuka dulu.</span>{" "}
              Tautan hanya bisa dibuka sekali, termasuk olehmu sendiri.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 rounded py-1 text-sm font-medium text-[#454239] underline decoration-[#c9c4b7] underline-offset-4 transition-colors hover:text-[#a4492c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a4492c] motion-reduce:transition-none"
            >
              Tulis pesan baru
            </button>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-[#e8c9bd] bg-[#fbefea] px-4 py-3 text-sm leading-6 text-[#963d27]"
          >
            {error}
          </p>
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
