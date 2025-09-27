# Приложение для дизайн-брифа

Приложение на Next.js 14 повторяет ключевые блоки анкеты «ТЗ NEW с дизайнером», собирает данные клиента, формирует краткое ТЗ (до 1000 символов) через OpenAI и генерирует референсы по комнатам через Gemini (`@google/genai`, текстовый и vision-режимы). Все введённые данные можно выгрузить в DOCX/PDF, а планировки хранятся на сервере.

## Установка и запуск

1. **Установка зависимостей**
   ```bash
   npm install
   ```
2. **Переменные окружения** – создайте `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=...
   GEMINI_IMAGE_MODEL=gemini-2.0-flash # можно не указывать
   GEMINI_VISION_MODEL=gemini-2.0-flash # по умолчанию такая же
   ```
3. **Запуск разработки**
   ```bash
   npm run dev
   ```
   Откройте http://localhost:3000 и заполните форму.

### Переход на @google/genai

Для чистого обновления зависимостей и кешей используйте команды:

```bash
npm remove @google/generative-ai
npm i @google/genai
rm -rf .next node_modules package-lock.json
npm i
```

## Основные блоки формы

- **Общие параметры** – тип жилья, отделка, проверка площади (10–1000 м²), загрузка планировки с превью, зумом и отметкой масштаба.
- **Помещения** – список комнат с назначением, площадью, заметками и выбором одной комнаты для генерации референсов.
- **Назначение и жители** – цели проекта, состав семьи, гости, питомцы, аллергии, приоритеты (уют/комфорт/практичность/креатив/роскошь).
- **Требования** – обязательные пункты, перепланировка для новостроек, бренды, политика готовые vs заказные, анти-хотелки, бюджет.
- **Стиль и отделка** – чекбоксы стилевых тэгов, цветовая гамма, отделка стен и пола, тип дверей.
- **Аккордеоны** – кухня, санузлы, хранение, свет, окна/шторы, умный дом/климат.
- **Краткое ТЗ** – вызов `/api/brief`, ограничение 1000 символов, счётчик длины.
- **Референсы** – генерация четырёх вариантов через `/api/refs`, просмотр, скачивание выбранного изображения.

## API и контракты

| Маршрут | Метод | Описание |
| --- | --- | --- |
| `/api/brief` | POST | Принимает `TZForm`, возвращает `{ summary }`. Сводка формируется по шаблону из ТЗ и сохраняется в `data/submissions.json`. |
| `/api/plan-upload` | POST | Принимает файл планировки (`jpg/png/pdf`). Возвращает `{ fileId, previewUrl, originalName, size, mimeType }` и сохраняет метаданные в `uploads/plans.json`. |
| `/api/plans/[id]` | GET | Отдаёт сохранённую планировку для превью/скачивания. |
| `/api/refs` | POST | Принимает объект комнаты (тип, площадь, заметки), стиль, материалы и ограничения. Возвращает до 4 PNG (base64) и метаданные о модели/режиме (vision или text). |
| `/api/docx` / `/api/pdf` | POST | Принимают `{ summary, form }` и отдают файлы с полным содержимым анкеты. |

## Структура данных

```ts
export interface TZForm {
  contacts: { phone?: string; email?: string; address?: string };
  housingType: 'новостройка' | 'вторичное жилье';
  finish: 'готовый ремонт' | 'вайтбокс' | 'бетон';
  totalArea?: number;
  plan?: { fileId?: string; previewUrl?: string; hasScale?: boolean; scaleNote?: string; originalName?: string; size?: number; mimeType?: string } | null;
  rooms: Array<{ id: string; kind: RoomKind; name?: string; area: number; wantRefs?: boolean; notes?: string }>;
  purpose: 'проживание' | 'аренда' | 'инвестиции';
  family?: string;
  guests?: string;
  pets?: string;
  allergies?: string;
  priorities?: PriorityTag[];
  requirements?: string;
  replanning?: { needed?: boolean; details?: string };
  preferredCountries?: string;
  readyVsCustom?: 'только готовые' | 'допускаем заказ';
  antiWants?: string;
  otherWishes?: string;
  budget?: '5–7 млн' | '7–10 млн' | '10+ млн';
  style: { tags: StyleTag[]; extra?: string; colors?: string; walls?: string; floors?: string; doors?: string };
  kitchen?: Record<string, unknown>;
  bathrooms?: Record<string, unknown>;
  storage?: string;
  lighting?: string;
  windows?: string;
  smartHome?: string;
}
```

## Генерация референсов

- Для выбранной комнаты строится промпт (варианты A–D) с учётом площади, стиля, материалов, ограничений и заметок.
- Если загружен план, в запрос к Gemini добавляется изображение планировки и используется vision-модель (по умолчанию `gemini-2.0-flash`).
- Для обоих режимов используется SDK `@google/genai` (модели по умолчанию `gemini-2.0-flash`).
- Если план загружен, первый вариант генерируется с учётом изображения планировки и площади (vision); остальные формируются по текстовому описанию.
- Без планировки создаются до четырёх PNG только по тексту.

## Экспорт документов

Файлы DOCX и PDF содержат:
- краткое ТЗ;
- контакты и общие параметры;
- детали по жителям, требованиям, стилю, планировке;
- данные из аккордеонов (кухня, санузлы и др.).

## Примечания

- Каталоги `uploads/` и `data/` игнорируются git и создаются автоматически.
- Обработка ошибок в API логирует стек, чтобы было проще отлавливать проблемы на фронте.
- Зависимости `docx`, `pdfkit`, `@google/genai` и `openai` требуются на серверной стороне; убедитесь, что у вас есть доступ к npm registry.
