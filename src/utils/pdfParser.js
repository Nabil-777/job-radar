const { PDFParse } = require('pdf-parse');

async function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length === 0) return '';

  try {
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    if (typeof parser.load === 'function') await parser.load();
    if (typeof parser.getText === 'function') {
      const result = await parser.getText();
      if (typeof result === 'string' && result.trim()) return result.trim();
      if (result && typeof result.text === 'string' && result.text.trim()) return result.text.trim();
    }
  } catch (err) {
    console.warn('[PDF Parser] Standard PDFParse failed, extracting text stream:', err.message);
  }

  // Fallback: extract plain text strings from buffer stream
  try {
    const raw = buffer.toString('utf8');
    const matches = raw.match(/\(([^()]+)\)/g);
    if (matches && matches.length > 0) {
      return matches.map(m => m.slice(1, -1)).join(' ').replace(/\s+/g, ' ').trim();
    }
  } catch (e) {
    // ignore
  }

  return '';
}

module.exports = { extractTextFromPdf };
