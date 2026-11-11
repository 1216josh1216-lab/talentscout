// Minimal PDF writer for synthetic fixtures. No dependencies, no font files.
// ASCII lines use the standard Helvetica font. Lines with any non-ASCII
// character use the non-embedded CJK font STSong-Light with the predefined
// UniGB-UCS2-H CMap, which is how many Chinese office tools write PDFs and is
// exactly the case where a reader needs CMap files to recover the text.

const esc = (s) => s.replace(/[\\()]/g, '\\$&');
const hexUcs2 = (s) =>
  [...s].map((ch) => {
    const cp = ch.codePointAt(0);
    if (cp > 0xffff) throw new Error(`makePdf: character outside the BMP: ${ch}`);
    return cp.toString(16).padStart(4, '0');
  }).join('');

/**
 * @param opts.photo when true, a small image is drawn on page 1, to prove the
 *        parser ignores images
 */
export function makePdf(lines, { linesPerPage = 48, photo = false } = {}) {
  const objs = [null, null]; // 1 = catalog, 2 = pages
  const add = (s) => objs.push(s);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const desc = add(
    '<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [-25 -254 1000 880] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 880 /StemV 93 >>',
  );
  const cid = add(
    `<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /FontDescriptor ${desc} 0 R /DW 1000 >>`,
  );
  const f2 = add(
    `<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [${cid} 0 R] >>`,
  );

  const img = photo
    ? add('<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length 4 >>\nstream\nAZaz\nendstream')
    : null;

  const pageIds = [];
  const chunks = [];
  for (let i = 0; i < Math.max(lines.length, 1); i += linesPerPage) chunks.push(lines.slice(i, i + linesPerPage));
  for (const chunk of chunks) {
    let s = img && !pageIds.length ? 'q 80 0 0 100 460 690 cm /Im1 Do Q\n' : '';
    s += 'BT\n15 TL\n50 790 Td\n';
    for (const line of chunk) {
      if (line === '') s += 'T*\n';
      else if (/^[\x20-\x7e]*$/.test(line)) s += `/F1 11 Tf (${esc(line)}) Tj T*\n`;
      else s += `/F2 11 Tf <${hexUcs2(line)}> Tj T*\n`;
    }
    s += 'ET';
    const content = add(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`);
    pageIds.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${img ? ` /XObject << /Im1 ${img} 0 R >>` : ''} >> /Contents ${content} 0 R >>`,
      ),
    );
  }
  objs[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, 'latin1'));
}
