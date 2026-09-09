function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

export function Avatar({
  url,
  name,
  size = 32,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const dimension = { width: size, height: size };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        style={dimension}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={dimension}
      className="bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full text-xs font-medium"
    >
      {initialsOf(name)}
    </span>
  );
}
