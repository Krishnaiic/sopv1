"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toastSuccess } from "@/lib/app-toast";
import { ConfirmActionModal } from "@/components/admin/confirm-action-modal";
import { DownloadLink } from "@/components/download-link";
import type { SopFormData } from "./sop-form-content";
import type { ManagedSopLibraryItem } from "./sop-library-manager";
import { SopImageModal } from "./sop-image-modal";
import { SopPdfLikePreview } from "@/components/sop-pdf-like-preview";
import { SopVideoModal } from "./sop-video-modal";

type Props = {
  item: ManagedSopLibraryItem | null;
  mode: "view" | "edit" | null;
  onClose: () => void;
  /** e.g. `router.refresh` from the host page */
  onAfterSave?: () => void;
  /** Defaults true. Preview flow keeps modal open and blocks via overlay. */
  closeOnSave?: boolean;
};

export function SopLibraryViewEditModal({ item, mode, onClose, onAfterSave, closeOnSave = true }: Props) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [contentDepartmentName, setContentDepartmentName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [sections, setSections] = useState<{ id: string; title: string; bodyHtml: string }[]>([]);
  const [formData, setFormData] = useState<SopFormData | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [activeImageSectionId, setActiveImageSectionId] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideoSectionId, setActiveVideoSectionId] = useState<string | null>(null);
  const [pendingSectionRemovalId, setPendingSectionRemovalId] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<{
    el: HTMLImageElement | HTMLVideoElement;
    sectionId: string;
  } | null>(null);
  const [hoveredMedia, setHoveredMedia] = useState<{
    el: HTMLImageElement | HTMLVideoElement;
    sectionId: string;
  } | null>(null);
  const mediaToSectionIdRef = useRef(new WeakMap<Element, string>());
  const [mediaOverlay, setMediaOverlay] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const dragRef = useRef<{
    handle: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    aspect: number;
    unlocked: boolean;
  } | null>(null);

  const handleSize = 10;

  const overlayStyle = useMemo(() => {
    if (!mediaOverlay) return null;
    return {
      left: `${mediaOverlay.left}px`,
      top: `${mediaOverlay.top}px`,
      width: `${mediaOverlay.width}px`,
      height: `${mediaOverlay.height}px`,
    } as const;
  }, [mediaOverlay]);

  function updateOverlayForEl(el: HTMLImageElement | HTMLVideoElement | null) {
    if (!el) {
      setMediaOverlay(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    // Protect against detached nodes (e.g. section re-render).
    if (rect.width <= 0 || rect.height <= 0) {
      setMediaOverlay(null);
      return;
    }
    setMediaOverlay({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  useEffect(() => {
    if (mode !== "edit") {
      setSelectedMedia(null);
      setHoveredMedia(null);
      setMediaOverlay(null);
      return;
    }
    updateOverlayForEl((selectedMedia ?? hoveredMedia)?.el ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMedia, hoveredMedia, mode]);

  useEffect(() => {
    if (mode !== "edit") return;
    const onScrollOrResize = () => updateOverlayForEl((selectedMedia ?? hoveredMedia)?.el ?? null);
    const sc = scrollContainerRef.current;
    window.addEventListener("resize", onScrollOrResize);
    sc?.addEventListener("scroll", onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      sc?.removeEventListener("scroll", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedMedia, hoveredMedia]);

  useEffect(() => {
    if (mode !== "edit") return;

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const sel = selectedMedia;
      if (!d || !sel) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      // Corner handles: both width/height move.
      const signX = d.handle === "ne" || d.handle === "se" ? 1 : -1;
      const signY = d.handle === "sw" || d.handle === "se" ? 1 : -1;

      let nextW = Math.max(40, d.startW + dx * signX);
      let nextH = Math.max(40, d.startH + dy * signY);

      const keepRatio = !d.unlocked;
      if (keepRatio && d.aspect > 0) {
        // Use the dominant delta to avoid jumpiness.
        const byW = nextW / d.aspect;
        const byH = nextH * d.aspect;
        if (Math.abs(dx) >= Math.abs(dy)) {
          nextH = Math.max(40, byW);
        } else {
          nextW = Math.max(40, byH);
        }
      }

      sel.el.style.width = `${Math.round(nextW)}px`;
      sel.el.style.height = `${Math.round(nextH)}px`;
      updateOverlayForEl(sel.el);
    };

    const onPointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedMedia]);

  useEffect(() => {
    if (mode !== "edit") return;
    const sc = scrollContainerRef.current;
    if (!sc) return;

      const onMove = (e: PointerEvent) => {
      // While dragging, don't change hover/overlay.
      if (dragRef.current) return;
      if (selectedMedia) {
        updateOverlayForEl(selectedMedia.el);
        return;
      }

      const t = (e.target as HTMLElement | null)?.closest?.("img,video") as
        | HTMLImageElement
        | HTMLVideoElement
        | null;
      if (!t) {
        setHoveredMedia(null);
        setMediaOverlay(null);
        return;
      }
      const sid = mediaToSectionIdRef.current.get(t) ?? "";
      setHoveredMedia((prev) => (prev?.el === t ? prev : { el: t, sectionId: sid }));
      updateOverlayForEl(t);
    };

    sc.addEventListener("pointermove", onMove, { passive: true });
    return () => sc.removeEventListener("pointermove", onMove);
  }, [mode, selectedMedia]);

  function startResize(handle: "nw" | "ne" | "sw" | "se", e: React.PointerEvent) {
    if (mode !== "edit") return;
    // Allow resize from hover without extra click.
    if (!selectedMedia && hoveredMedia) setSelectedMedia(hoveredMedia);
    const active = selectedMedia ?? hoveredMedia;
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = active.el.getBoundingClientRect();
    const aspect = rect.height > 0 ? rect.width / rect.height : 0;
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      aspect,
      // Hold Alt to unlock aspect ratio during drag
      unlocked: e.altKey,
    };
    // Ensure we keep receiving move events even if cursor leaves handle.
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function removeSelectedMedia() {
    if (mode !== "edit" || !selectedMedia) return;
    const { el, sectionId } = selectedMedia;
    const sectionNode = sectionRefs.current[sectionId];
    try {
      el.remove();
    } catch {
      // ignore
    }
    setSelectedMedia(null);
    setMediaOverlay(null);
    if (sectionNode) {
      const html = sectionNode.innerHTML ?? "";
      setSections((current) =>
        current.map((s) => (s.id === sectionId ? { ...s, bodyHtml: html } : s)),
      );
    }
  }

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setVersion(item.versionLabel);
    setEffectiveDate(item.effectiveDate);
    setContentDepartmentName(item.contentDepartmentName);
    setPreparedBy(item.preparedBy);
    setApprovedBy(item.approvedBy);
    setSections(item.sections);
    setFormData(item.formData);
    setError(null);
  }, [item]);

  useEffect(() => {
    if (!item || mode !== "edit") return;
    for (const section of item.sections) {
      const node = sectionRefs.current[section.id];
      if (node) node.innerHTML = section.bodyHtml;
    }
  }, [item, mode]);

  // In edit mode, do NOT let React re-apply `dangerouslySetInnerHTML` on each re-render,
  // otherwise DOM nodes (img/video) get replaced and selection/resize state is lost.
  useEffect(() => {
    if (mode !== "edit") return;
    for (const section of sections) {
      const node = sectionRefs.current[section.id];
      if (!node) continue;
      if (!node.innerHTML.trim()) {
        node.innerHTML = section.bodyHtml;
      }
    }
  }, [mode, sections]);

  useEffect(() => {
    if (mode !== "edit") return;
    // Clicking outside media clears selection.
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('[data-resize-handle="true"]')) return;
      if (t.closest('[data-media-remove="true"]')) return;
      if (t.closest("img,video")) return;
      setSelectedMedia(null);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [mode]);

  async function handleSave() {
    if (!item) return;
    setBusy(true);
    setError(null);

    const nextSections = sections.map((section) => ({
      ...section,
      bodyHtml: sectionRefs.current[section.id]?.innerHTML ?? section.bodyHtml,
    }));

    const res = await fetch("/api/sop/library-items/save-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        title,
        effectiveDate,
        contentDepartmentName,
        preparedBy,
        approvedBy,
        sections: nextSections,
        formData,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } };
    if (!res.ok || data.success === false) {
      setError(data.error?.message ?? "Failed to save SOP.");
      setBusy(false);
      return;
    }

    toastSuccess("SOP changes saved.");
    onAfterSave?.();
    setBusy(false);
    if (closeOnSave) onClose();
  }

  function addSection() {
    setSections((current) => [
      ...current,
      {
        id: `section-${Date.now()}`,
        title: `Section ${current.length + 1}`,
        bodyHtml: "<p></p>",
      },
    ]);
  }

  function removeSection(id: string) {
    setPendingSectionRemovalId(id);
  }

  function confirmRemoveSection() {
    if (!pendingSectionRemovalId) return;
    const id = pendingSectionRemovalId;
    setPendingSectionRemovalId(null);
    setSections((current) => current.filter((section) => section.id !== id));
  }

  function insertImage(sectionId: string) {
    setActiveImageSectionId(sectionId);
    setImageModalOpen(true);
  }

  function insertVideo(sectionId: string) {
    setActiveVideoSectionId(sectionId);
    setVideoModalOpen(true);
  }

  if (!item || !mode) return null;

  return (
    <div
      className={
        mode === "view"
          ? "fixed inset-0 z-[70] flex items-center justify-center overflow-x-hidden bg-black/50 p-0 md:p-4"
          : "fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      }
      role="dialog"
      aria-modal="true"
    >
      <SopImageModal
        open={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setActiveImageSectionId(null);
        }}
        onInsert={({ html }) => {
          const sectionId = activeImageSectionId;
          if (!sectionId) return;
          const node = sectionRefs.current[sectionId];
          // Always update React state so the image appears immediately.
          setSections((current) =>
            current.map((section) =>
              section.id === sectionId ? { ...section, bodyHtml: `${section.bodyHtml}${html}` } : section,
            ),
          );
          // Also insert into the live contentEditable DOM (so saving via ref gets it too).
          if (node && typeof window !== "undefined") {
            node.focus();
            try {
              document.execCommand("insertHTML", false, html);
            } catch {
              node.innerHTML = `${node.innerHTML}${html}`;
            }
          }
        }}
      />
      <SopVideoModal
        open={videoModalOpen}
        onClose={() => {
          setVideoModalOpen(false);
          setActiveVideoSectionId(null);
        }}
        onInsert={({ html }) => {
          const sectionId = activeVideoSectionId;
          if (!sectionId) return;
          const node = sectionRefs.current[sectionId];
          setSections((current) =>
            current.map((section) =>
              section.id === sectionId ? { ...section, bodyHtml: `${section.bodyHtml}${html}` } : section,
            ),
          );
          if (node && typeof window !== "undefined") {
            node.focus();
            try {
              document.execCommand("insertHTML", false, html);
            } catch {
              node.innerHTML = `${node.innerHTML}${html}`;
            }
          }
        }}
      />
      <ConfirmActionModal
        open={pendingSectionRemovalId !== null}
        title="Remove section"
        message="This section will be removed from the SOP editor. You can still cancel if this was clicked by mistake."
        confirmLabel="Remove section"
        cancelLabel="Keep section"
        variant="danger"
        onConfirm={confirmRemoveSection}
        onCancel={() => setPendingSectionRemovalId(null)}
      />
      <div
        ref={scrollContainerRef}
        className={
          mode === "view"
            ? "max-h-[92vh] w-full max-w-none min-w-0 overflow-y-auto rounded-none border-0 bg-white shadow-xl md:w-3/4 md:max-w-[75vw] md:rounded-3xl md:border md:border-slate-200"
            : "max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-xl"
        }
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">SOP Management</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{item.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {mode === "edit" && (selectedMedia || hoveredMedia) && mediaOverlay && overlayStyle ? (
            <div
              className="pointer-events-none fixed z-[90]"
              style={overlayStyle}
              aria-hidden
            >
              <div className="absolute inset-0 rounded-md ring-2 ring-blue-500/70" />

              {selectedMedia ? (
                <div className="pointer-events-auto absolute -top-3 -right-3 flex items-center gap-2">
                <button
                  type="button"
                  data-media-remove="true"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeSelectedMedia();
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100"
                  title="Remove"
                  aria-label="Remove media"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              ) : null}

              {(["nw", "ne", "sw", "se"] as const).map((h) => {
                const pos =
                  h === "nw"
                    ? { left: -handleSize / 2, top: -handleSize / 2 }
                    : h === "ne"
                      ? { right: -handleSize / 2, top: -handleSize / 2 }
                      : h === "sw"
                        ? { left: -handleSize / 2, bottom: -handleSize / 2 }
                        : { right: -handleSize / 2, bottom: -handleSize / 2 };
                return (
                  <button
                    key={h}
                    type="button"
                    data-resize-handle="true"
                    onPointerDown={(e) => startResize(h, e)}
                    className="pointer-events-auto absolute rounded-sm border border-blue-600 bg-white shadow"
                    style={{
                      width: handleSize,
                      height: handleSize,
                      cursor:
                        h === "nw" || h === "se"
                          ? "nwse-resize"
                          : "nesw-resize",
                      ...pos,
                    }}
                  />
                );
              })}
              <div className="absolute -bottom-6 left-0 text-[11px] font-medium text-slate-700">
                Drag corners to resize (hold Alt to unlock ratio)
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {mode === "view" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <DownloadLink
                  href={`/api/documents/${encodeURIComponent(item.id)}/download-pdf`}
                  className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Download PDF
                </DownloadLink>
                {item.sourceFileUrl ? (
                  <DownloadLink
                    href={`/api/documents/${encodeURIComponent(item.id)}/download-original${
                      item.downloadVersionId ? `?versionId=${encodeURIComponent(item.downloadVersionId)}` : ""
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Download Original
                  </DownloadLink>
                ) : null}
              </div>

              <SopPdfLikePreview documentId={item.id} versionId={item.downloadVersionId ?? null} />

              <div className="grid gap-4 border-t border-slate-200 pt-6 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="font-medium text-slate-900">Source file</p>
                  <p className="mt-2 break-all text-slate-600">{item.sourceFileName}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{item.sourceFormat}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="font-medium text-slate-900">Assignment</p>
                  <p className="mt-2 text-slate-600">{item.departmentName}</p>
                  <p className="mt-1 text-slate-600">{item.subDepartmentName || "Department level"}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Document Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Version</label>
                    <p className="mt-1 font-medium text-slate-700">{version}</p>
                    <p className="mt-1 text-xs text-slate-500">Version will be updated automatically when republished</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Effective Date</label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department</label>
                    <input
                      value={contentDepartmentName}
                      onChange={(e) => setContentDepartmentName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prepared By</label>
                    <input
                      value={preparedBy}
                      onChange={(e) => setPreparedBy(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved By</label>
                    <input
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Editable SOP Sections</p>
                    <button
                      type="button"
                      onClick={addSection}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Add Section
                    </button>
                  </div>

                  {sections
                    .filter((s) => (formData ? s.title !== "Document Details" : true))
                    .map((section, index) => (
                      <div key={section.id} className="rounded-2xl border border-slate-300 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <input
                            value={section.title}
                            onChange={(e) =>
                              setSections((current) =>
                                current.map((row) =>
                                  row.id === section.id ? { ...row, title: e.target.value } : row,
                                ),
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-500"
                            placeholder={`Section ${index + 1}`}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => insertImage(section.id)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Add Image
                            </button>
                            <button
                              type="button"
                              onClick={() => insertVideo(section.id)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Add Video
                            </button>
                            {sections.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeSection(section.id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div
                          ref={(node) => {
                            sectionRefs.current[section.id] = node;
                          }}
                          contentEditable
                          suppressContentEditableWarning
                          className="min-h-[12rem] rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-800 outline-none focus:border-slate-500"
                          onClick={(e) => {
                            const t = e.target as HTMLElement | null;
                            const el = (t?.closest("img,video") as HTMLImageElement | HTMLVideoElement | null) ?? null;
                            if (!el) return;
                            mediaToSectionIdRef.current.set(el, section.id);
                            setSelectedMedia({ el, sectionId: section.id });
                            setHoveredMedia(null);
                            if (!el.style.width && el instanceof HTMLImageElement) {
                              el.style.width = `${Math.round(el.getBoundingClientRect().width)}px`;
                            }
                            if (!el.style.height) {
                              el.style.height = `${Math.round(el.getBoundingClientRect().height)}px`;
                            }
                            updateOverlayForEl(el);
                          }}
                        />
                      </div>
                    ))}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">Source File</p>
                    <p className="mt-2 break-all text-slate-600">{item.sourceFileName}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{item.sourceFormat}</p>
                    {item.sourceFileUrl ? (
                      <DownloadLink
                        href={`/api/documents/${encodeURIComponent(item.id)}/download-original${
                          item.downloadVersionId ? `?versionId=${encodeURIComponent(item.downloadVersionId)}` : ""
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Download Original
                      </DownloadLink>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">Current Assignment</p>
                    <p className="mt-2 text-slate-600">{item.departmentName}</p>
                    <p className="mt-1 text-slate-600">{item.subDepartmentName || "Department level"}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      Edits create a new draft revision and require publish again.
                    </p>
                  </div>
                </aside>
              </div>

              <div className="mt-8 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSave()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Save Revision"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
