"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RouteLoadingScreen } from "@/components/route-loading-screen";

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/** Admin routes that use the dashboard shell (sidebar + header). Full-screen overlay would hide them while only the page body should load. */
function isAdminDashboardPath(pathname: string) {
  return pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
}

export function NavigationLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const pendingPathRef = useRef<string | null>(null);
  const currentPath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    if (pendingPathRef.current !== currentPath) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setLoading(false);
      pendingPathRef.current = null;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentPath]);

  useEffect(() => {
    function stopLoading() {
      setLoading(false);
      pendingPathRef.current = null;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || isModifiedEvent(event)) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

       if (
        anchor.dataset.skipNavLoading === "true" ||
        anchor.hasAttribute("download") ||
        anchor.href.includes("/download-")
      ) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const currentFullUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextFullUrl = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (currentFullUrl === nextFullUrl) {
        return;
      }

      // In-dashboard navigations: keep shell visible; `app/admin/(dashboard)/loading.tsx` covers only `<main>`.
      if (isAdminDashboardPath(window.location.pathname) && isAdminDashboardPath(nextUrl.pathname)) {
        return;
      }

      pendingPathRef.current = `${nextUrl.pathname}${nextUrl.search}`;
      setLoading(true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        stopLoading();
      }, 10000);
    }

    function handleHashChange() {
      stopLoading();
    }

    function handlePopState() {
      stopLoading();
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[rgba(244,248,253,0.94)]">
      <RouteLoadingScreen />
    </div>
  );
}
