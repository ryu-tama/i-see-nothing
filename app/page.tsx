import CreateSecretForm from "@/components/CreateSecretForm";

export default function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f6f5f0] px-6 py-12 text-[#252420] selection:bg-[#e9d6c9] sm:py-16">
      <CreateSecretForm />
    </main>
  );
}
