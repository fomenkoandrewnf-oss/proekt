import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { Room, TZForm } from './types';

function pushHeading(children: Paragraph[], text: string, level: HeadingLevel = HeadingLevel.HEADING_2) {
  children.push(new Paragraph({ text, heading: level, spacing: { before: 200, after: 100 } }));
}

function pushKV(children: Paragraph[], label: string, value?: string | number | null) {
  if (value === undefined || value === null || value === '') return;
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true }),
        new TextRun({ text: String(value) }),
      ],
    })
  );
}

function pushList(children: Paragraph[], label: string, items: string[]) {
  if (!items.length) return;
  children.push(new Paragraph({ children: [new TextRun({ text: `${label}:`, bold: true })] }));
  items.forEach((item) => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));
}

function parseArea(area?: number) {
  if (typeof area !== 'number') return undefined;
  if (!Number.isFinite(area)) return undefined;
  return area > 0 ? area : undefined;
}

function formatRooms(rooms: Room[]) {
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

function formatPriorities(form: TZForm) {
  return Array.isArray(form.priorities) ? form.priorities.filter(Boolean).join(', ') : '';
}

function formatRecord(record?: Record<string, unknown>) {
  if (!record) return '';
  const entries = Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`);
  return entries.join('; ');
}

export async function buildDocx(summary: string, form: TZForm, title = 'Краткое ТЗ'): Promise<Uint8Array> {
  const children: Paragraph[] = [];

  pushHeading(children, title, HeadingLevel.TITLE);
  pushHeading(children, 'Краткое ТЗ', HeadingLevel.HEADING_1);

  const lines = summary.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    children.push(new Paragraph('Нет данных'));
  } else {
    lines.forEach((line) => children.push(new Paragraph(line)));
  }

  pushHeading(children, 'Контакты');
  pushKV(children, 'Телефон', form.contacts.phone);
  pushKV(children, 'E-mail', form.contacts.email);
  pushKV(children, 'Адрес', form.contacts.address);

  pushHeading(children, 'Общие параметры');
  pushKV(children, 'Тип жилья', form.housingType);
  pushKV(children, 'Отделка', form.finish);
  pushKV(children, 'Общая площадь, м²', form.totalArea && form.totalArea > 0 ? form.totalArea : undefined);
  pushKV(children, 'Назначение', form.purpose);
  pushList(children, 'Помещения', formatRooms(form.rooms));

  if (form.plan) {
    pushHeading(children, 'Планировка');
    pushKV(children, 'Файл', form.plan.originalName);
    const sizeKb = form.plan.size ? `${Math.round(form.plan.size / 1024)} КБ` : undefined;
    pushKV(children, 'Размер файла', sizeKb);
    pushKV(children, 'Формат', form.plan.mimeType);
    pushKV(children, 'Есть масштаб/размеры', form.plan.hasScale ? 'да' : 'нет');
    pushKV(children, 'Масштаб плана', form.plan.scaleNote);
  }

  pushHeading(children, 'Назначение и жители');
  pushKV(children, 'Состав семьи', form.family);
  pushKV(children, 'Гости', form.guests);
  pushKV(children, 'Домашние животные', form.pets);
  pushKV(children, 'Аллергии', form.allergies);
  pushKV(children, 'Приоритеты', formatPriorities(form));

  pushHeading(children, 'Требования');
  pushKV(children, 'Что предусмотреть', form.requirements);
  if (form.housingType === 'новостройка') {
    pushKV(children, 'Перепланировка нужна', form.replanning?.needed ? 'да' : 'нет');
    pushKV(children, 'Перепланировка — детали', form.replanning?.details);
  }
  pushKV(children, 'Страны / бренды', form.preferredCountries);
  pushKV(children, 'Готовые изделия vs заказ', form.readyVsCustom);
  pushKV(children, 'Что точно не хотим', form.antiWants);
  pushKV(children, 'Прочие пожелания', form.otherWishes);
  pushKV(children, 'Бюджет', form.budget);

  pushHeading(children, 'Стиль и отделка');
  pushKV(children, 'Стиль', compactStyleTags(form));
  pushKV(children, 'Цветовая гамма', form.style?.colors);
  pushKV(children, 'Отделка стен', form.style?.walls);
  pushKV(children, 'Напольное покрытие', form.style?.floors);
  pushKV(children, 'Межкомнатные двери', form.style?.doors);

  if (form.kitchen || form.bathrooms || form.storage || form.lighting || form.windows || form.smartHome) {
    pushHeading(children, 'Детали (аккордеоны)');
    pushKV(children, 'Кухня', formatRecord(form.kitchen as Record<string, unknown> | undefined));
    pushKV(children, 'Санузлы', formatRecord(form.bathrooms as Record<string, unknown> | undefined));
    pushKV(children, 'Хранение', form.storage);
    pushKV(children, 'Свет', form.lighting);
    pushKV(children, 'Окна и шторы', form.windows);
    pushKV(children, 'Умный дом и климат', form.smartHome);
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = (await Packer.toBuffer(doc)) as Uint8Array;
  return buffer;
}
