import puppeteer from "puppeteer";
import { buildSopPdfFullHtmlForPrint } from "@/lib/sop-pdf-document-html";

const SOP_LOGO_URL =
  "https://lakshyamailerimages.s3.ap-south-1.amazonaws.com/BLUE.png";

let logoDataUriPromise: Promise<string | null> | null = null;

async function getLogoDataUri(): Promise<string | null> {
  if (logoDataUriPromise) return logoDataUriPromise;
  logoDataUriPromise = (async () => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(SOP_LOGO_URL, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const b64 = Buffer.from(arr).toString("base64");
      return `data:image/png;base64,${b64}`;
    } catch {
      return null;
    }
  })();
  return logoDataUriPromise;
}

export async function renderSopPdf(params: {
  title: string;
  version: string;
  effectiveDate: string;
  departmentLabel: string;
  editableHtml: string;
}): Promise<Buffer> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined;
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(buildSopPdfFullHtmlForPrint(params), { waitUntil: "networkidle0" });
    const logoSrc = (await getLogoDataUri()) ?? "";
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%; padding:0 53px; margin-top:0; font-family:'Segoe UI', Arial, sans-serif;">
          <div style="width:100%; display:flex; justify-content:flex-end; align-items:flex-start;">
            ${logoSrc ? `<img src="${logoSrc}" style="height:50px; width:auto; display:block;" />` : ""}
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%; font-family:'Segoe UI', Arial, sans-serif; font-size:10px; color:#64748b; padding:0 53px;">
          <div style="width:100%; text-align:right;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        </div>
      `,
      margin: {
        top: "32mm",
        right: "14mm",
        bottom: "22mm",
        left: "14mm",
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
