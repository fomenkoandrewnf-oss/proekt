"use client";

import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import type { FinishType, HousingType, PlanInfo, PriorityTag, Room, RoomKind, StyleTag, TZForm } from '@/lib/types';

const housingOptions: Array<{ label: string; value: HousingType }> = [
  { label: 'Новостройка', value: 'новостройка' },
  { label: 'Вторичное жильё', value: 'вторичное жилье' },
];

const finishingOptions: Array<{ label: string; value: FinishType }> = [
  { label: 'Готовый ремонт', value: 'готовый ремонт' },
  { label: 'Вайтбокс', value: 'вайтбокс' },
  { label: 'Бетон', value: 'бетон' },
];

const roomKindOptions: Array<{ label: string; value: RoomKind }> = [
  { label: 'Кухня-гостиная', value: 'кухня-гостиная' },
  { label: 'Спальня', value: 'спальня' },
  { label: 'Детская', value: 'детская' },
  { label: 'Кабинет', value: 'кабинет' },
  { label: 'Санузел', value: 'санузел' },
  { label: 'Гардеробная', value: 'гардеробная' },
  { label: 'Кладовая', value: 'кладовая' },
  { label: 'Прихожая', value: 'прихожая' },
  { label: 'Лоджия / балкон', value: 'лоджия/балкон' },
  { label: 'Ванная', value: 'ванная' },
  { label: 'Гостевой санузел', value: 'гостевой санузел' },
];

const styleOptions: StyleTag[] = ['Mid Century', 'Минимализм', 'Лофт', 'Арт-деко', 'Современный', 'Современная классика', 'Джапанди'];
const priorityOptions: PriorityTag[] = ['уют', 'комфорт', 'практичность', 'креатив', 'роскошь'];

let roomCounter = 0;
const createRoom = (kind: RoomKind = 'кухня-гостиная'): Room => ({
  id: `room-${Date.now()}-${roomCounter++}`,
  kind,
  area: 0,
  wantRefs: false,
});

