"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SopLibraryViewEditModal } from "../../sop-library-view-edit-modal";
import type { ManagedSopLibraryItem } from "../../sop-library-manager";

export function SopUploadPreviewClient({ item }: { item: ManagedSopLibraryItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  return (
    <>
      <SopLibraryViewEditModal
        item={open ? item : null}
        mode={open ? "edit" : null}
        closeOnSave={false}
        onClose={() => {
          if (redirecting) return;
          setOpen(false);
          router.push("/admin/sop");
          router.refresh();
        }}
        onAfterSave={() => {
          setRedirecting(true);
          router.push("/admin/sop");
          router.refresh();
        }}
      />
      {redirecting ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-lg flex items-center gap-3">
            <svg className="h-6 w-6 animate-spin text-slate-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-900">Saving…</p>
              <p className="text-xs text-slate-500">Redirecting to SOP Library</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

