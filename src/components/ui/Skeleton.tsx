type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden />;
}

type SkeletonTextProps = {
  lines?: number;
  className?: string;
};

export function SkeletonText({ lines = 3, className = "" }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-3 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

type SkeletonCircleProps = {
  className?: string;
};

export function SkeletonCircle({ className = "" }: SkeletonCircleProps) {
  return <Skeleton className={`rounded-full ${className}`.trim()} />;
}

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className = "h-3 w-3" }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`.trim()}
      aria-hidden
    />
  );
}
