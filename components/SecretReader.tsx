"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { animate } from "animejs";
import { decryptSecret, decryptFile } from "@/src/lib/crypto";

export default function SecretReader() {
  const params = useParams<{ id: string }>();
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [decryptedFile, setDecryptedFile] = useState<{
    blob: Blob;
    fileName: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      animate(cardRef.current, {
        translateY: [15, 0],
        opacity: [0, 1],
        duration: 600,
        ease: "outQuad",
      });
    }
  }, []);

  async function handleRevealSecret() {
    setLoading(true);
    setError("");
    setProgress("Otentikasi");

    try {
      const keyString = window.location.hash.replace(/^#/, "");
      if (!keyString) {
        throw new Error(
          "Kunci dekripsi tidak ditemukan di URL. Pastikan tautan lengkap."
        );
      }

      const res = await fetch(`/api/secrets/${params.id}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "Pesan tidak ditemukan atau sudah dibaca."
        );
      }

      const typeHeader = res.headers.get("X-Secret-Type");

      if (typeHeader === "file") {
        const iv = res.headers.get("X-Secret-IV");
        if (!iv) throw new Error("Metadata enkripsi tidak lengkap.");

        setProgress("Mengunduh");
        const buffer = await res.arrayBuffer();

        setProgress("Mendekripsi");
        const result = await decryptFile(buffer, iv, keyString);
        setDecryptedFile(result);
      } else {
        const data = await res.json();
        setProgress("Mendekripsi");
        const plainText = await decryptSecret(data.ciphertext, data.iv, keyString);
        setDecryptedMessage(plainText);
      }

      window.history.replaceState(null, "", window.location.pathname);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuka pesan rahasia."
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  function handleDownloadFile() {
    if (!decryptedFile) return;
    const url = URL.createObjectURL(decryptedFile.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = decryptedFile.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(decryptedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const primaryBtn = "bg-[#252420] text-white hover:bg-[#403e38] transition-colors font-medium px-8 py-4 rounded-none border border-[#252420] disabled:bg-[#d9d6cd] disabled:border-[#d9d6cd] disabled:text-[#88857b]";
  const secondaryBtn = "bg-transparent text-[#252420] border border-[#252420] hover:bg-[#eae7df] transition-colors font-medium px-6 py-3 rounded-none inline-block text-center";

  return (
    <div ref={cardRef} className="w-full max-w-2xl bg-[#f6f5f0] text-[#252420] font-sans opacity-0">
      <header className="border-b border-[#252420] pb-6 mb-12 flex items-baseline justify-between">
        <div>
          <Link href="/" className="text-4xl font-serif italic tracking-tight hover:text-[#a4492c] transition-colors">I See Nothing.</Link>
          <p className="text-sm font-medium mt-1 text-[#6f6b62]">Dekripsi Pesan Rahasia</p>
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

      {!decryptedMessage && !decryptedFile && !error && (
        <div className="space-y-12">
          <div className="bg-[#fffefa] border border-[#252420] p-8 shadow-[6px_6px_0px_0px_#252420]">
            <h2 className="text-3xl font-serif mb-4">Ada rahasia untuk Anda.</h2>
            <p className="text-lg leading-relaxed mb-8">
              Pesan ini hanya bisa dilihat <span className="font-bold border-b-2 border-[#d4e4bc]">satu kali</span>. Setelah dibuka, data akan dihapus permanen dari server kami segera.
            </p>
            <button
              onClick={handleRevealSecret}
              disabled={loading}
              className={primaryBtn}
            >
              {loading ? `${progress || "Mendekripsi"}...` : "Buka Pesan Sekarang →"}
            </button>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#aaa598]">
            Proses ini dilakukan sepenuhnya di browser Anda.
          </p>
        </div>
      )}

      {error && (
        <div className="space-y-12">
          <div className="bg-[#fbefea] border border-[#e8c9bd] p-8 shadow-[6px_6px_0px_0px_#963d27]">
            <h2 className="text-2xl font-serif mb-2 text-[#963d27]">Tautan Tidak Valid.</h2>
            <p className="text-sm text-[#963d27] mb-8">
              {error} Pesan mungkin sudah dibaca atau masa berlakunya telah habis.
            </p>
            <Link href="/" className={secondaryBtn}>← Kembali ke Beranda</Link>
          </div>
        </div>
      )}

      {decryptedMessage && (
        <div className="space-y-12">
          <div className="bg-[#d4e4bc] border border-[#252420] p-4 flex justify-between items-center mb-[-48px] relative z-10 mx-6 shadow-[2px_2px_0px_0px_#252420]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#454d37]">Dekripsi Berhasil</span>
            <button
              onClick={handleCopy}
              className="text-[10px] font-bold uppercase tracking-widest hover:text-[#a4492c] transition-colors"
            >
              {copied ? "Tersalin" : "Salin Teks"}
            </button>
          </div>
          
          <div className="bg-[#fffefa] border border-[#252420] p-10 pt-16 shadow-[6px_6px_0px_0px_#252420]">
            <pre className="text-lg leading-relaxed font-mono whitespace-pre-wrap break-all select-all">
              {decryptedMessage}
            </pre>
          </div>

          <div className="flex gap-4">
             <Link href="/" className={secondaryBtn}>← Buat Baru</Link>
          </div>
        </div>
      )}

      {decryptedFile && (
        <div className="space-y-12">
          <div className="bg-[#e9d6c9] border border-[#252420] p-12 text-center shadow-[6px_6px_0px_0px_#252420]">
            <div className="mb-6 inline-block p-4 bg-[#fffefa] border border-[#252420]">
              <svg className="w-12 h-12 text-[#252420]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif mb-2 break-all">{decryptedFile.fileName}</h2>
            <p className="text-sm font-medium text-[#6f6b62] mb-10">File telah didekripsi dan siap untuk diunduh.</p>
            <button
              onClick={handleDownloadFile}
              className={primaryBtn}
            >
              Unduh File Rahasia ↓
            </button>
          </div>
          <Link href="/" className={secondaryBtn}>← Buat Pesan Baru</Link>
        </div>
      )}

      <footer className="mt-24 border-t border-[#d9d6cd] pt-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <p className="text-[10px] leading-relaxed text-[#aaa598] font-medium max-w-xs">
          Pesan ini telah dihapus dari server kami secara permanen. Tutup halaman ini setelah selesai.
        </p>
        <div className="flex gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#252420]">Verified</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#252420]">E2EE</span>
        </div>
      </footer>
    </div>
  );
}
