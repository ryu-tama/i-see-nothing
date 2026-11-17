import { Suspense } from "react";
import SecretReader from "@/components/SecretReader";

export default function ReadSecretPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f6f5f0] px-6 py-12 text-[#252420] selection:bg-[#e9d6c9] sm:py-16">
      <Suspense
        fallback={
          <div className="text-sm text-[#6f6b62]">Memuat halaman rahasia…</div>
        }
      >
        <SecretReader />
      </Suspense>
    </main>
  );
}