const defaultForm: TZForm = {
  contacts: {},
  housingType: 'новостройка',
  finish: 'готовый ремонт',
  totalArea: undefined,
  plan: null,
  rooms: [createRoom()],
  purpose: 'проживание',
  family: '',
  guests: '',
  pets: '',
  allergies: '',
  priorities: [],
  requirements: '',
  replanning: { needed: false, details: '' },
  preferredCountries: '',
  readyVsCustom: 'допускаем заказ',
  antiWants: '',
  otherWishes: '',
  budget: undefined,
  style: {
    tags: [],
    extra: '',
    colors: '',
    walls: '',
    floors: '',
    doors: '',
  },
  kitchen: {
    hob: '',
    burners: '',
    dishwasher: '',
    hood: '',
    fridge: '',
    sink: '',
    countertop: '',
    facades: '',
    backsplash: '',
    island: '',
    diningTable: '',
    appliances: '',
  },
  bathrooms: {
    main: '',
    guest: '',
    toilet: '',
    sink: '',
    washerDryer: '',
    towelWarmer: '',
    boiler: '',
  },
  storage: '',
  lighting: '',
  windows: '',
  smartHome: '',
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

function parseNumber(value: string) {
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

type AccordionKey = 'kitchen' | 'bathrooms' | 'storage' | 'lighting' | 'windows' | 'smartHome';

export default function Page() {
  const [form, setForm] = useState<TZForm>(defaultForm);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [planUploading, setPlanUploading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(form.rooms[0]?.id ?? null);
  const [planZoom, setPlanZoom] = useState(1);
  const [accordionState, setAccordionState] = useState<Record<AccordionKey, boolean>>({
    kitchen: false,
    bathrooms: false,
    storage: false,
    lighting: false,
    windows: false,
    smartHome: false,
  });

  const totalAreaError = useMemo(() => {
    if (!form.totalArea) return '';
    if (form.totalArea <= 10 || form.totalArea >= 1000) {
      return 'Площадь должна быть больше 10 и меньше 1000 м².';
    }
    return '';
  }, [form.totalArea]);

  const summaryCounter = summary ? `${summary.length} / 1000 символов` : '';

  const briefPreview = useMemo(
    () => summary || 'Здесь появится краткое ТЗ после анализа GPT…',
    [summary]
  );

  const selectedRoom = useMemo(
    () => form.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [form.rooms, selectedRoomId]
  );

  const canDownload = Boolean(summary);

  const handleContactChange = useCallback(
    (key: keyof TZForm['contacts']) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, contacts: { ...prev.contacts, [key]: value } }));
      },
    []
  );

  const handleTotalAreaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const numeric = parseNumber(event.target.value);
    setForm((prev) => ({ ...prev, totalArea: numeric }));
  };

  const handlePlanScaleToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const hasScale = event.target.checked;
    setForm((prev) => ({
      ...prev,
      plan: { ...(prev.plan ?? {}), hasScale, scaleNote: hasScale ? prev.plan?.scaleNote ?? '' : '' },
    }));
  };

  const handlePlanScaleNote = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, plan: { ...(prev.plan ?? {}), scaleNote: value } }));
  };

  const handleRoomField = (roomId: string, key: keyof Room, value: string) => {
    setForm((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => {
        if (room.id !== roomId) return room;
        if (key === 'area') {
          const numeric = parseNumber(value) ?? 0;
          return { ...room, area: numeric };
        }
        if (key === 'kind') {
          return { ...room, kind: value as RoomKind };
        }
        return { ...room, [key]: value };
      }),
    }));
  };

  const addRoom = () => {
    setForm((prev) => {
      const newRoom = createRoom('спальня');
      return { ...prev, rooms: [...prev.rooms, newRoom] };
    });
  };

  const removeRoom = (roomId: string) => {
    setForm((prev) => {
      const nextRooms = prev.rooms.filter((room) => room.id !== roomId);
      const nextSelectedId = nextRooms[0]?.id ?? null;
      const normalizedRooms = nextRooms.map((room) => ({
        ...room,
        wantRefs: room.id === nextSelectedId,
      }));
      setSelectedRoomId((current) => {
        if (!current || current === roomId) {
          return nextSelectedId;
        }
        return current;
      });
      return {
        ...prev,
        rooms: normalizedRooms,
      };
    });
  };

  const toggleStyle = (tag: StyleTag) => {
    setForm((prev) => {
      const exists = prev.style.tags.includes(tag);
      const tags = exists ? prev.style.tags.filter((item) => item !== tag) : [...prev.style.tags, tag];
      return { ...prev, style: { ...prev.style, tags } };
    });
  };

  const togglePriority = (tag: PriorityTag) => {
    setForm((prev) => {
      const current = Array.isArray(prev.priorities) ? prev.priorities : [];
      const exists = current.includes(tag);
      const priorities = exists ? current.filter((item) => item !== tag) : [...current, tag];
      return { ...prev, priorities };
    });
  };

  const toggleAccordion = (key: AccordionKey) => {
    setAccordionState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

const updateKitchen = (field: string) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      kitchen: { ...(prev.kitchen as Record<string, unknown>), [field]: value },
    }));
  };

const updateBathrooms = (field: string) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      bathrooms: { ...(prev.bathrooms as Record<string, unknown>), [field]: value },
    }));
  };

