"use client";

import { useState, useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { encryptSecret, encryptFile } from "@/src/lib/crypto";

type Tab = "text" | "file";

export default function CreateSecretForm() {
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [secretText, setSecretText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ttlSeconds, setTtlSeconds] = useState(3600);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!generatedLink && containerRef.current) {
      animate(containerRef.current.querySelectorAll(".animate-item"), {
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 700,
        delay: stagger(90),
        ease: "outExpo",
      });
    } else if (generatedLink && resultRef.current) {
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
    if (activeTab === "text" && !secretText.trim()) return;
    if (activeTab === "file" && !selectedFile) return;

    setLoading(true);
    setError("");
    setProgress("Mengenkripsi...");

    try {
      let id = "";
      let keyString = "";

      if (activeTab === "text") {
        const encrypted = await encryptSecret(secretText);
        keyString = encrypted.keyString;

        const res = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "text",
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            ttlSeconds,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat tautan.");
        id = data.id;
      } else {
        // activeTab === "file"
        if (selectedFile!.size > 50 * 1024 * 1024) {
          throw new Error("File maksimal 50 MB.");
        }

        const encrypted = await encryptFile(selectedFile!);
        keyString = encrypted.keyString;

        setProgress("Menyiapkan upload...");
        const res = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "file",
            iv: encrypted.iv,
            fileSize: selectedFile!.size,
            ttlSeconds,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menyiapkan upload.");

        setProgress("Mengunggah file (E2EE)...");
        const uploadRes = await fetch(data.signedUrl, {
          method: "PUT",
          body: encrypted.encryptedBlob,
          headers: { "Content-Type": "application/octet-stream" },
        });

        if (!uploadRes.ok) throw new Error("Gagal mengunggah file.");
        id = data.id;
      }

      const fullUrl = `${window.location.origin}/secret/${id}#${keyString}`;
      setGeneratedLink(fullUrl);
      setSecretText("");
      setSelectedFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const tabClass = (tab: Tab) =>
    `flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
      activeTab === tab
        ? "bg-sky-600 text-white shadow-lg"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
    }`;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
    >
      <div className="mb-6">
        <div className="animate-item opacity-0 inline-flex items-center px-3 py-1 text-[10px] font-bold tracking-widest text-sky-400 uppercase bg-sky-950/40 border border-sky-800/50 rounded-full mb-4">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          Zero-Knowledge • E2EE
        </div>
        <h1 className="animate-item opacity-0 text-3xl font-black text-white tracking-tight">
          BurnNote
        </h1>
        <p className="animate-item opacity-0 text-slate-400 text-sm mt-2 leading-relaxed">
          Kirim data sensitif secara aman. Pesan dienkripsi di browser dan
          langsung hancur setelah dibaca.
        </p>
      </div>

      {!generatedLink ? (
        <form onSubmit={handleCreateSecret} className="space-y-6">
          <div className="animate-item opacity-0 flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={tabClass("text")}
            >
              Pesan Teks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={tabClass("file")}
            >
              Unggah File
            </button>
          </div>

          <div className="animate-item opacity-0">
            {activeTab === "text" ? (
              <textarea
                rows={6}
                required
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Masukkan password, token, atau rahasia lainnya..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
              />
            ) : (
              <div
                className={`relative group flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all ${
                  selectedFile
                    ? "border-sky-500 bg-sky-500/5"
                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                }`}
              >
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  <div className="mb-2 text-slate-300">
                    {selectedFile ? (
                      <span className="font-semibold text-sky-400">
                        {selectedFile.name}
                      </span>
                    ) : (
                      "Klik atau drop file di sini"
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Maksimal 50 MB • Terenkripsi E2EE
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="animate-item opacity-0">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Hancurkan otomatis dalam:
            </label>
            <div className="relative group">
              <select
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 pr-10 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors appearance-none cursor-pointer"
              >
                <option value={300}>5 Menit</option>
                <option value={3600}>1 Jam</option>
                <option value={86400}>24 Jam</option>
                <option value={604800}>7 Hari</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-500 transition-colors">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-xs leading-relaxed animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="animate-item opacity-0 w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold text-white transition-all shadow-lg shadow-sky-900/20 active:scale-95 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {progress || "Memproses..."}
              </span>
            ) : (
              "Buat Tautan Sekali Baca"
            )}
          </button>
        </form>
      ) : (
        <div ref={resultRef} className="space-y-6 opacity-0">
          <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
            <p className="text-sm font-bold text-emerald-400 mb-2 flex items-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Tautan siap dibagikan!
            </p>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Tautan ini hanya bisa dibuka <strong>1 kali</strong>. Jangan dibuka
              sendiri jika ingin dikirim ke orang lain.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-sky-400 font-mono focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shrink-0 transition-colors cursor-pointer"
              >
                {copied ? "Tersalin!" : "Salin"}
              </button>
            </div>
          </div>

          <button
            onClick={() => setGeneratedLink("")}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            Buat Baru
          </button>
        </div>
      )}
    </div>
  );
}
