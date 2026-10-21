import { ClaudeConnect } from "@/components/claude-connect";

export default function ClaudePage() {
  return (
    <div className="min-h-full w-full bg-slate-50/60 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 md:px-10">
        <header className="pb-6 pt-8 md:pt-10">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Connecter Claude</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Branche ton Claude sur la base Outlr et pose-lui tes questions en langage naturel.
          </p>
        </header>
        <ClaudeConnect />
      </div>
    </div>
  );
}
