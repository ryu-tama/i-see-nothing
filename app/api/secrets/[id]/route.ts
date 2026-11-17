import { NextResponse } from "next/server";
import { secretStore, cleanupExpiredSecrets } from "@/src/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  cleanupExpiredSecrets();

  const { id } = await params;
  const record = secretStore.get(id);

  // Jika tidak ditemukan atau sudah pernah dibaca/hangus
  if (!record) {
    return NextResponse.json(
      { error: "Pesan tidak ditemukan, sudah dibaca, atau telah kedaluwarsa." },
      { status: 404 }
    );
  }

  // Cek apakah sudah melewati batas waktu
  if (record.expiresAt <= Date.now()) {
    secretStore.delete(id);
    return NextResponse.json(
      { error: "Pesan telah kedaluwarsa." },
      { status: 410 }
    );
  }

  // KUNCI UTAMA (BURN-AFTER-READING): Hapus dari server sebelum dikirim ke penerima
  secretStore.delete(id);

  return NextResponse.json({
    ciphertext: record.ciphertext,
    iv: record.iv,
  });
}
