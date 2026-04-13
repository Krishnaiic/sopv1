type RouteLoadingScreenProps = {
  compact?: boolean;
};

export function RouteLoadingScreen({ compact = false }: RouteLoadingScreenProps) {
  return (
    <div
      className={
        compact
          ? "flex min-h-[calc(100vh-7rem)] items-center justify-center px-6 py-10"
          : "flex min-h-screen items-center justify-center px-6 py-10"
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="loading-spiral" aria-hidden="true">
            <span className="loading-spiral-dot loading-spiral-dot-1" />
            <span className="loading-spiral-dot loading-spiral-dot-2" />
            <span className="loading-spiral-dot loading-spiral-dot-3" />
            <span className="loading-spiral-dot loading-spiral-dot-4" />
            <span className="loading-spiral-dot loading-spiral-dot-5" />
            <span className="loading-spiral-dot loading-spiral-dot-6" />
            <span className="loading-spiral-dot loading-spiral-dot-7" />
            <span className="loading-spiral-dot loading-spiral-dot-8" />
            <span className="loading-spiral-dot loading-spiral-dot-9" />
            <span className="loading-spiral-dot loading-spiral-dot-10" />
            <span className="loading-spiral-dot loading-spiral-dot-11" />
            <span className="loading-spiral-dot loading-spiral-dot-12" />
          </div>
        </div>
        <p className="text-sm font-medium tracking-[0.04em] text-[#4d6285]">loading..</p>
      </div>
    </div>
  );
}
