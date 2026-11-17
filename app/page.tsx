"use client";

import { useState, useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { encryptSecret } from "@/src/lib/crypto";

export default function HomePage() {
  const [secretText, setSecretText] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(3600);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      animate(containerRef.current.querySelectorAll(".animate-item"), {
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 700,
        delay: stagger(90),
        ease: "outExpo",
      });
    }
  }, []);

  useEffect(() => {
    if (generatedLink && resultRef.current) {
      animate(resultRef.current, {
        scale: [0.95, 1],
        opacity: [0, 1],
        duration: 500,
        ease: "outBack",
      });
    }
  }, [generatedLink]);

  async function handleCreateSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!secretText.trim()) return;

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
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="mb-6">
          <div className="animate-item opacity-0 inline-block px-3 py-1 text-xs font-semibold tracking-wider text-sky-400 uppercase bg-sky-950/60 border border-sky-800/50 rounded-full mb-3">
            Zero-Knowledge • End-to-End Encrypted
          </div>
          <h1 className="animate-item opacity-0 text-2xl sm:text-3xl font-bold text-white">
            BurnNote
          </h1>
          <p className="animate-item opacity-0 text-slate-400 text-sm mt-1">
            Kirim password, API key, atau catatan sensitif. Pesan dienkripsi di
            browser-mu dan langsung hancur permanen setelah dibaca satu kali.
          </p>
        </div>

        {!generatedLink ? (
          <form onSubmit={handleCreateSecret} className="space-y-5">
            <div className="animate-item opacity-0">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Pesan Rahasia
              </label>
              <textarea
                rows={5}
                required
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Masukkan password, token, atau catatan rahasia di sini..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="animate-item opacity-0">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hangus Otomatis Jika Tidak Dibuka Dalam:
              </label>
              <select
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value={300}>5 Menit</option>
                <option value={3600}>1 Jam</option>
                <option value={86400}>24 Jam</option>
                <option value={604800}>7 Hari</option>
              </select>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !secretText.trim()}
              className="animate-item opacity-0 w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold text-white transition cursor-pointer"
            >
              {loading ? "Mengenkripsi & Membuat Tautan..." : "Buat Tautan Sekali Baca"}
            </button>
          </form>
        ) : (
          <div ref={resultRef} className="space-y-5 opacity-0">
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60">
              <p className="text-sm font-medium text-emerald-400 mb-2">
                Tautan rahasia siap dibagikan!
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Catatan: Tautan ini hanya bisa dibuka <strong>1 kali</strong>. Jangan
                buka tautan ini sendiri jika ingin mengirimkannya ke orang lain.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-sky-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shrink-0 transition cursor-pointer"
                >
                  {copied ? "Tersalin!" : "Salin"}
                </button>
              </div>
            </div>

            <button
              onClick={() => setGeneratedLink("")}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition cursor-pointer"
            >
              Buat Pesan Rahasia Baru
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
