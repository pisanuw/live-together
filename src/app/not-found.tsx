import Link from "next/link";

/** Top-level 404 (routes outside the authenticated app shell). */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
        WCV
      </p>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="text-primary text-sm underline underline-offset-4"
      >
        Back to home
      </Link>
    </main>
  );
}
