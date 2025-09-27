import PDFDocument from 'pdfkit';
import type { Room, TZForm } from './types';

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

function parseArea(area?: number) {
  if (typeof area !== 'number') return undefined;
  if (!Number.isFinite(area)) return undefined;
  return area > 0 ? area : undefined;
}

function buildRoomLines(rooms: Room[]) {
  return rooms
    .filter((room) => parseArea(room.area))
    .map((room) => {
      const area = parseArea(room.area);
      const name = room.name?.trim() || room.kind;
      return area ? `${name} — ${area} м²` : name;
    });
}

function compactStyleTags(form: TZForm) {
  const tags = Array.isArray(form.style?.tags) ? form.style.tags.filter(Boolean) : [];
  if (form.style?.extra?.trim()) tags.push(form.style.extra.trim());
  return tags.join(', ');
}

function formatRecord(record?: Record<string, unknown>) {
  if (!record) return '';
  const entries = Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`);
  return entries.join('; ');
}

export async function buildPdf(summary: string, form: TZForm, title = 'Краткое ТЗ'): Promise<Uint8Array> {
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

    writeHeading(doc, 'Общие параметры');
    writeKV(doc, 'Тип жилья', form.housingType);
    writeKV(doc, 'Отделка', form.finish);
    writeKV(doc, 'Общая площадь, м²', form.totalArea && form.totalArea > 0 ? form.totalArea : undefined);
    writeKV(doc, 'Назначение', form.purpose);
    writeList(doc, 'Помещения', buildRoomLines(form.rooms));

    if (form.plan) {
      writeHeading(doc, 'Планировка');
      writeKV(doc, 'Файл', form.plan.originalName);
      const sizeKb = form.plan.size ? `${Math.round(form.plan.size / 1024)} КБ` : undefined;
      writeKV(doc, 'Размер файла', sizeKb);
      writeKV(doc, 'Формат', form.plan.mimeType);
      writeKV(doc, 'Есть масштаб/размеры', form.plan.hasScale ? 'да' : 'нет');
      writeKV(doc, 'Масштаб плана', form.plan.scaleNote);
    }

    writeHeading(doc, 'Назначение и жители');
    writeKV(doc, 'Состав семьи', form.family);
    writeKV(doc, 'Гости', form.guests);
    writeKV(doc, 'Домашние животные', form.pets);
    writeKV(doc, 'Аллергии', form.allergies);
    writeKV(doc, 'Приоритеты', Array.isArray(form.priorities) ? form.priorities.join(', ') : undefined);

    writeHeading(doc, 'Требования');
    writeKV(doc, 'Что предусмотреть', form.requirements);
    if (form.housingType === 'новостройка') {
      writeKV(doc, 'Перепланировка нужна', form.replanning?.needed ? 'да' : 'нет');
      writeKV(doc, 'Перепланировка — детали', form.replanning?.details);
    }
    writeKV(doc, 'Страны / бренды', form.preferredCountries);
    writeKV(doc, 'Готовые изделия vs заказ', form.readyVsCustom);
    writeKV(doc, 'Что точно не хотим', form.antiWants);
    writeKV(doc, 'Прочие пожелания', form.otherWishes);
    writeKV(doc, 'Бюджет', form.budget);

    writeHeading(doc, 'Стиль и отделка');
    writeKV(doc, 'Стиль', compactStyleTags(form));
    writeKV(doc, 'Цветовая гамма', form.style?.colors);
    writeKV(doc, 'Отделка стен', form.style?.walls);
    writeKV(doc, 'Напольное покрытие', form.style?.floors);
    writeKV(doc, 'Межкомнатные двери', form.style?.doors);

    writeHeading(doc, 'Детали (аккордеоны)');
    writeKV(doc, 'Кухня', formatRecord(form.kitchen as Record<string, unknown> | undefined));
    writeKV(doc, 'Санузлы', formatRecord(form.bathrooms as Record<string, unknown> | undefined));
    writeKV(doc, 'Хранение', form.storage);
    writeKV(doc, 'Свет', form.lighting);
    writeKV(doc, 'Окна и шторы', form.windows);
    writeKV(doc, 'Умный дом и климат', form.smartHome);

    doc.end();
  });
}
