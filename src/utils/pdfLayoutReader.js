const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');

// Disable external worker in Node environment
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = '';
}

/**
 * Coordinate-Aware PDF Text Reconstruction
 * Reads a PDF buffer, extracts text items with exact geometry (x, y, width, height, fontSize),
 * detects multi-column layouts (e.g. Canva, Overleaf, Europass), and reconstructs
 * clean, sequentially coherent plain text without interleaving columns.
 *
 * Throws an Error with code 'SCANNED_PDF_UNSUPPORTED' if no text items exist.
 */
async function readPdfLayout(buffer) {
  if (!buffer || buffer.length === 0) {
    const err = new Error('Empty PDF buffer provided');
    err.code = 'EMPTY_PDF';
    throw err;
  }

  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pageTexts = [];
  let totalTextItems = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    const textContent = await page.getTextContent({ normalizeWhitespace: false });

    const rawItems = (textContent.items || []).filter(item => typeof item.str === 'string' && item.str.trim().length > 0);
    totalTextItems += rawItems.length;

    if (rawItems.length === 0) {
      continue;
    }

    // Map each item to unified coordinate geometry
    // In PDF coordinates: (0,0) is bottom-left, y goes up.
    // viewport.height - y converts to top-down coordinates where top is 0 and y increases downwards.
    const items = rawItems.map(item => {
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const x = transform[4];
      const pdfY = transform[5];
      const y = viewport.height - pdfY; // Top-down y
      const width = item.width || 0;
      const height = item.height || Math.abs(transform[3]) || 10;
      const fontSize = Math.sqrt((transform[0] ** 2) + (transform[1] ** 2)) || height;

      return {
        str: item.str,
        x,
        y,
        width,
        height,
        fontSize,
        fontName: item.fontName || ''
      };
    });

    // Detect layout: check if page has 2 columns
    // We look for a clear vertical gutter between a left band and a right band
    const columnSplit = detectTwoColumnGutter(items, pageWidth);

    let reconstructedText = '';
    if (columnSplit) {
      // 2-column layout: reconstruct Main Column & Sidebar Column separately
      // Decide which is main (usually wider) and which is sidebar
      const leftItems = items.filter(it => (it.x + (it.width / 2)) < columnSplit.gutterX);
      const rightItems = items.filter(it => (it.x + (it.width / 2)) >= columnSplit.gutterX);

      // If left column is very narrow (< 35% of page) and right is main, or vice-versa:
      // Sort each column internally top-to-bottom
      const isLeftSidebar = columnSplit.gutterX < (pageWidth * 0.4);
      if (isLeftSidebar) {
        // Reconstruct Main (Right) column, then Left sidebar (or Left first then Main)
        // Putting Main first preserves work experience and education flow
        const mainText = reconstructSingleStream(rightItems);
        const sidebarText = reconstructSingleStream(leftItems);
        reconstructedText = mainText + '\n\n' + sidebarText;
      } else {
        const mainText = reconstructSingleStream(leftItems);
        const sidebarText = reconstructSingleStream(rightItems);
        reconstructedText = mainText + '\n\n' + sidebarText;
      }
    } else {
      // Single-column layout
      reconstructedText = reconstructSingleStream(items);
    }

    if (reconstructedText.trim()) {
      pageTexts.push(reconstructedText.trim());
    }
  }

  if (totalTextItems === 0 || pageTexts.join('\n').trim().length === 0) {
    const err = new Error('No selectable text found in PDF. This appears to be a scanned image PDF.');
    err.code = 'SCANNED_PDF_UNSUPPORTED';
    throw err;
  }

  return pageTexts.join('\n\n--- Page Break ---\n\n');
}

/**
 * Detects if a set of text items clusters into two columns separated by a vertical gutter
 */
function detectTwoColumnGutter(items, pageWidth) {
  if (items.length < 15) return null;

  // Find candidate gutter X between 20% and 55% of page width
  const minGutter = pageWidth * 0.22;
  const maxGutter = pageWidth * 0.58;

  // Histogram of item horizontal centers
  const bucketSize = 10;
  const numBuckets = Math.ceil(pageWidth / bucketSize);
  const occupancy = new Array(numBuckets).fill(0);

  for (const it of items) {
    const startB = Math.max(0, Math.floor(it.x / bucketSize));
    const endB = Math.min(numBuckets - 1, Math.floor((it.x + it.width) / bucketSize));
    for (let b = startB; b <= endB; b++) {
      occupancy[b]++;
    }
  }

  // Look for a zero or near-zero valley between two occupied regions
  let bestGutterX = null;
  let minOcc = Infinity;

  const minB = Math.floor(minGutter / bucketSize);
  const maxB = Math.floor(maxGutter / bucketSize);

  for (let b = minB; b <= maxB; b++) {
    // Check if there is significant text to the left and to the right
    const leftCount = occupancy.slice(0, b).reduce((a, c) => a + c, 0);
    const rightCount = occupancy.slice(b + 1).reduce((a, c) => a + c, 0);

    if (leftCount > items.length * 0.15 && rightCount > items.length * 0.3) {
      if (occupancy[b] < minOcc && occupancy[b] <= 2) {
        minOcc = occupancy[b];
        bestGutterX = b * bucketSize;
      }
    }
  }

  if (bestGutterX !== null) {
    return { gutterX: bestGutterX };
  }

  return null;
}

/**
 * Reconstructs a single column stream by grouping lines and sorting top-to-bottom, left-to-right
 */
function reconstructSingleStream(items) {
  if (!items || items.length === 0) return '';

  // Sort primarily top-to-bottom by y, then left-to-right by x
  const sorted = [...items].sort((a, b) => {
    const dy = a.y - b.y;
    if (Math.abs(dy) <= 3) {
      return a.x - b.x;
    }
    return dy;
  });

  // Group into lines where items share approximately the same y (within 3pt)
  const lines = [];
  let currentLine = [];
  let currentY = null;

  for (const it of sorted) {
    if (currentY === null) {
      currentLine.push(it);
      currentY = it.y;
    } else if (Math.abs(it.y - currentY) <= 3) {
      currentLine.push(it);
    } else {
      // Sort items on this line from left to right
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = [it];
      currentY = it.y;
    }
  }
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  // Assemble lines into paragraph text with spacing based on deltaY
  let output = '';
  let prevLineY = null;
  let prevLineFontSize = 10;

  for (const line of lines) {
    const lineY = line[0].y;
    const avgFontSize = line.reduce((acc, it) => acc + it.fontSize, 0) / line.length;

    // Join items on this line, adding space if there's a horizontal gap
    let lineStr = '';
    for (let i = 0; i < line.length; i++) {
      const it = line[i];
      if (i > 0) {
        const prev = line[i - 1];
        const gap = it.x - (prev.x + prev.width);
        if (gap > 2) {
          lineStr += ' ';
        }
      }
      lineStr += it.str;
    }

    const trimmed = lineStr.trim();
    if (!trimmed) continue;

    if (prevLineY === null) {
      output += trimmed;
    } else {
      const deltaY = lineY - prevLineY;
      const lineHeight = Math.max(prevLineFontSize, avgFontSize);

      if (deltaY > lineHeight * 1.85 || avgFontSize > prevLineFontSize * 1.25) {
        // Section or paragraph break
        output += '\n\n' + trimmed;
      } else {
        // Standard line break
        output += '\n' + trimmed;
      }
    }

    prevLineY = lineY;
    prevLineFontSize = avgFontSize;
  }

  return output;
}

module.exports = { readPdfLayout };
