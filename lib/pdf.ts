import PDFDocument from 'pdfkit';

export async function buildPdf(summary: string, title = 'Краткое ТЗ'): Promise<Buffer> {
  return await new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (d) => chunks.push(d as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text(title, { underline: false });
    doc.moveDown();
    doc.fontSize(11).text(summary, { align: 'left' });

    doc.end();
  });
}

