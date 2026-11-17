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
        translateY: [15, 0],
        opacity: [0, 1],
        duration: 600,
        delay: stagger(70),
        ease: "outQuad",
      });
    } else if (generatedLink && resultRef.current) {
      animate(resultRef.current, {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 400,
        ease: "outQuad",
      });
    }
  }, [generatedLink]);

  async function handleCreateSecret(e: React.FormEvent) {
    e.preventDefault();
    if (activeTab === "text" && !secretText.trim()) return;
    if (activeTab === "file" && !selectedFile) return;

    setLoading(true);
    setError("");
    setProgress("Enkripsi...");

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
        if (selectedFile!.size > 50 * 1024 * 1024) {
          throw new Error("File maksimal 50 MB.");
        }

        const encrypted = await encryptFile(selectedFile!);
        keyString = encrypted.keyString;

        setProgress("Menyiapkan...");
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

        setProgress("Mengunggah...");
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

  const primaryBtn = "bg-[#252420] text-white hover:bg-[#403e38] transition-colors font-medium px-6 py-3 rounded-none border border-[#252420] disabled:bg-[#d9d6cd] disabled:border-[#d9d6cd] disabled:text-[#88857b]";
  const secondaryBtn = "bg-transparent text-[#252420] border border-[#252420] hover:bg-[#eae7df] transition-colors font-medium px-6 py-3 rounded-none";

  return (
    <div ref={containerRef} className="w-full max-w-2xl bg-[#f6f5f0] text-[#252420] font-sans">
      <header className="animate-item opacity-0 border-b border-[#252420] pb-6 mb-12 flex items-baseline justify-between">
        <div>
          <h1 className="text-4xl font-serif italic tracking-tight">I See Nothing.</h1>
          <p className="text-sm font-medium mt-1 text-[#6f6b62]">Zero-Knowledge Secret Sharing</p>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="https://github.com/ryu-tama/i-see-nothing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#252420] hover:text-[#a4492c] transition-colors"
            aria-label="GitHub Repository"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/2izky"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#252420] hover:text-[#a4492c] transition-colors"
            aria-label="Instagram Profile"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
        </div>
      </header>

      {!generatedLink ? (
        <form onSubmit={handleCreateSecret} className="space-y-12">
          <div className="animate-item opacity-0">
            <div className="flex gap-8 border-b border-[#d9d6cd] mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === "text" ? "border-[#a4492c] text-[#a4492c]" : "border-transparent text-[#aaa598]"
                }`}
              >
                Pesan Teks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("file")}
                className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === "file" ? "border-[#a4492c] text-[#a4492c]" : "border-transparent text-[#aaa598]"
                }`}
              >
                Unggah File
              </button>
            </div>

            {activeTab === "text" ? (
              <textarea
                rows={8}
                required
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Tulis pesan rahasia di sini..."
                className="w-full bg-[#fffefa] border border-[#252420] p-6 text-lg leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#a4492c] transition-all placeholder:text-[#d9d6cd] rounded-none shadow-[4px_4px_0px_0px_rgba(37,36,32,0.05)]"
              />
            ) : (
              <div className="relative group bg-[#fffefa] border border-[#252420] p-12 text-center shadow-[4px_4px_0px_0px_rgba(37,36,32,0.05)]">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <p className="text-xl font-serif">
                    {selectedFile ? selectedFile.name : "Pilih file rahasia"}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#6f6b62]">
                    Maks 50 MB / Terenkripsi
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="animate-item opacity-0 grid grid-cols-1 sm:grid-cols-2 gap-12 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f6b62] mb-3">
                Hapus otomatis setelah:
              </label>
              <div className="relative">
                <select
                  value={ttlSeconds}
                  onChange={(e) => setTtlSeconds(Number(e.target.value))}
                  className="w-full bg-transparent border-b border-[#252420] py-2 text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-8"
                >
                  <option value={300}>5 Menit</option>
                  <option value={3600}>1 Jam</option>
                  <option value={86400}>24 Jam</option>
                  <option value={604800}>7 Hari</option>
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {error && (
                <p className="text-[11px] font-bold text-[#a4492c] uppercase tracking-wider bg-[#fbefea] p-3 border border-[#e8c9bd]">
                  Error: {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className={primaryBtn}
              >
                {loading ? `${progress || "Memproses"}...` : "Buat Tautan Rahasia →"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div ref={resultRef} className="space-y-12 opacity-0">
          <div className="bg-[#d4e4bc] border border-[#252420] p-8 shadow-[6px_6px_0px_0px_#252420]">
            <h2 className="text-2xl font-serif mb-2">Tautan siap dikirim.</h2>
            <p className="text-sm mb-8 text-[#454d37]">
              Pesan akan dihapus permanen setelah dibaca satu kali. Jangan buka tautan ini sendiri.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 bg-[#fffefa] border border-[#252420] px-4 py-3 text-xs font-mono focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={primaryBtn}
              >
                {copied ? "Tersalin" : "Salin Teks"}
              </button>
            </div>
          </div>

          <button
            onClick={() => setGeneratedLink("")}
            className={secondaryBtn}
          >
            ← Buat Pesan Baru
          </button>
        </div>
      )}

      <footer className="animate-item opacity-0 mt-24 border-t border-[#d9d6cd] pt-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="max-w-xs">
          <p className="text-[10px] leading-relaxed text-[#aaa598] font-medium">
            Semua data dienkripsi secara lokal di browser Anda. Kami tidak menyimpan kunci atau teks asli di server kami.
          </p>
        </div>
        <div className="flex gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#252420]">v1.2.0</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#252420]">Open Source</span>
        </div>
      </footer>
    </div>
  );
}
