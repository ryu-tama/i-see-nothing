import CreateSecretForm from "@/components/CreateSecretForm";

export default function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-6 py-12 selection:bg-sky-500/30 sm:py-16">
      <CreateSecretForm />
    </main>
  );
}
