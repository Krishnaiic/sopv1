import {
  sanitizeEditableHtml,
  htmlToPlainText,
  type EditableSopContent,
} from "@/lib/sop-editable-content";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
}

function paragraphsToHtml(text: string): string {
  const normalized = normalizeText(text);
  if (!normalized) return "<p></p>";

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = escapeHtml(paragraph.trim()).replace(/\n/g, "<br />");
      return `<p>${html}</p>`;
    })
    .join("");
}

function markdownLinksToHtml(text: string): string {
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string, url: string) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  });
}

function pdfTextToHtml(text: string): string {
  const normalized = normalizeText(text);
  if (!normalized) return "<p></p>";

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = markdownLinksToHtml(escapeHtml(paragraph.trim())).replace(/\n/g, "<br />");
      return `<p>${html}</p>`;
    })
    .join("");
}

function buildPdfEditableHtml(params: { screenshots: { dataUrl: string; pageNumber: number }[]; text: string }): string {
  const pageImages = params.screenshots
    .map(
      (page) =>
        `<figure data-pdf-page="${page.pageNumber}" style="margin:0 0 24px;"><img src="${page.dataUrl}" alt="PDF page ${page.pageNumber}" style="display:block;width:100%;height:auto;border:1px solid #cbd5e1;border-radius:12px;" /></figure>`,
    )
    .join("");

  const editableText = pdfTextToHtml(params.text);

  return `
    <div data-source-format="pdf">
      <section data-pdf-preview="true">${pageImages}</section>
      <section data-pdf-text="true">${editableText}</section>
    </div>
  `;
}

export async function convertSopFileToEditableContent(params: {
  fileName: string;
  buffer: Buffer;
}): Promise<EditableSopContent> {
  const lower = params.fileName.toLowerCase();

  if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const [htmlResult, rawResult] = await Promise.all([
      mammoth.convertToHtml(
        { buffer: params.buffer },
        { convertImage: mammoth.images.dataUri },
      ),
      mammoth.extractRawText({ buffer: params.buffer }),
    ]);

    const editableHtml = sanitizeEditableHtml(htmlResult.value);
    const extractedText = normalizeText(rawResult.value || htmlToPlainText(editableHtml));

    return { editableHtml, extractedText, sourceFormat: "DOCX" };
  }

  if (lower.endsWith(".doc")) {
    const { default: WordExtractor } = await import("word-extractor");
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(params.buffer);
    const text = normalizeText(extracted.getBody());
    return {
      editableHtml: sanitizeEditableHtml(paragraphsToHtml(text)),
      extractedText: text,
      sourceFormat: "DOC",
    };
  }

  if (lower.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(params.buffer) });
    try {
      const [result, screenshots] = await Promise.all([
        parser.getText({ parseHyperlinks: true }),
        parser.getScreenshot({ scale: 1.2, imageDataUrl: true, imageBuffer: false }),
      ]);
      const text = normalizeText(result.text);
      return {
        editableHtml: sanitizeEditableHtml(
          buildPdfEditableHtml({
            screenshots: screenshots.pages.map((page) => ({ dataUrl: page.dataUrl, pageNumber: page.pageNumber })),
            text,
          }),
        ),
        extractedText: text,
        sourceFormat: "PDF",
      };
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Unsupported file format");
}