const updateSimpleSection = (section: 'storage' | 'lighting' | 'windows' | 'smartHome') =>
  (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [section]: value }));
  };

  const handlePlanUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPlanError(null);
    setPlanUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (form.totalArea) {
        formData.append('totalArea', String(form.totalArea));
      }
      const res = await fetch('/api/plan-upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Не удалось загрузить план');
      }
      const planInfo: PlanInfo = {
        fileId: payload.fileId,
        previewUrl: payload.previewUrl,
        originalName: payload.originalName,
        size: payload.size,
        mimeType: payload.mimeType,
        hasScale: false,
        scaleNote: '',
      };
      setForm((prev) => ({ ...prev, plan: planInfo }));
      setPlanZoom(1);
    } catch (error) {
      setPlanError((error as Error).message);
      setForm((prev) => ({ ...prev, plan: null }));
      console.error('Plan upload error:', error);
    } finally {
      setPlanUploading(false);
      event.target.value = '';
    }
  };

  const resetPlan = () => {
    setForm((prev) => ({ ...prev, plan: null }));
    setPlanError(null);
    setPlanZoom(1);
  };

  const handleSummarize = async () => {
    setSummaryLoading(true);
    try {
      const { summary } = await postJSON<{ summary: string }>('/api/brief', { form });
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
    if (!selectedRoom) {
      alert('Выберите помещение для генерации');
      return;
    }
    if (!selectedRoom.area || selectedRoom.area <= 0) {
      alert('Укажите площадь выбранного помещения');
      return;
    }

    setRefsLoading(true);
    try {
      const payload = {
        planFileId: form.plan?.fileId,
        room: { kind: selectedRoom.kind, area: selectedRoom.area, notes: selectedRoom.notes, name: selectedRoom.name },
        style: { tags: form.style.tags, extra: form.style.extra, colors: form.style.colors },
        materials: { walls: form.style.walls, floors: form.style.floors, doors: form.style.doors },
        constraints: {
          housingType: form.housingType,
          finish: form.finish,
          hasScale: form.plan?.hasScale,
          scaleNote: form.plan?.scaleNote,
        },
      };
      const { images } = await postJSON<{ images: string[] }>('/api/refs', payload);
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
  const allergiesEnabled = Boolean(form.allergies);

  return (
    <div className="container">
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>ТЗ NEW с дизайнером — форма</h2>
          <p className="hint">Заполните ключевые блоки. Краткое ТЗ ограничено 1000 символов.</p>

          <section>
            <h3>Контакты</h3>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Телефон</label>
                <input className="input" value={form.contacts.phone ?? ''} onChange={handleContactChange('phone')} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" value={form.contacts.email ?? ''} onChange={handleContactChange('email')} />
              </div>
            </div>
            <label className="label" style={{ marginTop: 12 }}>Адрес</label>
            <input className="input" value={form.contacts.address ?? ''} onChange={handleContactChange('address')} />
          </section>

          <section>
            <h3>Общие параметры</h3>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Тип жилья</label>
                <select
                  className="input"
                  value={form.housingType}
                  onChange={(event) => setForm((prev) => ({ ...prev, housingType: event.target.value as HousingType }))}
                >
                  {housingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Отделка</label>
                <select
                  className="input"
                  value={form.finish}
                  onChange={(event) => setForm((prev) => ({ ...prev, finish: event.target.value as FinishType }))}
                >
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
              value={form.totalArea ?? ''}
              onChange={handleTotalAreaChange}
              placeholder="Например, 65"
            />
            {totalAreaError && <div className="hint" style={{ color: '#dc2626' }}>{totalAreaError}</div>}
          </section>

          <section>
            <h3>Планировка</h3>
            <p className="hint">Загрузите jpg, png или pdf. Для точности отметьте наличие масштаба.</p>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handlePlanUpload} disabled={planUploading} />
            {planUploading && <div className="hint">Загрузка…</div>}
            {planError && <div className="hint" style={{ color: '#dc2626' }}>{planError}</div>}
            {form.plan && (
              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{form.plan.originalName}</strong>
                    <div className="hint">
                      {form.plan.size ? `${Math.round((form.plan.size ?? 0) / 1024)} КБ` : ''} · {form.plan.mimeType}
                    </div>
                  </div>
                  <button className="button secondary" type="button" onClick={resetPlan}>
                    Удалить
                  </button>
                </div>
                {form.plan.previewUrl && form.plan.mimeType?.startsWith('image/') ? (
                  <div style={{ marginTop: 12 }}>
                    <label className="label">Масштаб превью</label>
                    <input
                      type="range"
                      min={1}
                      max={2}
                      step={0.1}
                      value={planZoom}
                      onChange={(event) => setPlanZoom(Number(event.target.value))}
                    />
                    <div
                      style={{
                        marginTop: 12,
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        overflow: 'auto',
                        maxHeight: 280,
                        background: '#f9fafb',
                      }}
                    >
                      <div style={{ transform: `scale(${planZoom})`, transformOrigin: 'top left' }}>
                        <img
                          src={form.plan.previewUrl}
                          alt="Превью планировки"
                          style={{ maxWidth: '100%', display: 'block' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="hint" style={{ marginTop: 12 }}>
                    Превью доступно только для изображений. {form.plan.previewUrl ? (
                      <a href={form.plan.previewUrl} target="_blank" rel="noreferrer">
                        Открыть план
                      </a>
                    ) : (
                      'Файл сохранён на сервере.'
                    )}
                  </div>
                )}
                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={form.plan.hasScale ?? false} onChange={handlePlanScaleToggle} />
                    На плане есть масштаб/размеры
                  </label>
                  {form.plan.hasScale && (
                    <input
                      className="input"
                      style={{ maxWidth: 240 }}
                      placeholder="Например, 1 см = 1 м"
                      value={form.plan.scaleNote ?? ''}
                      onChange={handlePlanScaleNote}
                    />
                  )}
                </div>
              </div>
            )}
          </section>

          <section>
            <h3>Помещения</h3>
            <p className="hint">Добавьте комнаты, площадь и отметьте одну для генерации референса.</p>
            <div className="grid" style={{ gap: 12 }}>
              {form.rooms.map((room) => (
                <div
                  key={room.id}
                  className="grid"
                  style={{ gridTemplateColumns: '1.1fr 0.8fr 1fr auto', gap: 8, alignItems: 'center' }}
                >
                  <select
                    className="input"
                    value={room.kind}
                    onChange={(event) => handleRoomField(room.id, 'kind', event.target.value)}
                  >
                    {roomKindOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    value={room.name ?? ''}
                    onChange={(event) => handleRoomField(room.id, 'name', event.target.value)}
                    placeholder="Название (опционально)"
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={room.area || ''}
                    onChange={(event) => handleRoomField(room.id, 'area', event.target.value)}
                    placeholder="м²"
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label className="badge" style={{ cursor: 'pointer', display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="room-ref"
                        checked={selectedRoomId === room.id}
                        onChange={() => {
                          setSelectedRoomId(room.id);
                          setForm((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((item) => ({ ...item, wantRefs: item.id === room.id })),
                          }));
                        }}
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
                  <textarea
                    className="input"
                    rows={2}
                    value={room.notes ?? ''}
                    onChange={(event) => handleRoomField(room.id, 'notes', event.target.value)}
                    placeholder="Особые требования (рабочее место, пианино...)"
                    style={{ gridColumn: '1 / -1' }}
                  />
                </div>
              ))}
            </div>
            <button className="button secondary" type="button" style={{ marginTop: 8 }} onClick={addRoom}>
              + Добавить комнату
            </button>
          </section>

          <section>
            <h3>Назначение и жители</h3>
            <label className="label">Назначение объекта</label>
            <select
              className="input"
              value={form.purpose}
              onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value as TZForm['purpose'] }))}
            >
              <option value="проживание">Проживание</option>
              <option value="аренда">Аренда</option>
              <option value="инвестиции">Инвестиции</option>
            </select>
            <label className="label" style={{ marginTop: 12 }}>Состав семьи</label>
            <input className="input" value={form.family ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, family: event.target.value }))} placeholder="Например: 2 взрослых, ребёнок" />
            <label className="label" style={{ marginTop: 12 }}>Гости</label>
            <input className="input" value={form.guests ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, guests: event.target.value }))} placeholder="Частота и количество" />
            <label className="label" style={{ marginTop: 12 }}>Домашние животные</label>
            <input className="input" value={form.pets ?? ''} onChange={(event) => setForm((prev) => ({ ...prev, pets: event.target.value }))} placeholder="Кто и что учесть" />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={allergiesEnabled}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, allergies: event.target.checked ? prev.allergies ?? '' : '' }))
                  }
                />
                Аллергии
              </label>
              {allergiesEnabled && (
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={form.allergies ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, allergies: event.target.value }))}
                  placeholder="Например: пыль, латекс"
                />
              )}
            </div>
            <label className="label" style={{ marginTop: 12 }}>Что самое важное</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {priorityOptions.map((tag) => (
                <label key={tag} className="badge" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.priorities?.includes(tag) ?? false}
                    onChange={() => togglePriority(tag)}
                    style={{ marginRight: 6 }}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3>Требования</h3>
            <label className="label">Что нужно предусмотреть в интерьере</label>
            <textarea
              className="input"
              rows={3}
              value={form.requirements ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, requirements: event.target.value }))}
            />
            {form.housingType === 'новостройка' && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.replanning?.needed ?? false}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        replanning: { ...(prev.replanning ?? {}), needed: event.target.checked },
                      }))
                    }
                  />
                  Нужна перепланировка
                </label>
                {form.replanning?.needed && (
                  <textarea
                    className="input"
                    rows={2}
                    value={form.replanning?.details ?? ''}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        replanning: { ...(prev.replanning ?? {}), details: event.target.value },
                      }))
                    }
                    placeholder="Что именно планируем изменить"
                  />
                )}
                <div>
                  <label className="label">Страны-производители / бренды</label>
                  <input
                    className="input"
                    value={form.preferredCountries ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, preferredCountries: event.target.value }))}
                    placeholder="Например: Италия, Россия"
                  />
                </div>
              </div>
            )}
            <label className="label" style={{ marginTop: 12 }}>Готовые изделия / заказные позиции</label>
            <select
              className="input"
              value={form.readyVsCustom ?? 'допускаем заказ'}
              onChange={(event) => setForm((prev) => ({ ...prev, readyVsCustom: event.target.value as TZForm['readyVsCustom'] }))}
            >
              <option value="только готовые">Только готовые</option>
              <option value="допускаем заказ">Допускаем заказ</option>
            </select>
            <label className="label" style={{ marginTop: 12 }}>Что точно НЕ хотим</label>
            <textarea
              className="input"
              rows={2}
              value={form.antiWants ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, antiWants: event.target.value }))}
            />
            <label className="label" style={{ marginTop: 12 }}>Прочие пожелания</label>
            <textarea
              className="input"
              rows={2}
              value={form.otherWishes ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, otherWishes: event.target.value }))}
            />
            <label className="label" style={{ marginTop: 12 }}>Бюджет (без строительно-монтажных работ)</label>
            <select
              className="input"
              value={form.budget ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value as TZForm['budget'] }))}
            >
              <option value="">Не указано</option>
              <option value="5–7 млн">5–7 млн</option>
              <option value="7–10 млн">7–10 млн</option>
              <option value="10+ млн">10+ млн</option>
            </select>
          </section>

          <section>
            <h3>Стиль и отделка</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
              {styleOptions.map((style) => (
                <label key={style} className="badge" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.style.tags.includes(style)}
                    onChange={() => toggleStyle(style)}
                    style={{ marginRight: 6 }}
                  />
                  {style}
                </label>
              ))}
            </div>
            <label className="label" style={{ marginTop: 12 }}>Дополнительный стиль</label>
            <input
              className="input"
              value={form.style.extra ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, style: { ...prev.style, extra: event.target.value } }))}
              placeholder="Например: сканди, модерн"
            />
            <label className="label" style={{ marginTop: 12 }}>Цветовая гамма</label>
            <input
              className="input"
              value={form.style.colors ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, style: { ...prev.style, colors: event.target.value } }))}
              placeholder="Например: бежевый + глубокий синий"
            />
            <label className="label" style={{ marginTop: 12 }}>Пожелания по отделке стен</label>
            <textarea
              className="input"
              rows={2}
              value={form.style.walls ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, style: { ...prev.style, walls: event.target.value } }))}
              placeholder="Например: покраска, деревянные панели"
            />
            <label className="label" style={{ marginTop: 12 }}>Пожелания по напольному покрытию</label>
            <textarea
              className="input"
              rows={2}
              value={form.style.floors ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, style: { ...prev.style, floors: event.target.value } }))}
              placeholder="Например: инженерная доска в спальне, керамогранит в кухне"
            />
            <label className="label" style={{ marginTop: 12 }}>Межкомнатные двери</label>
            <textarea
              className="input"
              rows={2}
              value={form.style.doors ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, style: { ...prev.style, doors: event.target.value } }))}
              placeholder="Например: скрытого монтажа, распашные"
            />
          </section>

          <section>
            <h3>Дополнительные блоки</h3>
            <div className="grid" style={{ gap: 8 }}>
              {(
                [
                  { key: 'kitchen' as const, title: 'Кухня' },
                  { key: 'bathrooms' as const, title: 'Санузлы' },
                  { key: 'storage' as const, title: 'Хранение' },
                  { key: 'lighting' as const, title: 'Свет' },
                  { key: 'windows' as const, title: 'Окна / шторы' },
                  { key: 'smartHome' as const, title: 'Техника / умный дом / климат' },
                ] as Array<{ key: AccordionKey; title: string }>
              ).map(({ key, title }) => (
                <div key={key} className="card" style={{ padding: 12 }}>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ width: '100%', justifyContent: 'space-between' }}
                    onClick={() => toggleAccordion(key)}
                  >
                    {accordionState[key] ? 'Скрыть' : 'Показать'} детали — {title}
                  </button>
                  {accordionState[key] && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {key === 'kitchen' && (
                        <>
                          <input className="input" placeholder="Плита: тип / конфорки" value={(form.kitchen as any)?.hob ?? ''} onChange={updateKitchen('hob')} />
                          <input className="input" placeholder="Духовой шкаф" value={(form.kitchen as any)?.oven ?? ''} onChange={updateKitchen('oven')} />
                          <input className="input" placeholder="Посудомоечная машина (45/60)" value={(form.kitchen as any)?.dishwasher ?? ''} onChange={updateKitchen('dishwasher')} />
                          <input className="input" placeholder="Вытяжка" value={(form.kitchen as any)?.hood ?? ''} onChange={updateKitchen('hood')} />
                          <input className="input" placeholder="Холодильник" value={(form.kitchen as any)?.fridge ?? ''} onChange={updateKitchen('fridge')} />
                          <input className="input" placeholder="Мойка" value={(form.kitchen as any)?.sink ?? ''} onChange={updateKitchen('sink')} />
                          <input className="input" placeholder="Столешница" value={(form.kitchen as any)?.countertop ?? ''} onChange={updateKitchen('countertop')} />
                          <input className="input" placeholder="Фасады" value={(form.kitchen as any)?.facades ?? ''} onChange={updateKitchen('facades')} />
                          <input className="input" placeholder="Фартук" value={(form.kitchen as any)?.backsplash ?? ''} onChange={updateKitchen('backsplash')} />
                          <input className="input" placeholder="Остров" value={(form.kitchen as any)?.island ?? ''} onChange={updateKitchen('island')} />
                          <input className="input" placeholder="Обеденный стол" value={(form.kitchen as any)?.diningTable ?? ''} onChange={updateKitchen('diningTable')} />
                          <textarea className="input" rows={2} placeholder="Техника" value={(form.kitchen as any)?.appliances ?? ''} onChange={updateKitchen('appliances')} />
                        </>
                      )}
                      {key === 'bathrooms' && (
                        <>
                          <textarea className="input" rows={2} placeholder="Основной санузел: ванна/душ" value={(form.bathrooms as any)?.main ?? ''} onChange={updateBathrooms('main')} />
                          <textarea className="input" rows={2} placeholder="Гостевой санузел" value={(form.bathrooms as any)?.guest ?? ''} onChange={updateBathrooms('guest')} />
                          <input className="input" placeholder="Унитаз" value={(form.bathrooms as any)?.toilet ?? ''} onChange={updateBathrooms('toilet')} />
                          <input className="input" placeholder="Раковина" value={(form.bathrooms as any)?.sink ?? ''} onChange={updateBathrooms('sink')} />
                          <input className="input" placeholder="Стиралка/сушка" value={(form.bathrooms as any)?.washerDryer ?? ''} onChange={updateBathrooms('washerDryer')} />
                          <input className="input" placeholder="Полотенцесушитель" value={(form.bathrooms as any)?.towelWarmer ?? ''} onChange={updateBathrooms('towelWarmer')} />
                          <input className="input" placeholder="Бойлер" value={(form.bathrooms as any)?.boiler ?? ''} onChange={updateBathrooms('boiler')} />
                        </>
                      )}
                      {key === 'storage' && (
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Встроенные шкафы, гардеробные, прачечная"
                          value={form.storage ?? ''}
                          onChange={updateSimpleSection('storage')}
                        />
                      )}
                      {key === 'lighting' && (
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Сценарии света, треки, диммеры"
                          value={form.lighting ?? ''}
                          onChange={updateSimpleSection('lighting')}
                        />
                      )}
                      {key === 'windows' && (
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Откосы, тип штор"
                          value={form.windows ?? ''}
                          onChange={updateSimpleSection('windows')}
                        />
                      )}
                      {key === 'smartHome' && (
                        <textarea
                          className="input"
                          rows={3}
                          placeholder="Техника, умный дом, климат"
                          value={form.smartHome ?? ''}
                          onChange={updateSimpleSection('smartHome')}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
          {summaryCounter && <div className="hint">{summaryCounter}</div>}
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
          <p className="hint">Выберите помещение из списка и получите 4 варианта.</p>
          <button className="button" onClick={handleRefs} disabled={!summary || !selectedRoom || refsLoading}>
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
                {images.map((_, index) => (
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
