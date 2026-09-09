import { SubmitButton } from "@/components/submit-button";
import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton variant="outline" size="sm" pendingText="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
