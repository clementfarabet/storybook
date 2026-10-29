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
 * into standard PDF-safe equivalents to prevent jsPDF font encoding crashes.
 */
function sanitizePdfText(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0]/g, ' ')
    .trim();
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

  // Square format: 210mm x 210mm (approx 8.27" x 8.27") or Letter portrait: 215.9mm x 279.4mm
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

  // Helper to load and rasterize any image (including SVGs and base64 PNGs) safely to PNG
  const rasterizeImage = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!src || typeof src !== 'string') {
        resolve(createFallbackDataUrl());
        return;
      }
      if (src.startsWith('data:image/png;base64,')) {
        resolve(src);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 800;
          canvas.height = img.naturalHeight || 800;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(createFallbackDataUrl());
            return;
          }
          ctx.fillStyle = '#fbfaf7';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch (_) {
          resolve(createFallbackDataUrl());
        }
      };
      img.onerror = () => {
        resolve(createFallbackDataUrl());
      };
      img.src = src;
    });
  };

  const createFallbackDataUrl = (): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f5f3ef';
        ctx.fillRect(0, 0, 400, 400);
        ctx.strokeStyle = '#e3e0d9';
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, 384, 384);
      }
      return canvas.toDataURL('image/png');
    } catch (_) {
      return '';
    }
  };

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

    if (coverImageSrc) {
      try {
        const coverImgData = await rasterizeImage(coverImageSrc);
        if (coverImgData) {
          const imgX = (pageWidth - imgSize) / 2;
          const imgY = authorY + 6;

          doc.addImage(coverImgData, 'PNG', imgX, imgY, imgSize, imgSize);

          // Frame around image
          doc.setDrawColor(227, 224, 217);
          doc.setLineWidth(0.6);
          doc.rect(imgX, imgY, imgSize, imgSize);
        }
      } catch (err) {
        console.warn('Could not draw cover image on PDF:', err);
      }
    } else {
      // Graceful draft placeholder when 0 pages exist
      const imgX = (pageWidth - imgSize) / 2;
      const imgY = authorY + 6;
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
        const pageImgData = await rasterizeImage(page.imageData);
        if (pageImgData) {
          doc.addImage(pageImgData, 'PNG', margin, currentY, imgWidth, imgHeight, undefined, 'FAST');
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
