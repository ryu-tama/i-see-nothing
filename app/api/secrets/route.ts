import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type = "text", ciphertext, iv, ttlSeconds = 3600, fileSize } = body;

    if (!iv) {
      return NextResponse.json({ error: "IV wajib disertakan." }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + Number(ttlSeconds) * 1000).toISOString();

    // Bersihkan data kedaluwarsa secara oportunistik
    await supabaseAdmin
      .from("secrets")
      .delete()
      .lt("expires_at", new Date().toISOString());

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
