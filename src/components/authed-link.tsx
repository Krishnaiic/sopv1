"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const AUTH_ERR = new Set([401, 403]);

export function AuthedLink(
  props: LinkProps & {
    className?: string;
    children: React.ReactNode;
    /** Where to send unauthenticated users (defaults to /auth/login?next=<href>). */
    loginHref?: string;
  },
) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const hrefStr = typeof props.href === "string" ? props.href : props.href.pathname || "/";
  const loginHref = props.loginHref || `/auth/login?next=${encodeURIComponent(hrefStr)}`;

  const onClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      // allow new tab etc.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      e.preventDefault();
      if (checking) return;
      setChecking(true);
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          router.push(hrefStr);
          router.refresh();
          return;
        }
        if (AUTH_ERR.has(res.status)) {
          window.location.href = loginHref;
          return;
        }
        window.location.href = loginHref;
      } catch {
        window.location.href = loginHref;
      } finally {
        setChecking(false);
      }
    },
    [checking, hrefStr, loginHref, router],
  );

  const { loginHref: _ignored, ...linkProps } = props;
  return (
    <Link
      {...linkProps}
      onClick={onClick}
      aria-disabled={checking || undefined}
      className={props.className}
    >
      {props.children}
    </Link>
  );
}

