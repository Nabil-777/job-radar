const { readPdfLayout } = require('./pdfLayoutReader');

/**
 * Extracts text from a PDF buffer with coordinate-aware layout reconstruction
 * Eliminates column interleaving in 2-column resumes and rejects scanned/corrupted PDFs cleanly.
 */
async function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length === 0) return '';
  return await readPdfLayout(buffer);
}

module.exports = { extractTextFromPdf };
