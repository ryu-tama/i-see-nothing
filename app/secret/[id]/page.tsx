import { Suspense } from "react";
import SecretReader from "@/components/SecretReader";

export default function ReadSecretPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-6 py-12 selection:bg-sky-500/30 sm:py-16">
      <Suspense
        fallback={
          <div className="text-sm text-slate-500">Memuat halaman rahasia…</div>
        }
      >
        <SecretReader />
      </Suspense>
    </main>
  );
}
