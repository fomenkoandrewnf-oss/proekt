import PDFDocument from 'pdfkit';
import type { BriefFormData } from './types';

function writeHeading(doc: PDFDocument, text: string, level: 1 | 2 = 2) {
  const fontSize = level === 1 ? 18 : 13;
  doc.moveDown(level === 1 ? 0.6 : 0.4);
  doc.font('Helvetica-Bold').fontSize(fontSize).text(text);
  doc.font('Helvetica').fontSize(11);
  doc.moveDown(0.2);
}

function writeKV(doc: PDFDocument, label: string, value?: string | number | null) {
  if (value === undefined || value === null || value === '') return;
  doc.font('Helvetica-Bold').fontSize(11).text(`${label}: `, { continued: true });
  doc.font('Helvetica').fontSize(11).text(String(value));
}

function writeList(doc: PDFDocument, label: string, items: string[]) {
  if (!items.length) return;
  doc.font('Helvetica-Bold').fontSize(11).text(`${label}:`);
  doc.font('Helvetica').fontSize(11);
  items.forEach((item) => {
    doc.text(`• ${item}`);
  });
}

function buildRoomLines(form: BriefFormData) {
  return form.rooms
    .filter((room) => room.name.trim())
    .map((room) => {
      const areaValue = Number(room.area);
      const area = Number.isFinite(areaValue) && areaValue > 0 ? `${areaValue} м²` : 'площадь не указана';
      return `${room.name.trim()} — ${area}`;
    });
}

export async function buildPdf(summary: string, form: BriefFormData, title = 'Краткое ТЗ'): Promise<Uint8Array> {
  return await new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (d) => chunks.push(d as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks) as Uint8Array));

    doc.font('Helvetica-Bold').fontSize(20).text(title);
    doc.moveDown(0.5);

    writeHeading(doc, 'Краткое ТЗ', 1);
    if (summary.trim()) {
      doc.font('Helvetica').fontSize(11).text(summary);
    } else {
      doc.text('Нет данных');
    }

    writeHeading(doc, 'Контакты');
    writeKV(doc, 'Телефон', form.contacts.phone);
    writeKV(doc, 'E-mail', form.contacts.email);
    writeKV(doc, 'Адрес', form.contacts.address);

    writeHeading(doc, 'Основная информация');
    writeKV(doc, 'Тип жилья', form.housingType);
    writeKV(doc, 'Отделка', form.finishing);
    const totalArea = Number(form.totalArea);
    writeKV(doc, 'Общая площадь, м²', Number.isFinite(totalArea) && totalArea > 0 ? totalArea : '');
    writeKV(doc, 'Назначение объекта', form.purpose);

    writeList(doc, 'Помещения', buildRoomLines(form));

    writeHeading(doc, 'Жители и гости');
    writeKV(doc, 'Состав семьи', form.family);
    writeKV(doc, 'Гости', form.guests);
    writeKV(doc, 'Домашние животные', form.pets);

    writeHeading(doc, 'Требования и ограничения');
    writeKV(doc, 'Что предусмотреть', form.requirements);
    if (form.housingType === 'новостройка') {
      writeKV(doc, 'Перепланировка', form.replanning);
      writeKV(doc, 'Страны-производители', form.manufacturers);
    }
    writeKV(doc, 'Готовые изделия / заказные позиции', form.readyMade);
    writeKV(doc, 'Нельзя / не хотим', form.dontWant);
    writeKV(doc, 'Прочие пожелания', form.other);

    writeHeading(doc, 'Стили и отделка');
    const styles = [...(Array.isArray(form.styles) ? form.styles.filter(Boolean) : [])];
    if (form.customStyle?.trim()) styles.push(form.customStyle.trim());
    writeKV(doc, 'Стиль', styles.join(', '));
    writeKV(doc, 'Цветовая гамма', form.colorScheme);
    writeKV(doc, 'Отделка стен', form.wallFinish);
    writeKV(doc, 'Напольное покрытие', form.floorFinish);
    writeKV(doc, 'Межкомнатные двери', form.doors);

    if (form.plan) {
      writeHeading(doc, 'Планировка');
      const sizeKb = `${Math.round(form.plan.size / 1024)} КБ`;
      writeKV(doc, 'Файл', `${form.plan.originalName} (${sizeKb}, ${form.plan.mimeType})`);
    }

    doc.end();
  });
}
