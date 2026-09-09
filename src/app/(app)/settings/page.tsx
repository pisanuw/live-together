import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { getViewer } from "@/lib/auth/context";
import { displayName } from "@/lib/auth/types";
import { resolveAvatarUrl } from "@/lib/storage/avatars";

import { updateProfile, uploadAvatarAction } from "./actions";
import { ThemeSelector } from "./theme-selector";

const inputClass =
  "border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await getViewer();
  const profile = viewer.profile;
  const avatarUrl = await resolveAvatarUrl(profile?.avatar_url);
  const { error } = await searchParams;
  const name = displayName(profile, "resident");

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Profile</h2>

        <div className="flex items-center gap-4">
          <Avatar url={avatarUrl} name={name} size={56} />
          <form action={uploadAvatarAction} className="flex items-center gap-2">
            <input
              type="file"
              name="avatar"
              accept="image/*"
              required
              className="text-muted-foreground max-w-56 text-sm file:mr-2 file:rounded-md file:border file:px-2 file:py-1 file:text-xs"
            />
            <SubmitButton size="sm" variant="outline" pendingText="Uploading…">
              Upload
            </SubmitButton>
          </form>
        </div>

        <form action={updateProfile} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="preferred_name" className="text-sm font-medium">
              Preferred name
            </label>
            <input
              id="preferred_name"
              name="preferred_name"
              defaultValue={profile?.preferred_name ?? ""}
              placeholder="What should neighbors call you?"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="full_name" className="text-sm font-medium">
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              defaultValue={profile?.full_name ?? ""}
              className={inputClass}
            />
          </div>
          <SubmitButton size="sm" pendingText="Saving…">
            Save profile
          </SubmitButton>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <ThemeSelector current={viewer.theme} />
      </section>

      <section className="text-muted-foreground space-y-2 text-sm">
        <h2 className="text-foreground text-sm font-semibold">More</h2>
        <p>
          Privacy policy, terms of service, and notification preferences arrive
          in Stage 7.
        </p>
      </section>
    </div>
  );
}
