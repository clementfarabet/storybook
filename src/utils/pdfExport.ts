import { jsPDF } from 'jspdf';
import { StoryBook } from '../types';

export interface PdfExportOptions {
  format?: 'square' | 'portrait';
  authorName?: string;
  includeCover?: boolean;
  includeBackCover?: boolean;
}

export interface PreparedPdfImage {
  data: string;
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Normalizes Unicode characters (curly quotes, em-dashes, non-breaking spaces)
 * and strips non-Latin-1 emojis that cause jsPDF WinAnsi encoding crashes.
 */
export function sanitizePdfText(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
    // Remove emojis and surrogate pairs outside Latin-1
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .trim();
}

/**
 * Safely extracts natural image dimensions and prepares image data for jsPDF.
 * - Extracts naturalWidth and naturalHeight so the image aspect ratio is never distorted.
 * - Direct base64 JPEG and PNG data URLs are used directly with zero re-compression loss.
 * - SVGs and canvas fallbacks are rasterized at high print resolution (2048px) with high smoothing.
 */
async function preparePdfImage(src: string | undefined | null): Promise<PreparedPdfImage | null> {
  if (!src || typeof src !== 'string' || !src.trim()) return null;

  // Node.js or non-browser fallback check
  if (typeof Image === 'undefined') {
    const isJpeg = src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg');
    return {
      data: src,
      format: isJpeg ? 'JPEG' : 'PNG',
      width: 1024,
      height: 1024,
      aspectRatio: 1,
    };
  }

  return new Promise((resolve) => {
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
          resolve({ data: src, format: 'JPEG', width: 1024, height: 1024, aspectRatio: 1 });
        } else if (src.startsWith('data:image/png')) {
          resolve({ data: src, format: 'PNG', width: 1024, height: 1024, aspectRatio: 1 });
        } else {
          resolve(null);
        }
      }
    }, 3000);

    try {
      const img = new Image();
      if (!src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);

        const width = img.naturalWidth || 1024;
        const height = img.naturalHeight || 1024;
        const aspectRatio = width / (height || 1);

        // 1. Direct Base64 JPEGs (Full original fidelity from Gemini)
        if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
          resolve({ data: src, format: 'JPEG', width, height, aspectRatio });
          return;
        }

        // 2. Direct Base64 PNGs (Full original fidelity from Gemini)
        if (src.startsWith('data:image/png')) {
          resolve({ data: src, format: 'PNG', width, height, aspectRatio });
          return;
        }

        // 3. Fallback / SVG rasterization at high print resolution (up to 2048px)
        try {
          const maxDim = 2048;
          let canvasW = width;
          let canvasH = height;
          if (canvasW > maxDim || canvasH > maxDim) {
            if (canvasW > canvasH) {
              canvasH = Math.round((canvasH * maxDim) / canvasW);
              canvasW = maxDim;
            } else {
              canvasW = Math.round((canvasW * maxDim) / canvasH);
              canvasH = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(canvasW, 1200);
          canvas.height = Math.max(canvasH, Math.round(1200 / aspectRatio));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#fbfaf7';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngData = canvas.toDataURL('image/png', 0.98);
          resolve({ data: pngData, format: 'PNG', width, height, aspectRatio });
        } catch (_) {
          resolve(null);
        }
      };

      img.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        resolve(null);
      };

      img.src = src;
    } catch (_) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

