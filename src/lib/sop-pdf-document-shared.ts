/**
 * PDF preview / print styling constants only — no server-only imports.
 * Client components must import from this file, not from `sop-pdf-document-html.ts`
 * (which pulls `sanitizeEditableHtml` → `sop-editable-content` → Node `fs` deps).
 */

export const SOP_PDF_LOGO_URL =
  "https://lakshyamailerimages.s3.ap-south-1.amazonaws.com/BLUE.png";

/** CSS for the in-document body (Puppeteer page). */
export const SOP_PDF_DOCUMENT_STYLES = `
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    font-size: 12px;
    line-height: 1.65;
  }
  .watermark {
    position: fixed;
    top: 32mm;
    bottom: 22mm;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(-45deg);
    transform-origin: center;
    font-size: 110px;
    font-weight: 700;
    letter-spacing: 6px;
    color: rgba(15, 23, 42, 0.085);
    z-index: 4;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
  }
  .doc {
    position: relative;
    z-index: 2;
  }
  header {
    border-bottom: 1px solid #cbd5e1;
    margin-bottom: 18px;
    padding-bottom: 12px;
  }
  h1 {
    margin: 0 0 6px 0;
    font-size: 24px;
  }
  .meta {
    color: #475569;
    font-size: 11px;
  }
  .content p { margin: 0 0 12px; }
  .content h1, .content h2, .content h3, .content h4 {
    margin: 18px 0 8px;
    line-height: 1.3;
  }
  .content table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
  }
  .content th, .content td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    vertical-align: top;
  }
  .content ul, .content ol { padding-left: 20px; }
  .content blockquote {
    margin: 14px 0;
    padding-left: 12px;
    border-left: 3px solid #94a3b8;
    color: #334155;
  }
`;

/** Browser preview (modal): A4 sheets, same outer margins as PDF export. */
export const SOP_PDF_WEB_PREVIEW_STYLES = `
  .sop-pdf-web-preview-root {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.65;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 8px 0 24px;
  }
  .sop-a4-sheet {
    position: relative;
    box-sizing: border-box;
    width: 210mm;
    min-height: 297mm;
    padding: 32mm 14mm 22mm 14mm;
    margin: 0 auto;
    background: #fff;
    box-shadow: 0 4px 24px rgba(15, 23, 42, 0.12);
    overflow: visible;
  }
  .sop-a4-sheet .sop-a4-watermark {
    position: absolute;
    top: 32mm;
    bottom: 22mm;
    left: 14mm;
    right: 14mm;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(-45deg);
    transform-origin: center;
    font-size: clamp(48px, 14vw, 110px);
    font-weight: 700;
    letter-spacing: 6px;
    color: rgba(15, 23, 42, 0.085);
    z-index: 1;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
  }
  .sop-a4-sheet-inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    min-height: calc(297mm - 32mm - 22mm);
  }
  .sop-pdf-preview-logo-row {
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    flex-shrink: 0;
    margin: -8px 0 10px 0;
  }
  .sop-pdf-preview-logo-row img {
    height: 50px;
    width: auto;
    display: block;
  }
  .sop-a4-doc-header {
    flex-shrink: 0;
    border-bottom: 1px solid #cbd5e1;
    margin-bottom: 18px;
    padding-bottom: 12px;
  }
  .sop-a4-doc-header h1 {
    margin: 0 0 6px 0;
    font-size: 24px;
  }
  .sop-a4-doc-header .meta {
    color: #475569;
    font-size: 11px;
  }
  .sop-a4-sheet .content {
    flex: 1 1 auto;
    min-width: 0;
  }
  .sop-a4-sheet .content p { margin: 0 0 12px; }
  .sop-a4-sheet .content h1,
  .sop-a4-sheet .content h2,
  .sop-a4-sheet .content h3,
  .sop-a4-sheet .content h4 {
    margin: 18px 0 8px;
    line-height: 1.3;
  }
  .sop-a4-sheet .content table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
  }
  .sop-a4-sheet .content th,
  .sop-a4-sheet .content td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    vertical-align: top;
  }
  .sop-a4-sheet .content ul,
  .sop-a4-sheet .content ol { padding-left: 20px; }
  .sop-a4-sheet .content blockquote {
    margin: 14px 0;
    padding-left: 12px;
    border-left: 3px solid #94a3b8;
    color: #334155;
  }
  .sop-a4-sheet .content img,
  .sop-a4-sheet .content video {
    max-width: 100%;
    height: auto;
  }
  .sop-a4-page-footer {
    flex-shrink: 0;
    margin-top: 12px;
    padding-top: 8px;
    text-align: right;
    font-size: 10px;
    color: #64748b;
  }
`;
