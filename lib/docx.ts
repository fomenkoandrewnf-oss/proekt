import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { BriefFormData } from './types';

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
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${label}:`, bold: true })],
    })
  );
  items.forEach((item) => {
    children.push(new Paragraph({ text: item, bullet: { level: 0 } }));
  });
}

function stringifyRooms(form: BriefFormData) {
  return form.rooms
    .filter((room) => room.name.trim())
    .map((room) => {
      const areaValue = Number(room.area);
      const area = Number.isFinite(areaValue) && areaValue > 0 ? `${areaValue} м²` : 'площадь не указана';
      return `${room.name.trim()} — ${area}`;
    });
}

function collectStyles(form: BriefFormData) {
  const styles = Array.isArray(form.styles) ? form.styles.filter(Boolean) : [];
  if (form.customStyle?.trim()) styles.push(form.customStyle.trim());
  return styles;
}

export async function buildDocx(summary: string, form: BriefFormData, title = 'Краткое ТЗ'): Promise<Uint8Array> {
  const children: Paragraph[] = [];

  pushHeading(children, title, HeadingLevel.TITLE);
  pushHeading(children, 'Краткое ТЗ', HeadingLevel.HEADING_1);

  const lines = summary.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    children.push(new Paragraph('Нет данных'));
  } else {
    lines.forEach((line) => children.push(new Paragraph(line)));
  }

  pushHeading(children, 'Контакты');
  pushKV(children, 'Телефон', form.contacts.phone);
  pushKV(children, 'E-mail', form.contacts.email);
  pushKV(children, 'Адрес', form.contacts.address);

  pushHeading(children, 'Основная информация');
  pushKV(children, 'Тип жилья', form.housingType);
  pushKV(children, 'Отделка', form.finishing);
  const totalArea = Number(form.totalArea);
  pushKV(children, 'Общая площадь, м²', Number.isFinite(totalArea) && totalArea > 0 ? totalArea : '');
  pushKV(children, 'Назначение объекта', form.purpose);

  const roomLines = stringifyRooms(form);
  pushList(children, 'Помещения', roomLines);

  pushHeading(children, 'Жители и гости');
  pushKV(children, 'Состав семьи', form.family);
  pushKV(children, 'Гости', form.guests);
  pushKV(children, 'Домашние животные', form.pets);

  pushHeading(children, 'Требования и ограничения');
  pushKV(children, 'Что предусмотреть', form.requirements);
  if (form.housingType === 'новостройка') {
    pushKV(children, 'Перепланировка', form.replanning);
    pushKV(children, 'Страны-производители', form.manufacturers);
  }
  pushKV(children, 'Готовые изделия / заказные позиции', form.readyMade);
  pushKV(children, 'Нельзя / не хотим', form.dontWant);
  pushKV(children, 'Прочие пожелания', form.other);

  pushHeading(children, 'Стили и отделка');
  const styles = collectStyles(form);
  pushKV(children, 'Стиль', styles.join(', '));
  pushKV(children, 'Цветовая гамма', form.colorScheme);
  pushKV(children, 'Отделка стен', form.wallFinish);
  pushKV(children, 'Напольное покрытие', form.floorFinish);
  pushKV(children, 'Межкомнатные двери', form.doors);

  if (form.plan) {
    pushHeading(children, 'Планировка');
    pushKV(children, 'Файл', `${form.plan.originalName} (${Math.round(form.plan.size / 1024)} КБ, ${form.plan.mimeType})`);
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
