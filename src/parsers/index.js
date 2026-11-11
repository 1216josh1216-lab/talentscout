// File parsers. The PDF and DOCX libraries are passed in by the caller, so the
// same code runs in the browser (vendored builds) and in Node (npm packages).
// Only text is extracted. Images, including photos, are never read.

/** TXT: UTF-8 first, then UTF-16 by BOM, then GB18030 (covers GBK/GB2312). */
export function decodeText(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8[0] === 0xff && u8[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(u8), encoding: 'utf-16le' };
  if (u8[0] === 0xfe && u8[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(u8), encoding: 'utf-16be' };
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(u8), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('gb18030').decode(u8), encoding: 'gb18030' };
  }
}

/**
 * PDF text in content-stream order, rebuilt into lines from glyph positions.
 * @param pdfjsLib the pdf.js module (getDocument)
 * @param opts.cMapUrl directory of pdf.js CMaps, needed for many Chinese PDFs
 */
export async function extractPdfText(pdfjsLib, bytes, opts = {}) {
  const data = new Uint8Array(bytes).slice(); // pdf.js takes ownership of the buffer
  const task = pdfjsLib.getDocument({
    data,
    worker: opts.worker, // optional shared PDFWorker; pdf.js creates one if absent
    cMapUrl: opts.cMapUrl,
    cMapPacked: true,
    standardFontDataUrl: opts.standardFontDataUrl,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  });
  const doc = await task.promise;
  const out = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      let line = '';
      let lastY = null;
      let lastEndX = 0;
      const flush = () => {
        out.push(line.trimEnd());
        line = '';
        lastY = null;
      };
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const h = item.height || 10;
        if (item.str) {
          if (lastY !== null && Math.abs(y - lastY) > h * 0.5) flush();
          else if (line && x - lastEndX > h * 0.25 && !line.endsWith(' ')) line += ' ';
          line += item.str;
          lastY = y;
          lastEndX = x + item.width;
        }
        if (item.hasEOL && line) flush();
      }
      if (line) flush();
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return out.join('\n');
}

/** DOCX paragraphs as plain text, via mammoth's raw-text extraction. */
export async function extractDocxText(mammoth, bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const input =
    typeof Buffer !== 'undefined' && typeof window === 'undefined'
      ? { buffer: Buffer.from(u8) }
      : { arrayBuffer: u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) };
  const { value } = await mammoth.extractRawText(input);
  return value.replace(/\n{2}/g, '\n');
}

export function detectFormat(name, bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const ext = (String(name).match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
  if (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) return 'pdf'; // %PDF
  if (u8[0] === 0x50 && u8[1] === 0x4b) return ext === 'docx' || !ext ? 'docx' : 'unsupported'; // PK zip
  if (ext === 'txt' || ext === 'md' || ext === 'text') return 'txt';
  if (ext === 'pdf' || ext === 'docx') return 'corrupt';
  return 'unsupported';
}

/**
 * @param file {name:string, bytes:Uint8Array|ArrayBuffer}
 * @param libs {pdfjsLib, mammoth, cMapUrl, standardFontDataUrl}
 * @returns {{name, format, text, error:null|string}} never throws
 */
export async function parseResumeFile(file, libs = {}) {
  const format = detectFormat(file.name, file.bytes);
  const result = { name: file.name, format, text: '', error: null };
  try {
    if (format === 'pdf') result.text = await extractPdfText(libs.pdfjsLib, file.bytes, libs);
    else if (format === 'docx') result.text = await extractDocxText(libs.mammoth, file.bytes);
    else if (format === 'txt') result.text = decodeText(file.bytes).text;
    else result.error = format === 'corrupt' ? 'file_corrupt' : 'unsupported_format';
  } catch (e) {
    result.error = 'parse_failed';
    result.detail = String(e?.message ?? e);
  }
  return result;
}
