"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { BriefFormData, BriefRoom, UploadedPlanInfo } from '@/lib/types';

const housingOptions: Array<{ label: string; value: BriefFormData['housingType'] }> = [
  { label: 'Новостройка', value: 'новостройка' },
  { label: 'Вторичное жильё', value: 'вторичное жильё' },
];

const finishingOptions: Array<{ label: string; value: BriefFormData['finishing'] }> = [
  { label: 'Готовый ремонт', value: 'готовый ремонт' },
  { label: 'Вайтбокс', value: 'вайтбокс' },
  { label: 'Бетон', value: 'бетон' },
];

const styleOptions = ['Mid Century', 'Минимализм', 'Лофт', 'Арт-деко', 'Современный', 'Современная классика', 'Джапанди'];

let roomCounter = 0;
const createRoom = (name = '', area: number | string | '' = ''): BriefRoom => ({
  id: `room-${Date.now()}-${roomCounter++}`,
  name,
  area,
});

const defaultForm: BriefFormData = {
  contacts: { phone: '', email: '', address: '' },
  housingType: 'новостройка',
  finishing: 'готовый ремонт',
  totalArea: '',
  rooms: [createRoom('Кухня-гостиная', '')],
  purpose: '',
  family: '',
  guests: '',
  pets: '',
  requirements: '',
  replanning: '',
  manufacturers: '',
  readyMade: '',
  styles: [],
  customStyle: '',
  colorScheme: '',
  wallFinish: '',
  floorFinish: '',
  doors: '',
  other: '',
  dontWant: '',
  plan: null,
};

async function postJSON<T>(url: string, data: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (payload as any)?.error || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return payload as T;
}

