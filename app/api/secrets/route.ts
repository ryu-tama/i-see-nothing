import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

async function cleanupExpiredSecrets() {
  try {
    const now = new Date().toISOString();

    // 1. Cari semua secret yang sudah kedaluwarsa
    const { data: expired } = await supabaseAdmin
      .from("secrets")
      .select("id, type, file_path")
      .lt("expires_at", now)
      .limit(50);

    if (!expired || expired.length === 0) return;

    // 2. Kumpulkan path file di Storage yang perlu dihapus
    const filePaths = expired
      .filter((item) => item.type === "file" && item.file_path)
      .map((item) => item.file_path as string);

    if (filePaths.length > 0) {
      await supabaseAdmin.storage.from("encrypted-files").remove(filePaths);
    }

    // 3. Hapus baris kedaluwarsa dari tabel PostgreSQL
    const expiredIds = expired.map((item) => item.id);
    await supabaseAdmin.from("secrets").delete().in("id", expiredIds);
  } catch (err) {
    // Jangan gagalkan request utama jika cleanup gagal
    console.error("Cleanup expired secrets error:", err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type = "text", ciphertext, iv, ttlSeconds = 3600, fileSize } = body;

    if (!iv) {
      return NextResponse.json({ error: "IV wajib disertakan." }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + Number(ttlSeconds) * 1000).toISOString();

    // Bersihkan data kedaluwarsa secara oportunistik
    await cleanupExpiredSecrets();

    if (type === "file") {
      if (!fileSize || fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Ukuran file melebihi batas maksimal 50 MB." },
          { status: 400 }
        );
      }

      const filePath = `${crypto.randomUUID()}.bin`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("encrypted-files")
        .createSignedUploadUrl(filePath);

      if (uploadError || !uploadData) {
        return NextResponse.json(
          { error: uploadError?.message || "Gagal membuat izin unggah file." },
          { status: 500 }
        );
      }

      const { data: record, error: dbError } = await supabaseAdmin
        .from("secrets")
        .insert({
          type: "file",
          file_path: filePath,
          iv,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (dbError || !record) {
        return NextResponse.json(
          { error: dbError?.message || "Gagal menyimpan metadata file." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: record.id,
        signedUrl: uploadData.signedUrl,
      });
    }

    // Mode Teks
    if (!ciphertext) {
      return NextResponse.json({ error: "Ciphertext kosong." }, { status: 400 });
    }

    const { data: record, error: dbError } = await supabaseAdmin
      .from("secrets")
      .insert({
        type: "text",
        ciphertext,
        iv,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (dbError || !record) {
      return NextResponse.json(
        { error: dbError?.message || "Gagal menyimpan pesan rahasia." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: record.id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
