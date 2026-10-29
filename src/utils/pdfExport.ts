import { jsPDF } from 'jspdf';
import { StoryBook } from '../types';

export interface PdfExportOptions {
  format?: 'square' | 'portrait';
  authorName?: string;
  includeCover?: boolean;
  includeBackCover?: boolean;
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
 * Safely extracts or prepares image data for jsPDF.
 * - JPEG and PNG base64 data URLs are used directly (0ms latency, 0 canvas overhead).
 * - SVG data URLs are rasterized to PNG on canvas with a strict 2-second timeout.
 * - Never sets crossOrigin on data: URIs (which causes WebKit/Safari to block loading).
 */
async function preparePdfImage(src: string | undefined | null): Promise<{ data: string; format: 'JPEG' | 'PNG' } | null> {
  if (!src || typeof src !== 'string' || !src.trim()) return null;

  // 1. Direct Base64 JPEGs (Default from Gemini)
  if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
    return { data: src, format: 'JPEG' };
  }

  // 2. Direct Base64 PNGs
  if (src.startsWith('data:image/png')) {
    return { data: src, format: 'PNG' };
  }

  // 3. Fallback/SVG Rasterization with strict timeout & no crossOrigin taint
  return new Promise((resolve) => {
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        resolve(null);
      }
    }, 2000);

    try {
      const img = new Image();
      if (!src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(img.naturalWidth || 800, 1024);
          canvas.height = Math.min(img.naturalHeight || 800, 1024);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = '#fbfaf7';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngData = canvas.toDataURL('image/png');
          resolve({ data: pngData, format: 'PNG' });
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

    // Cover Illustration (Use Page 1's illustration if available, or placeholder)
    const coverImageSrc = book.pages[0]?.imageData;
    const availableHeight = pageHeight - margin - 16 - (authorY + 8);
    const maxImgSize = isSquare ? 95 : 110;
    const imgSize = Math.max(50, Math.min(maxImgSize, availableHeight));
    const imgX = (pageWidth - imgSize) / 2;
    const imgY = authorY + 6;

    let coverDrawn = false;
    if (coverImageSrc) {
      try {
        const coverImg = await preparePdfImage(coverImageSrc);
        if (coverImg) {
          doc.addImage(coverImg.data, coverImg.format, imgX, imgY, imgSize, imgSize, undefined, 'FAST');
          doc.setDrawColor(227, 224, 217);
          doc.setLineWidth(0.6);
          doc.rect(imgX, imgY, imgSize, imgSize);
          coverDrawn = true;
        }
      } catch (err) {
        console.warn('Could not draw cover image on PDF:', err);
      }
    }

    if (!coverDrawn) {
      // Graceful draft placeholder
      doc.setDrawColor(227, 224, 217);
      doc.setLineWidth(0.6);
      doc.rect(imgX, imgY, imgSize, imgSize);
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(140, 137, 129);
      doc.text('A Waiting Adventure', pageWidth / 2, imgY + imgSize / 2, { align: 'center' });
    }

    // Cover Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 137, 129);
    doc.text('learnandplay.ai · Storybook', pageWidth / 2, pageHeight - margin + 2, {
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

    // Page Illustration (Top half)
    const imgHeight = isSquare ? 90 : 110;
    const imgWidth = contentWidth;

    if (page.imageData) {
      try {
        const pageImg = await preparePdfImage(page.imageData);
        if (pageImg) {
          doc.addImage(pageImg.data, pageImg.format, margin, currentY, imgWidth, imgHeight, undefined, 'FAST');
          doc.setDrawColor(227, 224, 217);
          doc.setLineWidth(0.5);
          doc.rect(margin, currentY, imgWidth, imgHeight);
        }
      } catch (e) {
        console.warn('Page image draw error:', e);
      }
    }
    currentY += imgHeight + 8;

    // Page Story Prose (Bottom half)
    doc.setFont('times', 'normal');
    doc.setFontSize(isSquare ? 13 : 14);
    doc.setTextColor(27, 26, 24);

    const safeStoryText = sanitizePdfText(page.storyText || '');
    const textLines = doc.splitTextToSize(safeStoryText, contentWidth - 4);
    doc.text(textLines, margin + 2, currentY, {
      lineHeightFactor: 1.5,
    });

    // Page Number Footer
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(140, 137, 129);
    doc.text(`— ${page.pageNumber} —`, pageWidth / 2, pageHeight - margin + 2, {
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
    doc.text('Created with Storybook AI on learnandplay.ai', pageWidth / 2, pageHeight - margin + 2, {
      align: 'center',
    });
  }

  return doc.output('blob');
}
