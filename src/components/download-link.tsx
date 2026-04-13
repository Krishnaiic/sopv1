"use client";

import { useEffect, useRef, useState } from "react";

type DownloadLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  download?: string | boolean;
  target?: string;
  rel?: string;
  title?: string;
  "aria-label"?: string;
};

export function DownloadLink({
  href,
  className,
  children,
  download,
  target,
  rel,
  title,
  "aria-label": ariaLabel,
}: DownloadLinkProps) {
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleClick() {
    setLoading(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setLoading(false);
      timeoutRef.current = null;
    }, 3000);
  }

  return (
    <a
      href={href}
      download={download}
      target={target}
      rel={rel}
      title={title}
      aria-label={ariaLabel}
      data-skip-nav-loading="true"
      data-download-link="true"
      onClick={handleClick}
      className={className}
    >
      <span className="inline-flex items-center gap-2">
        {loading ? (
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1d74e7]/25 border-t-[#1d74e7]"
          />
        ) : null}
        <span className={loading ? "opacity-85" : undefined}>{children}</span>
      </span>
    </a>
  );
}
