type WeekBadgeProps = {
  weekNumber: number;
  year: number;
  onClick?: () => void;
};

export function WeekBadge({ weekNumber, year, onClick }: WeekBadgeProps) {
  const inner = (
    <div className="inline-flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-lg bg-surface px-3 py-2 shadow-sm ring-1 ring-border-subtle">
      <span className="text-xs font-semibold leading-tight text-text">Week {weekNumber}</span>
      <span className="text-[10px] font-medium tabular-nums leading-none text-text-dim">{year}</span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="mx-auto block cursor-pointer hover:opacity-80"
      >
        {inner}
      </button>
    );
  }

  return <div className="mx-auto inline-block">{inner}</div>;
}
