// Utilitas konversi Base64URL untuk URL fragment (#key) & IV
function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function generateAesKey(): Promise<{ key: CryptoKey; keyString: string }> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return { key, keyString: bufferToBase64Url(rawKey) };
}

async function importAesKey(keyString: string): Promise<CryptoKey> {
  const rawKey = base64UrlToBuffer(keyString);
  return crypto.subtle.importKey(
    "raw",
    rawKey.buffer as ArrayBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

// 1. Enkripsi & Dekripsi Pesan Teks
export async function encryptSecret(plainText: string) {
  const { key, keyString } = await generateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    ciphertext: bufferToBase64Url(ciphertextBuffer),
    iv: bufferToBase64Url(iv),
    keyString,
  };
}

export async function decryptSecret(
  ciphertextB64: string,
  ivB64: string,
  keyString: string
): Promise<string> {
  const key = await importAesKey(keyString);
  const iv = base64UrlToBuffer(ivB64);
  const ciphertext = base64UrlToBuffer(ciphertextB64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// 2. Enkripsi & Dekripsi File (Menyembunyikan nama file & MIME type di dalam ciphertext)
export async function encryptFile(file: File) {
  const { key, keyString } = await generateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const metadataBytes = new TextEncoder().encode(
    JSON.stringify({ name: file.name, type: file.type || "application/octet-stream" })
  );
  const fileBuffer = await file.arrayBuffer();

  // Paket biner: [4 byte panjang metadata][Metadata JSON][Isi File]
  const combined = new Uint8Array(4 + metadataBytes.length + fileBuffer.byteLength);
  new DataView(combined.buffer).setUint32(0, metadataBytes.length, false);
  combined.set(metadataBytes, 4);
  combined.set(new Uint8Array(fileBuffer), 4 + metadataBytes.length);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    combined
  );

  return {
    encryptedBlob: new Blob([encryptedBuffer], { type: "application/octet-stream" }),
    iv: bufferToBase64Url(iv),
    keyString,
  };
}

export async function decryptFile(
  encryptedBuffer: ArrayBuffer,
  ivB64: string,
  keyString: string
): Promise<{ blob: Blob; fileName: string }> {
  const key = await importAesKey(keyString);
  const iv = base64UrlToBuffer(ivB64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encryptedBuffer
  );

  const decryptedBytes = new Uint8Array(decryptedBuffer);
  const metadataLength = new DataView(decryptedBytes.buffer).getUint32(0, false);
  const metadataBytes = decryptedBytes.slice(4, 4 + metadataLength);
  const fileBytes = decryptedBytes.slice(4 + metadataLength);

  const metadata = JSON.parse(new TextDecoder().decode(metadataBytes)) as {
    name: string;
    type: string;
  };

  return {
    blob: new Blob([fileBytes], { type: metadata.type }),
    fileName: metadata.name,
  };
}
