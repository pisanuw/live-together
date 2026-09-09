import { HealthStatus, type HealthCheck } from "@/components/health-status";
import { Button } from "@/components/ui/button";
import { env, isSupabaseConfigured } from "@/lib/env";

export default function Home() {
  const supabaseReady = isSupabaseConfigured();

  const checks: HealthCheck[] = [
    { label: "App server", status: "ok", detail: "Next.js is running" },
    {
      label: "Supabase configuration",
      status: supabaseReady ? "ok" : "pending",
      detail: supabaseReady
        ? env.supabaseUrl
        : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="space-y-2 text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
          WCV
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          West Complex Village
        </h1>
        <p className="text-muted-foreground">
          Community app scaffold — Stage 0. Environment readiness:
        </p>
      </div>

      <HealthStatus checks={checks} />

      <div className="flex gap-3">
        <Button variant="outline" disabled>
          Sign in (Stage 1)
        </Button>
      </div>
    </main>
  );
}
