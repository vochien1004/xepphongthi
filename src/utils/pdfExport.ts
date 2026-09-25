import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface PdfExportOptions {
  orientation?: 'portrait' | 'landscape';
  margin?: [number, number, number, number]; // [top, right, bottom, left] in mm
  filename?: string;
  onProgress?: (current: number, total: number, statusText: string) => void;
}

/**
 * High-quality client-side PDF export supporting modern CSS (oklch, color-mix),
 * multi-page documents, administrative layouts, and custom fonts.
 */
export async function exportHtmlToPdf(
  element: HTMLElement,
  filename: string,
  options?: PdfExportOptions
): Promise<void> {
  if (!element) {
    throw new Error('Không tìm thấy phần tử HTML để xuất PDF.');
  }

  // Ensure all fonts are fully loaded before capturing canvas
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font loading error and proceed
    }
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const orientation = options?.orientation || 'portrait';
  const isPortrait = orientation === 'portrait';

  // Standard A4 dimensions in mm
  const pageWidth = isPortrait ? 210 : 297;
  const pageHeight = isPortrait ? 297 : 210;

  // Margin in mm: [top, right, bottom, left] -> Default 1.5 cm (15 mm) left/right margins
  const [marginTop, marginRight, marginBottom, marginLeft] =
    options?.margin || [10, 15, 10, 15];

  const availWidth = pageWidth - marginLeft - marginRight;
  const availHeight = pageHeight - marginTop - marginBottom;

  // Find all distinct print pages inside the container
  const childPages = Array.from(element.querySelectorAll<HTMLElement>('.print-page'));
  const pages: HTMLElement[] =
    childPages.length > 0
      ? childPages
      : element.classList.contains('print-page')
      ? [element]
      : [element];

  const totalPages = pages.length;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < totalPages; i++) {
    const pageEl = pages[i];

    if (options?.onProgress) {
      options.onProgress(i + 1, totalPages, `Đang xử lý trang ${i + 1}/${totalPages}...`);
    }

    // Render each page individually using html2canvas-pro
    const canvas = await html2canvas(pageEl, {
      scale: 2, // High resolution ~200-300 DPI
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      onclone: (clonedDoc, clonedTarget) => {
        // Inject explicit CSS rules directly into cloned document head to ensure borders and layouts render reliably in production builds
        const injectedStyle = clonedDoc.createElement('style');
        injectedStyle.innerHTML = `
          * {
            box-sizing: border-box !important;
          }
          .font-admin {
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
          }
          .print-page {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          table.admin-header-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: none !important;
            margin-bottom: 12px !important;
          }
          table.admin-header-table td {
            border: none !important;
            padding: 0 !important;
            vertical-align: top !important;
            text-align: center !important;
          }
          table.admin-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #000000 !important;
            table-layout: fixed !important;
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }
          table.admin-table th {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
            font-size: 16px !important;
            font-weight: bold !important;
            line-height: 1.25 !important;
            vertical-align: middle !important;
            font-stretch: normal !important;
            padding: 5px 6px !important;
            background-color: #f8fafc !important;
          }
          table.admin-table td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
            font-size: 16px !important;
            line-height: 1.25 !important;
            vertical-align: middle !important;
            font-stretch: normal !important;
            padding: 5px 6px !important;
          }
        `;
        clonedDoc.head.appendChild(injectedStyle);

        // Enforce DOM element inline style properties directly on cloned nodes for 100% reliability in production builds
        const allClonedTables = clonedDoc.querySelectorAll<HTMLTableElement>('table');
        allClonedTables.forEach((tbl) => {
          if (tbl.classList.contains('admin-header-table') || tbl.classList.contains('admin-signature-table')) {
            tbl.style.width = '100%';
            tbl.style.borderCollapse = 'collapse';
            tbl.style.border = 'none';
            tbl.querySelectorAll<HTMLTableCellElement>('td, th').forEach((c) => {
              c.style.border = 'none';
              c.style.padding = '0';
            });
          } else {
            tbl.style.width = '100%';
            tbl.style.borderCollapse = 'collapse';
            tbl.style.tableLayout = 'fixed';
            tbl.style.border = '1px solid #000000';
            tbl.style.fontFamily = "'Times New Roman', Tinos, Times, serif";
            tbl.style.color = '#000000';

            tbl.querySelectorAll<HTMLTableCellElement>('th').forEach((th) => {
              th.style.border = '1px solid #000000';
              th.style.padding = '5px 6px';
              th.style.fontWeight = 'bold';
              th.style.fontSize = '16px';
              th.style.lineHeight = '1.25';
              th.style.verticalAlign = 'middle';
              th.style.fontStretch = 'normal';
              th.style.backgroundColor = '#f8fafc';
              th.style.color = '#000000';
              th.style.boxSizing = 'border-box';
            });

            tbl.querySelectorAll<HTMLTableCellElement>('td').forEach((td) => {
              td.style.border = '1px solid #000000';
              td.style.padding = '5px 6px';
              td.style.fontSize = '16px';
              td.style.lineHeight = '1.25';
              td.style.verticalAlign = 'middle';
              td.style.fontStretch = 'normal';
              td.style.color = '#000000';
              td.style.boxSizing = 'border-box';
            });
          }
        });

        // Hide no-print elements in the cloned DOM
        const noPrintElements = clonedDoc.querySelectorAll('.no-print');
        noPrintElements.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });

        // Strip screen-preview decorative borders, shadows, and double padding from cloned pages
        const clonedPages = clonedDoc.querySelectorAll<HTMLElement>('.print-page');
        clonedPages.forEach((p) => {
          p.style.boxShadow = 'none';
          p.style.border = 'none';
          p.style.margin = '0';
          p.style.borderRadius = '0';
          p.style.backgroundColor = '#ffffff';
          p.style.padding = '0'; // Remove inner DOM padding so content expands 100% to fill PDF printable width
          p.style.width = '100%';
          p.style.maxWidth = 'none';
        });

        if (clonedTarget instanceof HTMLElement) {
          clonedTarget.style.boxShadow = 'none';
          clonedTarget.style.border = 'none';
          clonedTarget.style.margin = '0 auto';
          clonedTarget.style.borderRadius = '0';
          clonedTarget.style.backgroundColor = '#ffffff';
        }
      },
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    if (canvasWidth === 0 || canvasHeight === 0) {
      continue;
    }

    const canvasAspect = canvasHeight / canvasWidth;

    // Fill the exact printable width (180mm = 1.5cm left/right margins on A4)
    const imgWidth = availWidth;
    let imgHeight = availWidth * canvasAspect;
    const posX = marginLeft; // 15mm (1.5 cm)
    let posY = marginTop;    // 10mm

    // Ensure content stays within page height if slightly longer
    if (imgHeight > availHeight) {
      imgHeight = availHeight;
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage([pageWidth, pageHeight], orientation);
    }

    pdf.addImage(imgData, 'JPEG', posX, posY, imgWidth, imgHeight, undefined, 'FAST');
  }

  // Trigger download with browser compatibility fallback
  try {
    pdf.save(cleanFilename);
  } catch (saveError) {
    console.warn('pdf.save failed, executing blob fallback:', saveError);
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1500);
  }
}
