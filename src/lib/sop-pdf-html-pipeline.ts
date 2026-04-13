import { appBaseUrl } from "@/lib/email";
import { signedGetUrlForSopImageKey } from "@/lib/s3-sop-upload";

/** Same transforms as PDF export: private images → signed URLs; videos → “open link” blocks. */
export async function hydratePrivateImagesForPdf(editableHtml: string): Promise<string> {
  const re = /<img\b[^>]*data-s3-key="([^"]+)"[^>]*>/gi;
  const matches = [...editableHtml.matchAll(re)];
  if (matches.length === 0) return editableHtml;

  let out = editableHtml;
  for (const m of matches) {
    const fullTag = m[0];
    const key = m[1] || "";
    const signed = await signedGetUrlForSopImageKey({ key, expiresInSeconds: 300 });
    if (!signed.ok) continue;

    const replaced =
      /src="[^"]*"/i.test(fullTag)
        ? fullTag.replace(/src="[^"]*"/i, `src="${signed.url}"`)
        : fullTag.replace("<img", `<img src="${signed.url}"`);
    out = out.replace(fullTag, replaced);
  }
  return out;
}

export function replaceVideosWithLinksForPdf(editableHtml: string): string {
  const re = /<video\b[^>]*data-s3-key="([^"]+)"[^>]*>(?:[\s\S]*?<\/video>)?/gi;
  const matches = [...editableHtml.matchAll(re)];
  if (matches.length === 0) return editableHtml;

  const base = appBaseUrl();
  let out = editableHtml;
  for (const m of matches) {
    const fullTag = m[0];
    const key = (m[1] || "").trim();
    if (!key || key.includes("..") || key.startsWith("/")) continue;

    const path = `/api/sop/videos/render?key=${encodeURIComponent(key)}`;
    const href = base ? `${base}${path}` : path;
    const replacement = `
      <div style="margin:12px 0; padding:12px 14px; border:1px solid #cbd5e1; border-radius:12px; background:#f8fafc;">
        <div style="font-size:12px; color:#0f172a; font-weight:600; margin-bottom:4px;">Video</div>
        <div style="font-size:11px; color:#475569; margin-bottom:8px;">
          This PDF cannot embed the video. Open it using the link below.
        </div>
        <a href="${href}" style="font-size:12px; color:#115b95; text-decoration:underline; word-break:break-all;">
          View video
        </a>
      </div>
    `.trim();

    out = out.replace(fullTag, replacement);
  }
  return out;
}

export async function prepareEditableHtmlForPdfExport(editableHtml: string): Promise<string> {
  const withVideos = replaceVideosWithLinksForPdf(editableHtml);
  return hydratePrivateImagesForPdf(withVideos);
}

/** Inline `<video>` for browser preview (auth cookies apply; render route redirects to signed URL). */
export function embedVideosForWebPlayer(editableHtml: string): string {
  const re = /<video\b[^>]*data-s3-key="([^"]+)"[^>]*>(?:[\s\S]*?<\/video>)?/gi;
  const matches = [...editableHtml.matchAll(re)];
  if (matches.length === 0) return editableHtml;

  let out = editableHtml;
  for (const m of matches) {
    const fullTag = m[0];
    const key = (m[1] || "").trim();
    if (!key || key.includes("..") || key.startsWith("/")) continue;

    const styleMatch = /style="([^"]*)"/i.exec(fullTag);
    const existingStyle = styleMatch?.[1]?.trim() ?? "";
    const baseStyle = [existingStyle, "max-width:100%", "height:auto", "display:block"].filter(Boolean).join(";");
    const src = `/api/sop/videos/render?key=${encodeURIComponent(key)}`;
    const replacement = `<video controls playsinline preload="metadata" style="${baseStyle}" src="${src}"></video>`;
    out = out.replace(fullTag, replacement);
  }
  return out;
}

export async function prepareEditableHtmlForWebPreview(editableHtml: string): Promise<string> {
  const withVideos = embedVideosForWebPlayer(editableHtml);
  return hydratePrivateImagesForPdf(withVideos);
}
