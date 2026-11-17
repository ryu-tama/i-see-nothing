import { NextResponse } from "next/server";
import crypto from "crypto";
import { secretStore, cleanupExpiredSecrets } from "@/src/lib/store";

export async function POST(request: Request) {
  try {
    cleanupExpiredSecrets();

    const body = await request.json();
    const { ciphertext, iv, ttlSeconds } = body;

    // Validasi input dasar (Prinsip AppSec: Jangan pernah percaya input dari client)
    if (
      typeof ciphertext !== "string" ||
      typeof iv !== "string" ||
      !ciphertext ||
      !iv
    ) {
      return NextResponse.json(
        { error: "Payload tidak valid." },
        { status: 400 }
      );
    }

    // Batasi ukuran teks maksimal (misal 50KB) untuk mencegah serangan DoS memori
    if (ciphertext.length > 50_000) {
      return NextResponse.json(
        { error: "Ukuran pesan terlalu besar (maksimal 50KB)." },
        { status: 413 }
      );
    }

    // Buat ID acak yang aman secara kriptografis (16 byte = 32 karakter hex)
    const id = crypto.randomBytes(16).toString("hex");

    // Default masa berlaku 1 jam (3600 detik), maksimal 7 hari
    const validTtl =
      typeof ttlSeconds === "number" && ttlSeconds > 0 && ttlSeconds <= 604800
        ? ttlSeconds
        : 3600;

    secretStore.set(id, {
      ciphertext,
      iv,
      expiresAt: Date.now() + validTtl * 1000,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}
