// Mengubah ArrayBuffer menjadi teks Base64URL agar aman ditaruh di link/URL
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Mengubah teks Base64URL kembali menjadi ArrayBuffer untuk proses dekripsi
function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// 1. Fungsi Enkripsi Pesan di Browser Pengirim
export async function encryptSecret(plainText: string) {
  // Buat kunci acak AES-GCM 256-bit
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // Buat IV (Initialization Vector) acak 12-byte agar hasil enkripsi selalu unik
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plainText);

  // Proses enkripsi
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );

  // Ekspor kunci menjadi string pendek untuk ditempel di URL (#key)
  const rawKey = await window.crypto.subtle.exportKey("raw", key);

  return {
    ciphertext: bufferToBase64Url(cipherBuffer),
    iv: bufferToBase64Url(iv.buffer),
    keyString: bufferToBase64Url(rawKey), // Ini TIDAK PERNAH dikirim ke server
  };
}

// 2. Fungsi Dekripsi Pesan di Browser Penerima
export async function decryptSecret(
  ciphertextBase64: string,
  ivBase64: string,
  keyString: string
): Promise<string> {
  const rawKey = base64UrlToBuffer(keyString);
  const iv = new Uint8Array(base64UrlToBuffer(ivBase64));
  const cipherBuffer = base64UrlToBuffer(ciphertextBase64);

  // Impor kembali kunci dari URL fragment
  const key = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Proses dekripsi
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}
