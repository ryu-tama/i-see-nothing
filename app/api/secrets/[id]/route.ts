import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Ambil dan langsung hapus baris dari database secara atomik (Burn-After-Reading)
    const { data: secret, error } = await supabaseAdmin
      .from("secrets")
      .delete()
      .eq("id", id)
      .select("*")
      .single();

    if (error || !secret) {
      return NextResponse.json(
        { error: "Pesan tidak ditemukan, sudah dibaca, atau telah kedaluwarsa." },
        { status: 404 }
      );
    }

    // Cek kedaluwarsa (TTL)
    if (new Date(secret.expires_at).getTime() < Date.now()) {
      if (secret.type === "file" && secret.file_path) {
        await supabaseAdmin.storage.from("encrypted-files").remove([secret.file_path]);
      }
      return NextResponse.json(
        { error: "Tautan rahasia ini sudah kedaluwarsa." },
        { status: 410 }
      );
    }

    if (secret.type === "file" && secret.file_path) {
      const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
        .from("encrypted-files")
        .download(secret.file_path);

      await supabaseAdmin.storage.from("encrypted-files").remove([secret.file_path]);

      if (downloadError || !fileBlob) {
        return NextResponse.json(
          { error: "File terenkripsi gagal diambil atau sudah musnah." },
          { status: 404 }
        );
      }

      const arrayBuffer = await fileBlob.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Secret-Type": "file",
          "X-Secret-IV": secret.iv,
        },
      });
    }

    return NextResponse.json({
      type: "text",
      ciphertext: secret.ciphertext,
      iv: secret.iv,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses permintaan rahasia." },
      { status: 500 }
    );
  }
}
