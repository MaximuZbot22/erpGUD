/**
 * Universal Bulletproof Document Export & Isolated Print Utility
 * Prevents A4 cropping, background leakage, and modal clipping.
 */

export interface PdfExportOptions {
  fileName?: string;
  padding?: string;
  quality?: number;
  scale?: number;
}

/**
 * Downloads a DOM element as an uncropped, perfectly scaled A4 PDF using html2pdf.js
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    fileName = `document_${Date.now()}.pdf`,
    padding = '28px',
    quality = 0.98,
    scale = 1.75
  } = options;

  let tempContainer: HTMLDivElement | null = null;
  let blobUrl: string | null = null;

  try {
    const html2pdf = (await import('html2pdf.js')).default;

    // Create isolated, unconstrained off-screen wrapper node (794px = A4 standard at 96 DPI)
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '794px';
    clone.style.maxWidth = '794px';
    clone.style.margin = '0';
    clone.style.boxSizing = 'border-box';
    clone.style.background = '#ffffff';
    clone.style.color = '#0f172a';
    clone.style.padding = padding;
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.borderRadius = '0';

    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0px';
    tempContainer.style.width = '794px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.color = '#000000';
    tempContainer.style.zIndex = '-99999';
    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number], // 8mm margins
      filename: cleanFileName,
      image: { type: 'jpeg' as const, quality },
      html2canvas: { scale, useCORS: true, logging: false, windowWidth: 800 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    // Generate direct binary Blob without unneeded base64 string allocations
    const worker = html2pdf().set(opt as any).from(clone);
    const pdfBlob: Blob = await worker.output('blob');

    // Trigger native file download via temporary Object URL
    blobUrl = URL.createObjectURL(pdfBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = cleanFileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  } finally {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    if (tempContainer && document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}

/**
 * Isolates document into clean print container before calling window.print()
 * Prevents sidebars, dark mode background, and layout cropping from showing in print/PDF
 */
export function printIsolatedElement(
  element: HTMLElement,
  mountId = 'gud-print-mount',
  activeClass = 'printing-doc-active'
): void {
  let printMount = document.getElementById(mountId);
  if (!printMount) {
    printMount = document.createElement('div');
    printMount.id = mountId;
    document.body.appendChild(printMount);
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.margin = '0 auto';

  printMount.innerHTML = '';
  printMount.appendChild(clone);

  document.body.classList.add(activeClass);

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove(activeClass);
      if (printMount && document.body.contains(printMount)) {
        document.body.removeChild(printMount);
      }
    }, 500);
  }, 100);
}
