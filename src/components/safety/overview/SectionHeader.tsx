"use client";

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>

      <p className="mt-1 text-xs text-text-muted">{description}</p>
    </div>
  );
}
