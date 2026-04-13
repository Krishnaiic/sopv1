"use client";

import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (params: { html: string }) => void;
};

function buildVideoHtml(params: { src: string; s3Key?: string; origin: "s3" | "url"; widthPct: number }) {
  const safeWidth = Number.isFinite(params.widthPct) ? Math.min(Math.max(params.widthPct, 10), 100) : 100;
  const attrs: string[] = [
    `src="${params.src.replace(/"/g, "&quot;")}"`,
    `controls`,
    `preload="metadata"`,
    `style="display:block;width:${safeWidth}%;max-width:100%;height:auto;margin:12px 0;"`,
    `data-video-origin="${params.origin}"`,
  ];
  if (params.s3Key) attrs.push(`data-s3-key="${params.s3Key.replace(/"/g, "&quot;")}"`);
  return `<video ${attrs.join(" ")}></video>`;
}

export function SopVideoModal({ open, onClose, onInsert }: Props) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const widthPct = 100;

  const canInsert = useMemo(() => {
    if (busy) return false;
    if (tab === "url") return Boolean(videoUrl.trim());
    return Boolean(file);
  }, [busy, tab, videoUrl, file]);

  async function handleInsert() {
    setError(null);
    if (!canInsert) return;

    if (tab === "url") {
      const src = videoUrl.trim();
      const html = buildVideoHtml({ src, origin: "url", widthPct });
      onInsert({ html });
      onClose();
      return;
    }

    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/sop/videos/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as
        | { success: true; data: { key: string } }
        | { success: false; error: { message?: string } };
      if (!res.ok || (data as any).success === false) {
        setError((data as any).error?.message ?? "Failed to upload video.");
        setBusy(false);
        return;
      }
      const key = (data as any).data?.key as string;
      const src = `/api/sop/videos/render?key=${encodeURIComponent(key)}`;
      const html = buildVideoHtml({ src, s3Key: key, origin: "s3", widthPct });
      onInsert({ html });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-teal-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/70">SOP Editor</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Add video</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose how you want to place a video into this section.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "upload"
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
                  : "text-slate-700 hover:bg-white/80"
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setTab("url")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "url"
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
                  : "text-slate-700 hover:bg-white/80"
              }`}
            >
              Video URL
            </button>
          </div>

          {tab === "upload" ? (
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50/80 to-white p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12-3.5-3.5M12 16l3.5-3.5M4.75 15.75v1.5A1.75 1.75 0 006.5 19h11a1.75 1.75 0 001.75-1.75v-1.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Upload from device</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Pick a video file and insert it after upload.
                  </p>
                </div>
              </div>

              <label className="block rounded-2xl border border-dashed border-sky-200 bg-white px-4 py-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-700"
                />
                <p className="mt-3 text-xs text-slate-500">Uploaded privately and rendered securely.</p>
              </label>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50/80 to-white p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm ring-1 ring-teal-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5 21 3m0 0h-5.25M21 3v5.25M10.5 13.5 3 21m0 0v-5.25M3 21h5.25" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Use a video URL</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Paste a direct video link to place it into the section.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Video URL</label>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
                />
                <p className="mt-3 text-xs text-slate-500">Use a direct video file URL (mp4/webm/ogg).</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canInsert}
            onClick={() => void handleInsert()}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Insert"}
          </button>
        </div>
      </div>
    </div>
  );
}

