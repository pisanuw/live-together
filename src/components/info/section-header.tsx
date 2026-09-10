"use client";

import { useState, useTransition } from "react";

import { deleteSection, renameSection } from "@/app/(app)/info/actions";
import { Button } from "@/components/ui/button";

/** Manager section header: rename inline or delete (with confirm). */
export function SectionHeader({
  sectionId,
  title,
}: {
  sectionId: string;
  title: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("sectionId", sectionId);
    startTransition(async () => {
      await renameSection(fd);
      setEditing(false);
    });
  }

  function remove() {
    if (!window.confirm(`Delete the "${title}" section and all its items?`)) {
      return;
    }
    const fd = new FormData();
    fd.set("sectionId", sectionId);
    startTransition(() => deleteSection(fd));
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex items-center gap-2">
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={title}
          className="border-input bg-background focus-visible:ring-ring h-8 flex-1 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        />
        <Button type="submit" size="xs" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button size="xs" variant="ghost" onClick={remove} disabled={pending}>
          Delete
        </Button>
      </div>
    </div>
  );
}