export async function exportStoryBookToPdf(
  book: StoryBook,
  options: PdfExportOptions = {}
): Promise<Blob> {
  const {
    format = 'square',
    authorName = book.author || 'Young Storyteller',
    includeCover = true,
    includeBackCover = true,
  } = options;

  // Square format: 210mm x 210mm (classic picture book) or Letter portrait: 215.9mm x 279.4mm
  const isSquare = format === 'square';
  const pageWidth = isSquare ? 210 : 215.9;
  const pageHeight = isSquare ? 210 : 279.4;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isSquare ? [pageWidth, pageHeight] : 'letter',
  });

  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const cleanBookTitle = sanitizePdfText(book.title || 'My Magical Story');
  const cleanAuthorName = sanitizePdfText(authorName);

  // --------------------------------------------------------------------------
  // 1. FRONT COVER
  // --------------------------------------------------------------------------
  if (includeCover) {
    // Warm background tint
    doc.setFillColor(251, 250, 247); // #fbfaf7
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Outer decorative border
    doc.setDrawColor(227, 224, 217); // #e3e0d9
    doc.setLineWidth(1.2);
    doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin - 4) * 2);

    doc.setDrawColor(109, 40, 217); // #6d28d9 (accent)
    doc.setLineWidth(0.4);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin - 2) * 2);

    // Kicker
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(108, 105, 99); // #6c6963
    const kicker = sanitizePdfText(`LEARN & PLAY · ${book.theme?.name || 'STORYBOOK'}`.toUpperCase());
    doc.text(kicker.slice(0, 50), pageWidth / 2, margin + 8, { align: 'center' });

    // Title (Clamped to avoid overflowing off page)
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(27, 26, 24); // #1b1a18
    const truncatedTitle = cleanBookTitle.length > 90 ? cleanBookTitle.slice(0, 87) + '...' : cleanBookTitle;
    const splitTitle = doc.splitTextToSize(truncatedTitle, contentWidth - 10);
    doc.text(splitTitle, pageWidth / 2, margin + 20, { align: 'center' });

    const titleHeight = Math.min(splitTitle.length * 8.5, 30);
    const authorY = margin + 22 + titleHeight;

    // Author
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(79, 77, 72); // #4f4d48
    doc.text(`Narrated & Created by ${cleanAuthorName}`, pageWidth / 2, authorY, { align: 'center' });

    // Cover Illustration (Preserves natural aspect ratio without square distortion)
    const coverImageSrc = book.pages[0]?.imageData;
    const availableHeight = pageHeight - margin - 16 - (authorY + 6);
    const maxBoxW = Math.min(160, contentWidth - 8);
    const maxBoxH = Math.max(50, Math.min(isSquare ? 105 : 130, availableHeight));

    let coverDrawn = false;
    if (coverImageSrc) {
      try {
        const coverImg = await preparePdfImage(coverImageSrc);
        if (coverImg) {
          const ar = coverImg.aspectRatio || 1;
          let imgW = maxBoxW;
          let imgH = imgW / ar;
          if (imgH > maxBoxH) {
            imgH = maxBoxH;
            imgW = imgH * ar;
          }
          const imgX = (pageWidth - imgW) / 2;
          const imgY = authorY + 6 + (maxBoxH - imgH) / 2;

          doc.addImage(coverImg.data, coverImg.format, imgX, imgY, imgW, imgH, undefined, 'NONE');
          doc.setDrawColor(227, 224, 217);
          doc.setLineWidth(0.6);
          doc.rect(imgX, imgY, imgW, imgH);
          coverDrawn = true;
        }
      } catch (err) {
        console.warn('Could not draw cover image on PDF:', err);
      }
    }

    if (!coverDrawn) {
      // Graceful draft placeholder (preserves standard 4:3 picture ratio instead of harsh square)
      const placeholderW = 120;
      const placeholderH = 90;
      const placeholderX = (pageWidth - placeholderW) / 2;
      const placeholderY = authorY + 6 + (maxBoxH - placeholderH) / 2;
      doc.setDrawColor(227, 224, 217);
      doc.setLineWidth(0.6);
      doc.rect(placeholderX, placeholderY, placeholderW, placeholderH);
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(140, 137, 129);
      doc.text('A Waiting Adventure', pageWidth / 2, placeholderY + placeholderH / 2, { align: 'center' });
    }

    // Cover Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 137, 129);
    doc.text('learnandplay.ai · Storybook', pageWidth / 2, pageHeight - margin - 2, {
      align: 'center',
    });
  }

  // --------------------------------------------------------------------------
  // 2. STORY PAGES
  // --------------------------------------------------------------------------
  for (let i = 0; i < book.pages.length; i++) {
    const page = book.pages[i];
    doc.addPage([pageWidth, pageHeight], 'portrait');

    // Warm paper fill
    doc.setFillColor(251, 250, 247);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Page border hairline
    doc.setDrawColor(235, 232, 226);
    doc.setLineWidth(0.4);
    doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin - 4) * 2);

    let currentY = margin + 4;

    // Header kicker
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 137, 129);
    const cleanHeader = sanitizePdfText(page.pageTitle || `Page ${page.pageNumber}`);
    doc.text(cleanHeader.toUpperCase(), margin, currentY);
    currentY += 6;

    // Page Illustration (Top half - preserving true aspect ratio with zero distortion)
    const maxW = contentWidth;
    const maxH = isSquare ? 98 : 120;

    if (page.imageData) {
      try {
        const pageImg = await preparePdfImage(page.imageData);
        if (pageImg) {
          const ar = pageImg.aspectRatio || 1;
          let renderW = maxW;
          let renderH = renderW / ar;
          if (renderH > maxH) {
            renderH = maxH;
            renderW = renderH * ar;
          }
          const renderX = margin + (contentWidth - renderW) / 2;
          const renderY = currentY;

          doc.addImage(pageImg.data, pageImg.format, renderX, renderY, renderW, renderH, undefined, 'NONE');
          doc.setDrawColor(227, 224, 217);
          doc.setLineWidth(0.5);
          doc.rect(renderX, renderY, renderW, renderH);

          currentY += renderH + 8;
        } else {
          currentY += 8;
        }
      } catch (e) {
        console.warn('Page image draw error:', e);
        currentY += 8;
      }
    } else {
      currentY += 8;
    }

    // Page Story Prose (Bottom half)
    let fontSize = isSquare ? 13 : 14;
    doc.setFont('times', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(27, 26, 24);

    const safeStoryText = sanitizePdfText(page.storyText || '');
    let textLines = doc.splitTextToSize(safeStoryText, contentWidth - 4);

    // Auto-fit font size if prose would overflow towards footer
    const maxTextHeight = pageHeight - margin - 8 - currentY;
    while (fontSize > 9 && textLines.length * (fontSize * 0.45 * 1.5) > maxTextHeight) {
      fontSize -= 0.5;
      doc.setFontSize(fontSize);
      textLines = doc.splitTextToSize(safeStoryText, contentWidth - 4);
    }

    doc.text(textLines, margin + 2, currentY, {
      lineHeightFactor: 1.5,
    });

    // Page Number Footer
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(140, 137, 129);
    doc.text(`— ${page.pageNumber} —`, pageWidth / 2, pageHeight - margin - 2, {
      align: 'center',
    });
  }

  // --------------------------------------------------------------------------
  // 3. BACK COVER
  // --------------------------------------------------------------------------
  if (includeBackCover) {
    doc.addPage([pageWidth, pageHeight], 'portrait');

    // Warm paper fill
    doc.setFillColor(251, 250, 247);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Outer decorative frame
    doc.setDrawColor(227, 224, 217);
    doc.setLineWidth(1.2);
    doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin - 4) * 2);

    doc.setDrawColor(109, 40, 217);
    doc.setLineWidth(0.4);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin - 2) * 2);

    // Centerpiece "The End"
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(27, 26, 24);
    doc.text(book.pages.length === 0 ? 'My Storybook' : 'The End', pageWidth / 2, pageHeight / 2 - 24, {
      align: 'center',
    });

    doc.setFont('times', 'italic');
    doc.setFontSize(13);
    doc.setTextColor(79, 77, 72);
    doc.text(
      book.pages.length === 0
        ? 'A clean slate ready for wonder and voice.'
        : 'Every great adventure begins with a voice.',
      pageWidth / 2,
      pageHeight / 2 - 10,
      { align: 'center' }
    );

    // Details box with wrapped lines
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(108, 105, 99);

    const safeThemeName = sanitizePdfText(book.theme?.name || 'Standard');
    const safeAudience = sanitizePdfText((book.ageGroup || 'early-reader').toUpperCase());
    const detailLines = [
      `Story: ${cleanBookTitle.slice(0, 60)}`,
      book.pages.length === 0 ? 'Status: Draft (0 pages created)' : `Total Pages: ${book.pages.length}`,
      `Theme: ${safeThemeName}`,
      `Audience: ${safeAudience}`,
      `Published: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    ];

    doc.text(detailLines, pageWidth / 2, pageHeight / 2 + 12, {
      align: 'center',
      lineHeightFactor: 1.6,
    });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 137, 129);
    doc.text('Created with Storybook AI on learnandplay.ai', pageWidth / 2, pageHeight - margin - 2, {
      align: 'center',
    });
  }

  return doc.output('blob');
}
