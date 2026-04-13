"use client";

export function LogoutButton({
  className,
  withIcon = false,
  label = "Logout",
}: {
  className?: string;
  withIcon?: boolean;
  label?: string;
}) {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <button
      onClick={handleLogout}
      className={
        className ??
        "rounded-md bg-red-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
      }
    >
      <span className="inline-flex items-center gap-2">
        {withIcon ? (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 12H3m0 0 3-3m-3 3 3 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        {label}
      </span>
    </button>
  );
}
