"use client";

import { useState, useTransition } from "react";

import { deleteItem, updateItem } from "@/app/(app)/info/actions";
import { Button } from "@/components/ui/button";
import type { InfoItem } from "@/lib/info/types";

const inputClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

/** A manager's editable info item: view with edit/delete, or an inline form. */
export function ItemRow({ item }: { item: InfoItem }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("itemId", item.id);
    startTransition(async () => {
      await updateItem(fd);
      setEditing(false);
    });
  }

  function remove() {
    if (!window.confirm("Delete this item?")) return;
    const fd = new FormData();
    fd.set("itemId", item.id);
    startTransition(() => deleteItem(fd));
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3 rounded-lg border p-4">
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={item.title}
          placeholder="Title"
          className={inputClass}
        />
        <textarea
          name="body"
          rows={4}
          maxLength={5000}
          defaultValue={item.body}
          placeholder="Details (markdown: **bold**, *italic*, - lists, [links](https://…))"
          className={inputClass}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="phone"
            maxLength={40}
            defaultValue={item.phone ?? ""}
            placeholder="Phone (optional)"
            className={inputClass}
          />
          <input
            name="url"
            maxLength={300}
            defaultValue={item.url ?? ""}
            placeholder="Link (optional)"
            className={inputClass}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="font-medium">{item.title}</p>
        <p className="text-muted-foreground truncate text-xs">
          {[item.body && "text", item.phone, item.url]
            .filter(Boolean)
            .join(" · ") || "No details"}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="xs" variant="ghost" onClick={remove} disabled={pending}>
          Delete
        </Button>
      </div>
    </div>
  );
}
