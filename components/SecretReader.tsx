"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { animate } from "animejs";
import { decryptSecret, decryptFile } from "@/src/lib/crypto";

export default function SecretReader() {
  const params = useParams<{ id: string }>();
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [decryptedFile, setDecryptedFile] = useState<{
    blob: Blob;
    fileName: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      animate(cardRef.current, {
        translateY: [24, 0],
        opacity: [0, 1],
        duration: 650,
        ease: "outExpo",
      });
    }
  }, []);

  useEffect(() => {
    if (!decryptedMessage) return;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const progressObj = { value: 0 };

    animate(progressObj, {
      value: decryptedMessage.length,
      duration: Math.min(1200, Math.max(500, decryptedMessage.length * 25)),
      ease: "outQuad",
      onUpdate: () => {
        const revealedCount = Math.floor(progressObj.value);
        let scrambled = "";
        for (let i = 0; i < decryptedMessage.length; i++) {
          const originalChar = decryptedMessage[i];
          if (i < revealedCount || originalChar === "\n" || originalChar === " ") {
            scrambled += originalChar;
          } else {
            scrambled += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        setDisplayedText(scrambled);
      },
      onComplete: () => {
        setDisplayedText(decryptedMessage);
      },
    });
  }, [decryptedMessage]);

  useEffect(() => {
    if (error && errorRef.current) {
      animate(errorRef.current, {
        translateX: [-8, 8, -6, 6, -3, 3, 0],
        duration: 450,
        ease: "inOutSine",
      });
    }
  }, [error]);

  async function handleRevealSecret() {
    setLoading(true);
    setError("");
    setProgress("Membuka kunci...");

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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "Pesan tidak ditemukan atau sudah pernah dibuka."
        );
      }

      const typeHeader = res.headers.get("X-Secret-Type");

      if (typeHeader === "file") {
        const iv = res.headers.get("X-Secret-IV");
        if (!iv) throw new Error("Metadata enkripsi tidak lengkap.");

        setProgress("Mengunduh data terenkripsi...");
        const buffer = await res.arrayBuffer();

        setProgress("Mendekripsi file...");
        const result = await decryptFile(buffer, iv, keyString);
        setDecryptedFile(result);
      } else {
        const data = await res.json();
        setProgress("Mendekripsi teks...");
        const plainText = await decryptSecret(data.ciphertext, data.iv, keyString);
        setDecryptedMessage(plainText);
      }

      window.history.replaceState(null, "", window.location.pathname);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuka pesan. Kunci salah atau data telah rusak."
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

  return (
    <div
      ref={cardRef}
      className="opacity-0 w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">
          Pesan Rahasia
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Pesan ini dilindungi enkripsi ujung-ke-ujung dan hanya dapat dilihat
          satu kali.
        </p>
      </div>

      {!decryptedMessage && !decryptedFile && !error && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 text-amber-200/80 text-sm leading-relaxed">
            <strong className="text-amber-400 block mb-1">Peringatan:</strong>
            Begitu anda menekan tombol di bawah, pesan akan langsung didekripsi di
            browser anda dan dihancur permanen dari server.
          </div>

          <button
            onClick={handleRevealSecret}
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold text-white transition-all shadow-lg shadow-sky-900/20 active:scale-95 cursor-pointer"
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
                {progress || "Mendekripsi..."}
              </span>
            ) : (
              "Buka & Hancurkan Pesan"
            )}
          </button>
        </div>
      )}

      {error && (
        <div ref={errorRef} className="space-y-6">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm leading-relaxed">
            {error}
          </div>
          <Link
            href="/"
            className="block text-center w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      )}

      {decryptedMessage && (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-800/50">
                Dekripsi Berhasil
              </span>
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold transition-colors cursor-pointer"
              >
                {copied ? "Tersalin!" : "Salin Teks"}
              </button>
            </div>
            <div className="relative">
              <pre className="w-full rounded-xl bg-slate-950 border border-slate-800 p-5 text-sm text-sky-400 whitespace-pre-wrap break-all font-mono leading-relaxed max-h-96 overflow-y-auto">
                {displayedText}
              </pre>
            </div>
          </div>

          <Link
            href="/"
            className="block text-center w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 transition-colors"
          >
            Buat Pesan Baru
          </Link>
        </div>
      )}

      {decryptedFile && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/30 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-1 break-all px-4">
              {decryptedFile.fileName}
            </h3>
            <p className="text-slate-400 text-xs mb-6">
              File siap diunduh. Data di server telah musnah.
            </p>
            <button
              onClick={handleDownloadFile}
              className="w-full py-4 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer"
            >
              Unduh File
            </button>
          </div>

          <Link
            href="/"
            className="block text-center w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 transition-colors"
          >
            Buat Pesan Baru
          </Link>
        </div>
      )}
    </div>
  );
}
