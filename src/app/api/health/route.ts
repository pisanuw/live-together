import { pingSupabase } from "@/lib/supabase/health";

// Always run at request time so the connectivity check is live.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await pingSupabase();
  const healthy = supabase.configured ? supabase.ok : true;

  return Response.json(
    { app: "ok", supabase },
    { status: healthy ? 200 : 503 }
  );
}
