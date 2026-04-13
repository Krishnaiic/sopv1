/** Client-only: splits body HTML into chunks that fit A4 content columns (matches PDF margins). */

const MM_TO_PX = 96 / 25.4;

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

/** Inner width: A4 210mm minus 14mm left + right. */
export function a4InnerContentWidthPx(): number {
  return mmToPx(210 - 28);
}

/**
 * PDF body margins: top 32mm, bottom 22mm → 243mm tall content column inside the sheet.
 * Logo row + optional doc header + footer eat into the first / subsequent pages.
 */
export function paginateBodyHtmlToPages(
  bodyHtml: string,
  options: {
    /** Max height (px) for `.content` on page 1 (after logo + doc header). */
    firstPageContentMaxPx: number;
    /** Max height (px) for `.content` on following pages (after logo). */
    otherPageContentMaxPx: number;
  },
): string[] {
  if (typeof document === "undefined") {
    return [bodyHtml];
  }

  const host = document.createElement("div");
  host.innerHTML = bodyHtml.trim();
  let blocks = Array.from(host.children) as HTMLElement[];
  let unwrap = 0;
  while (blocks.length === 1 && blocks[0].tagName === "DIV" && unwrap < 8) {
    const inner = Array.from(blocks[0].children) as HTMLElement[];
    if (inner.length === 0) break;
    blocks = inner;
    unwrap++;
  }

  if (blocks.length === 0) {
    return [bodyHtml];
  }

  const w = a4InnerContentWidthPx();
  const heights = blocks.map((b) => measureBlockHeightPx(b, w));

  const pages: HTMLElement[][] = [];
  let bucket: HTMLElement[] = [];
  let used = 0;
  let pageIdx = 0;

  const limit = () => (pageIdx === 0 ? options.firstPageContentMaxPx : options.otherPageContentMaxPx);

  for (let i = 0; i < blocks.length; i++) {
    const h = heights[i];
    const lim = limit();
    if (used + h > lim && bucket.length > 0) {
      pages.push(bucket);
      bucket = [];
      used = 0;
      pageIdx += 1;
    }
    bucket.push(blocks[i]);
    used += h;
  }
  if (bucket.length) {
    pages.push(bucket);
  }

  return pages.map((row) => row.map((el) => el.outerHTML).join(""));
}

function measureBlockHeightPx(el: HTMLElement, contentWidthPx: number): number {
  const shell = document.createElement("div");
  shell.setAttribute("data-sop-a4-measure", "true");
  shell.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:" + String(contentWidthPx) + "px",
    "visibility:hidden",
    "pointer-events:none",
    "z-index:-9999",
    'font-family:"Segoe UI",Arial,sans-serif',
    "font-size:12px",
    "line-height:1.65",
    "color:#0f172a",
  ].join(";");
  document.body.appendChild(shell);
  const clone = el.cloneNode(true) as HTMLElement;
  shell.appendChild(clone);
  const h = clone.getBoundingClientRect().height;
  shell.remove();
  return Math.max(1, Math.ceil(h));
}

/** Default chrome budgets (px) — tuned to match PDF header/footer areas. */
export function defaultA4ContentLimitsPx(): { first: number; rest: number } {
  const inner = mmToPx(297 - 32 - 22);
  const logo = 58;
  const docHeader = 118;
  const footer = 30;
  return {
    first: Math.max(120, inner - logo - docHeader - footer),
    rest: Math.max(120, inner - logo - footer),
  };
}