export default function Page() {
  const [form, setForm] = useState<BriefFormData>(defaultForm);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [planUploading, setPlanUploading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planPreview, setPlanPreview] = useState<string | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(defaultForm.rooms[0]?.id ?? null);

  useEffect(() => {
    return () => {
      if (planPreview) URL.revokeObjectURL(planPreview);
    };
  }, [planPreview]);

  useEffect(() => {
    if (!form.rooms.find((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(form.rooms[0]?.id ?? null);
    }
  }, [form.rooms, selectedRoomId]);

  const briefPreview = useMemo(
    () => summary || 'Здесь появится краткое ТЗ после анализа GPT…',
    [summary]
  );

  const selectedRoomName = useMemo(() => {
    return form.rooms.find((room) => room.id === selectedRoomId)?.name?.trim() ?? '';
  }, [form.rooms, selectedRoomId]);

  const canDownload = Boolean(summary);

  const handleContactChange = useCallback(
    (key: keyof BriefFormData['contacts']) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, contacts: { ...prev.contacts, [key]: value } }));
      },
    []
  );

  const handleFormFieldChange = useCallback(
    (key: keyof BriefFormData) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [key]: value } as BriefFormData));
      },
    []
  );

  const handleTotalAreaChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const numeric = value === '' ? '' : Number(value);
    setForm((prev) => ({ ...prev, totalArea: Number.isNaN(numeric) ? value : numeric }));
  }, []);

  const handleRoomChange = (roomId: string, key: keyof BriefRoom, value: string) => {
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId ? { ...room, [key]: key === 'area' ? value : value } : room
      ),
    }));
  };

  const addRoom = () => {
    setForm((prev) => ({
      ...prev,
      rooms: [...prev.rooms, createRoom('Новое помещение', '')],
    }));
  };

  const removeRoom = (roomId: string) => {
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((room) => room.id !== roomId),
    }));
  };

  const toggleStyle = (style: string) => {
    setForm((prev) => {
      const exists = prev.styles.includes(style);
      const styles = exists ? prev.styles.filter((s) => s !== style) : [...prev.styles, style];
      return { ...prev, styles };
    });
  };

  const handlePlanUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setPlanError(null);

    if (planPreview) {
      URL.revokeObjectURL(planPreview);
      setPlanPreview(null);
    }

    const preview = file.type.startsWith('image') ? URL.createObjectURL(file) : null;
    setPlanUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Не удалось загрузить файл');
      }
      const planInfo: UploadedPlanInfo = {
        id: payload.id,
        originalName: payload.originalName,
        size: payload.size,
        mimeType: payload.mimeType,
      };
      setForm((prev) => ({ ...prev, plan: planInfo }));
      setPlanPreview(preview);
    } catch (error) {
      if (preview) URL.revokeObjectURL(preview);
      setForm((prev) => ({ ...prev, plan: null }));
      const message = (error as Error).message || 'Не удалось загрузить планировку';
      setPlanError(message);
      console.error('Plan upload error:', error);
    } finally {
      setPlanUploading(false);
      input.value = '';
    }
  };

  const resetPlan = () => {
    if (planPreview) {
      URL.revokeObjectURL(planPreview);
      setPlanPreview(null);
    }
    setForm((prev) => ({ ...prev, plan: null }));
    setPlanError(null);
  };

  const handleSummarize = async () => {
    setSummaryLoading(true);
    try {
      const { summary } = await postJSON<{ summary: string }>('/api/summarize', { form });
      setSummary(summary);
    } catch (error) {
      console.error('Summarize error:', error);
      alert('Ошибка анализа ТЗ: ' + (error as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleRefs = async () => {
    if (!summary) {
      alert('Сначала соберите краткое ТЗ');
      return;
    }
    if (!selectedRoomName) {
      alert('Выберите помещение для генерации');
      return;
    }
    setRefsLoading(true);
    try {
      const { images } = await postJSON<{ images: string[] }>('/api/refs', {
        brief: summary,
        rooms: [selectedRoomName],
        count: 4,
        form,
      });
      setImages(images);
      setSelectedImageIndex(0);
    } catch (error) {
      console.error('Refs generation error:', error);
      alert('Ошибка генерации референсов: ' + (error as Error).message);
    } finally {
      setRefsLoading(false);
    }
  };

  const download = async (kind: 'docx' | 'pdf') => {
    if (!summary) return;
    try {
      const res = await fetch(`/api/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, title: 'Краткое ТЗ (автогенерация)', form }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Не удалось скачать файл');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'docx' ? 'brief.docx' : 'brief.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Download ${kind} failed:`, error);
      alert('Не удалось скачать файл: ' + (error as Error).message);
    }
  };

  const selectedImage = images[selectedImageIndex];

  return (
    <div className="container">
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>ТЗ NEW с дизайнером — форма</h2>
          <p className="hint">Заполните данные клиента, выберите тип жилья и добавьте планировку. Краткое ТЗ ограничено 1000 символами.</p>

          <section>
            <h3>Контакты</h3>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="label">Телефон</label>
                <input className="input" value={form.contacts.phone} onChange={handleContactChange('phone')} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" value={form.contacts.email} onChange={handleContactChange('email')} />
              </div>
            </div>
            <label className="label" style={{ marginTop: 12 }}>Адрес</label>
            <input className="input" value={form.contacts.address} onChange={handleContactChange('address')} />
          </section>

          <section>
            <h3>Общие параметры</h3>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="label">Тип жилья</label>
                <select className="input" value={form.housingType} onChange={handleFormFieldChange('housingType')}>
                  {housingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Отделка</label>
                <select className="input" value={form.finishing} onChange={handleFormFieldChange('finishing')}>
                  {finishingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="label" style={{ marginTop: 12 }}>Общая площадь квартиры, м²</label>
            <input
              className="input"
              type="number"
              min={0}
              value={typeof form.totalArea === 'number' ? form.totalArea : form.totalArea ?? ''}
              onChange={handleTotalAreaChange}
              placeholder="Например, 65"
            />
          </section>

          <section>
            <h3>Помещения</h3>
            <p className="hint">Добавьте все комнаты и укажите их площадь. Для генерации референсов можно выбрать только одно помещение за раз.</p>
            <div className="grid" style={{ gap: 12 }}>
              {form.rooms.map((room) => (
                <div
                  key={room.id}
                  className="grid"
                  style={{ gridTemplateColumns: '1.2fr 0.6fr auto auto', gap: 8, alignItems: 'center' }}
                >
                  <input
                    className="input"
                    value={room.name}
                    onChange={(event) => handleRoomChange(room.id, 'name', event.target.value)}
                    placeholder="Название комнаты"
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={room.area as number | string}
                    onChange={(event) => handleRoomChange(room.id, 'area', event.target.value)}
                    placeholder="м²"
                  />
                  <label className="badge" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedRoomId === room.id}
                      disabled={!!selectedRoomId && selectedRoomId !== room.id}
                      onChange={(event) => setSelectedRoomId(event.target.checked ? room.id : null)}
                    />
                    Референс
                  </label>
                  {form.rooms.length > 1 && (
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      style={{ padding: '6px 10px' }}
                    >
                      Удалить
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="button secondary" type="button" style={{ marginTop: 8 }} onClick={addRoom}>
              + Добавить комнату
            </button>
          </section>

          <section>
            <h3>Планировка</h3>
            <p className="hint">Загрузите jpg, png или pdf. Файл будет сохранён на сервере для дальнейшей работы.</p>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handlePlanUpload} disabled={planUploading} />
            {planUploading && <div className="hint">Загрузка…</div>}
            {planError && <div className="hint" style={{ color: '#dc2626' }}>{planError}</div>}
            {form.plan && (
              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{form.plan.originalName}</strong>
                    <div className="hint">{Math.round(form.plan.size / 1024)} КБ · {form.plan.mimeType}</div>
                  </div>
                  <button className="button secondary" type="button" onClick={resetPlan}>
                    Удалить
                  </button>
                </div>
                {planPreview && (
                  <img src={planPreview} alt="Превью планировки" style={{ marginTop: 12, maxHeight: 240, objectFit: 'contain' }} />
                )}
              </div>
            )}
          </section>

          <section>
            <h3>Назначение и жители</h3>
            <label className="label">Назначение объекта</label>
            <input className="input" value={form.purpose} onChange={handleFormFieldChange('purpose')} placeholder="Проживание, аренда, инвестиции…" />
            <label className="label" style={{ marginTop: 12 }}>Состав семьи</label>
            <input className="input" value={form.family} onChange={handleFormFieldChange('family')} placeholder="Например, 2 взрослых и ребёнок" />
            <label className="label" style={{ marginTop: 12 }}>Гости</label>
            <input className="input" value={form.guests} onChange={handleFormFieldChange('guests')} placeholder="Как часто принимают гостей" />
            <label className="label" style={{ marginTop: 12 }}>Домашние животные</label>
            <input className="input" value={form.pets} onChange={handleFormFieldChange('pets')} />
          </section>

          <section>
            <h3>Требования</h3>
            <label className="label">Что нужно предусмотреть в интерьере</label>
            <textarea className="input" rows={3} value={form.requirements} onChange={handleFormFieldChange('requirements')} />
            {form.housingType === 'новостройка' && (
              <>
                <label className="label" style={{ marginTop: 12 }}>Перепланировка</label>
                <textarea className="input" rows={2} value={form.replanning} onChange={handleFormFieldChange('replanning')} />
                <label className="label" style={{ marginTop: 12 }}>Страны-производители</label>
                <input className="input" value={form.manufacturers} onChange={handleFormFieldChange('manufacturers')} placeholder="Предпочтительные бренды и страны" />
              </>
            )}
            <label className="label" style={{ marginTop: 12 }}>Готовые изделия / заказные позиции</label>
            <textarea className="input" rows={2} value={form.readyMade} onChange={handleFormFieldChange('readyMade')} />
            <label className="label" style={{ marginTop: 12 }}>Что точно НЕ хотим</label>
            <textarea className="input" rows={2} value={form.dontWant} onChange={handleFormFieldChange('dontWant')} />
            <label className="label" style={{ marginTop: 12 }}>Прочие пожелания</label>
            <textarea className="input" rows={2} value={form.other} onChange={handleFormFieldChange('other')} />
          </section>

          <section>
            <h3>Стиль и отделка</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
              {styleOptions.map((style) => (
                <label key={style} className="badge" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.styles.includes(style)}
                    onChange={() => toggleStyle(style)}
                    style={{ marginRight: 6 }}
                  />
                  {style}
                </label>
              ))}
            </div>
            <label className="label" style={{ marginTop: 12 }}>Дополнительный стиль</label>
            <input className="input" value={form.customStyle} onChange={handleFormFieldChange('customStyle')} placeholder="Если нужно уточнить стилистику" />
            <label className="label" style={{ marginTop: 12 }}>Цветовая гамма</label>
            <input className="input" value={form.colorScheme} onChange={handleFormFieldChange('colorScheme')} />
            <label className="label" style={{ marginTop: 12 }}>Пожелания по отделке стен</label>
            <textarea className="input" rows={2} value={form.wallFinish} onChange={handleFormFieldChange('wallFinish')} />
            <label className="label" style={{ marginTop: 12 }}>Пожелания по напольному покрытию</label>
            <textarea className="input" rows={2} value={form.floorFinish} onChange={handleFormFieldChange('floorFinish')} />
            <label className="label" style={{ marginTop: 12 }}>Межкомнатные двери</label>
            <input className="input" value={form.doors} onChange={handleFormFieldChange('doors')} />
          </section>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="button" onClick={handleSummarize} disabled={summaryLoading}>
              {summaryLoading ? 'Анализируем…' : 'Собрать краткое ТЗ (GPT)'}
            </button>
            <span className="badge">API ключ хранится в .env.local</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>Краткое ТЗ</h2>
          <p className="hint">GPT формирует текст до 1000 символов.</p>
          <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', border: '1px solid #eee', borderRadius: 12, padding: 12, minHeight: 220 }}>
            {briefPreview}
          </div>
          {summary && <div className="hint">{summary.length} / 1000 символов</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button secondary" disabled={!canDownload} onClick={() => download('docx')}>
              Скачать .docx
            </button>
            <button className="button secondary" disabled={!canDownload} onClick={() => download('pdf')}>
              Скачать .pdf
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />

          <h3>Генерация референсов</h3>
          <p className="hint">Выберите помещение из списка выше и получите 4 варианта внутри одного сета.</p>
          <button className="button" onClick={handleRefs} disabled={!summary || !selectedRoomName || refsLoading}>
            {refsLoading ? 'Генерируем…' : 'Сгенерировать референсы'}
          </button>

          {images.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={`data:image/png;base64,${selectedImage}`}
                  alt={`Референс ${selectedImageIndex + 1}`}
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #e5e7eb' }}
                />
                <span className="badge" style={{ position: 'absolute', top: 8, left: 8 }}>
                  Вариант {selectedImageIndex + 1} из {images.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {images.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    className="button secondary"
                    style={{
                      padding: '6px 10px',
                      background: index === selectedImageIndex ? '#111827' : '#fff',
                      color: index === selectedImageIndex ? '#fff' : '#111827',
                    }}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    if (!selectedImage) return;
                    const link = document.createElement('a');
                    link.href = `data:image/png;base64,${selectedImage}`;
                    link.download = `ref-${selectedImageIndex + 1}.png`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                >
                  Скачать выбранное изображение
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setImages([]);
                    setSelectedImageIndex(0);
                  }}
                >
                  Сбросить результаты
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
