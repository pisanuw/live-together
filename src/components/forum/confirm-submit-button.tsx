"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Invokes a server action with hidden fields after an optional confirm prompt.
 * Used for destructive forum actions (delete a post) that want a guard rail.
 */
export function ConfirmSubmitButton({
  action,
  fields,
  confirm,
  children,
  pendingText,
  ...props
}: ButtonProps & {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  confirm?: string;
  pendingText?: string;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData();
    for (const [key, value] of Object.entries(fields)) fd.set(key, value);
    startTransition(() => action(fd));
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      {...props}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}
