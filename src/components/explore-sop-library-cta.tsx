"use client";

const AUTH_ERR = new Set([401, 403]);

export function ExploreSopLibraryCta({ className }: { className?: string }) {
  async function onActivate(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        window.location.href = "/departments";
        return;
      }
      if (AUTH_ERR.has(res.status)) {
        window.location.href = "/auth/login?next=/departments";
        return;
      }
      window.location.href = "/auth/login?next=/departments";
    } catch {
      window.location.href = "/auth/login?next=/departments";
    }
  }

  return (
    <a
      href="#departments"
      onClick={onActivate}
      className={className}
    >
      Explore SOP Library
    </a>
  );
}
