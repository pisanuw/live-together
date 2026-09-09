export function SectionStub({
  title,
  stage,
  description,
}: {
  title: string;
  stage: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Coming in {stage}.
      </div>
    </div>
  );
}
