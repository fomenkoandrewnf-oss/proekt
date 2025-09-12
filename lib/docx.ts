import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

export async function buildDocx(summary: string, title = 'Краткое ТЗ') {
  const lines = summary.split('\n').map((l) => l.trim());
  const children: Paragraph[] = [];

  children.push(new Paragraph({
    text: title,
    heading: HeadingLevel.TITLE,
  }));
  children.push(new Paragraph({ text: ' ', spacing: { after: 200 } }));

  for (const line of lines) {
    if (!line) { children.push(new Paragraph({ text: ' ' })); continue; }
    const isHeader = /^(общие|стиль|зонирование|кух|спаль|сануз|отдел|тех|огранич|бюджет|референ)/i.test(line);
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: line,
          bold: isHeader,
        })
      ]
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

