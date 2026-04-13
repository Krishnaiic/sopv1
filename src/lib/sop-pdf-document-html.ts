import { sanitizeEditableHtml } from "@/lib/sop-editable-content";
import { SOP_PDF_DOCUMENT_STYLES } from "@/lib/sop-pdf-document-shared";

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSopPdfFullHtmlForPrint(params: {
  title: string;
  version: string;
  effectiveDate: string;
  departmentLabel: string;
  editableHtml: string;
}): string {
  const t = escapeHtmlAttr(params.title);
  const v = escapeHtmlAttr(params.version);
  const ed = escapeHtmlAttr(params.effectiveDate || "-");
  const dl = escapeHtmlAttr(params.departmentLabel);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${t}</title>
    <style>
      @page { size: A4; margin: 32mm 14mm 22mm 14mm; }
      ${SOP_PDF_DOCUMENT_STYLES}
    </style>
  </head>
  <body>
    <div class="watermark">Lakshya</div>
    <div class="doc">
      <header>
        <h1>${t}</h1>
        <div class="meta">
          Version: ${v} |
          Effective date: ${ed} |
          Department: ${dl}
        </div>
      </header>
      <main class="content">${sanitizeEditableHtml(params.editableHtml)}</main>
    </div>
  </body>
</html>`;
}
