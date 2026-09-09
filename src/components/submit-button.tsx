"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Submit button that reflects the enclosing form's pending state, so slow
 * server actions / navigations give immediate visual feedback.
 */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}
