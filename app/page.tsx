"use client";
import { useMemo, useState } from 'react';

// ——— Simplified schema aligned with your PDF (ключевые блоки)
const defaultAnswers = {
  contacts: { phone: '', email: '', address: '' },
  family: { members: '', pets: '' },
  goals: { purpose: ['проживание'], dontWant: 'золото, вычурность, сложные панно...' },
  style: { styles: ['современный', 'неоклассика'], mood: ['уют', 'практичность'], palette: 'светлые бежевые + акценты: глубокий синий/зелёный/бордо' },
  zoning: { rooms: ['кухня-гостиная','спальня','кабинет','санузел','гостевой су','гардеробная','кладовая'] },
  kitchen: { hob: 'индукция', burners: '3-4', oven: '450мм с СВЧ', sink: 'одинарная встроенная', pmm: '600мм', hood: 'угольная', fridge: 'встроенный 600мм', island: 'по возможности', table: 'на 4, раскладной' },
  bedroom: { bed: '180 см', storage: 'под кроватью + гардеробная', tv: true, vanity: true },
  bathrooms: { main: 'ванна 1700-1800, инсталляция, эл. полотенцесушитель', guest: 'душ 1200, см+суш., гигиенический душ' },
  finish: { floors: 'инженерная/паркетная доска, тёплый пол в СУ/ванна/коридор', walls: 'покраска + локальные деревянные панели', ceiling: 'ГКЛ или натяжной', doors: 'классические h=2600' },
  tech: { smart: 'Алиса', sockets: 'добавить розетки; мастер-выключатель', internet: 'Wi‑Fi, скрытый роутер', notes: 'учесть место робота‑пылесоса' },
  budget: '7–10 млн ₽ (без строительно-монтажных работ)'
};

async function postJSON(url: string, data: any, init?: RequestInit) {
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...init,
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try { message = JSON.parse(text).error || message; } catch {}
    throw new Error(message);
  }
  return res.json();
}

export default function Page() {
  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const [answers, setAnswers] = useState<any>(defaultAnswers);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const roomOptions = ['кухня-гостиная','спальня','детская','кабинет','санузел'];
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const canDownload = !!summary;

  const briefPreview = useMemo(() => summary || 'Здесь появится краткое ТЗ после анализа GPT…', [summary]);

  async function handleSummarize() {
    setLoading(true);
    try {
      const { summary } = await postJSON('/api/summarize', { answers });
      setSummary(summary);
    } catch (e) {
      console.error('Summarize error:', e);
      alert('Ошибка анализа ТЗ: ' + (e as Error).message);
    } finally { setLoading(false); }
  }

  async function handleRefs() {
    if (!summary) { alert('Сначала получите краткое ТЗ'); return; }
    if (!selectedRoom) { alert('Выберите помещение'); return; }
    setLoading(true);
    try {
      const headers = geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : undefined;
      const { images } = await postJSON(
        '/api/refs',
        { brief: summary, rooms: [selectedRoom], count: 4 },
        headers ? { headers } : undefined,
      );
      setImages(images);
    } catch (e) {
      console.error('Refs generation error:', e);
      alert('Ошибка генерации референсов: ' + (e as Error).message);
    } finally { setLoading(false); }
  }

  async function download(kind: 'docx'|'pdf') {
    if (!summary) return;
    const res = await fetch(`/api/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, title: 'Краткое ТЗ (автогенерация)' }) });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Download ${kind} failed:`, text);
      alert('Не удалось скачать файл: ' + text);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = kind === 'docx' ? 'brief.docx' : 'brief.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="card">
          <h2>ТЗ NEW с дизайнером — ответы клиента</h2>
          <p className="hint">Минимально жизнеспособная форма: отражает ключевые поля из вашего PDF. При желании расширим 1:1.</p>
          <hr />

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="label">Телефон</label>
              <input className="input" value={answers.contacts.phone} onChange={e=>setAnswers({ ...answers, contacts:{...answers.contacts, phone:e.target.value}})} />
            </div>
            <div>
              <label className="label">E‑mail</label>
              <input className="input" value={answers.contacts.email} onChange={e=>setAnswers({ ...answers, contacts:{...answers.contacts, email:e.target.value}})} />
            </div>
          </div>

          <label className="label" style={{marginTop:12}}>Адрес</label>
          <input className="input" value={answers.contacts.address} onChange={e=>setAnswers({ ...answers, contacts:{...answers.contacts, address:e.target.value}})} />

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="label">Состав семьи</label>
              <input className="input" value={answers.family.members} onChange={e=>setAnswers({ ...answers, family:{...answers.family, members:e.target.value}})} />
            </div>
            <div>
              <label className="label">Домашние животные</label>
              <input className="input" value={answers.family.pets} onChange={e=>setAnswers({ ...answers, family:{...answers.family, pets:e.target.value}})} />
            </div>
          </div>

          <label className="label" style={{marginTop:12}}>Стиль и атмосфера</label>
          <input className="input" value={answers.style.palette} onChange={e=>setAnswers({ ...answers, style:{...answers.style, palette:e.target.value}})} />

          <label className="label" style={{marginTop:12}}>Что точно НЕ хотим</label>
          <input className="input" value={answers.goals.dontWant} onChange={e=>setAnswers({ ...answers, goals:{...answers.goals, dontWant:e.target.value}})} />

          <label className="label" style={{marginTop:12}}>Зонирование — комнаты</label>
          <textarea className="input" rows={3} value={answers.zoning.rooms.join(', ')} onChange={(e)=>setAnswers({ ...answers, zoning:{...answers.zoning, rooms:e.target.value.split(',').map((s)=>s.trim())}})} />

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="label">Кухня — плита</label>
              <input className="input" value={answers.kitchen.hob} onChange={e=>setAnswers({ ...answers, kitchen:{...answers.kitchen, hob:e.target.value}})} />
            </div>
            <div>
              <label className="label">Духовой шкаф</label>
              <input className="input" value={answers.kitchen.oven} onChange={e=>setAnswers({ ...answers, kitchen:{...answers.kitchen, oven:e.target.value}})} />
            </div>
          </div>

          <label className="label" style={{marginTop:12}}>Отделка — кратко</label>
          <textarea className="input" rows={2} value={answers.finish.floors} onChange={(e)=>setAnswers({ ...answers, finish:{...answers.finish, floors:e.target.value}})} />

          <label className="label" style={{marginTop:12}}>Технические требования</label>
          <textarea className="input" rows={2} value={answers.tech.notes} onChange={(e)=>setAnswers({ ...answers, tech:{...answers.tech, notes:e.target.value}})} />

          <div style={{ display:'flex', gap:12, marginTop:16 }}>
            <button className="button" onClick={handleSummarize} disabled={loading}>
              {loading ? 'Анализ…' : 'Собрать краткое ТЗ (GPT)'}
            </button>
            <span className="badge">API ключи берутся из .env.local</span>
          </div>
        </div>

        <div className="card">
          <h2>Краткое ТЗ</h2>
          <p className="hint">Можно скачать в .docx или .pdf. Максимальная длина — 1000 символов.</p>
          <div style={{ whiteSpace:'pre-wrap', background:'#fafafa', border:'1px solid #eee', borderRadius:12, padding:12, minHeight:220 }}>{briefPreview}</div>
          {summary && (
            <div style={{ marginTop:8 }} className="hint">{summary.length} / 1000 символов</div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="button secondary" disabled={!canDownload} onClick={()=>download('docx')}>Скачать .docx</button>
            <button className="button secondary" disabled={!canDownload} onClick={()=>download('pdf')}>Скачать .pdf</button>
          </div>

          <hr style={{ margin:'16px 0' }} />
          <h3>Референсы по ТЗ</h3>
          <label className="label">Помещения</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {roomOptions.map((r) => (
              <label key={r} className="badge" style={{ cursor:'pointer', opacity: selectedRoom && selectedRoom !== r ? 0.5 : 1 }}>
                <input
                  type="checkbox"
                  checked={selectedRoom === r}
                  disabled={!!selectedRoom && selectedRoom !== r}
                  onChange={(e)=> setSelectedRoom(e.target.checked ? r : null)}
                /> {r}
              </label>
            ))}
          </div>
          <div style={{ display:'flex', gap:12, marginTop:12 }}>
            <button className="button" onClick={handleRefs} disabled={loading || !summary || !selectedRoom}>
              {loading ? 'Генерируем…' : 'Сгенерировать референсы'}
            </button>
          </div>
          <div className="gallery" style={{ marginTop:12 }}>
            {images.map((b64, i)=> (
              <div key={i} style={{ position:'relative' }}>
                <img
                  src={`data:image/png;base64,${b64}`}
                  alt={`ref-${i}`}
                  style={{ cursor:'pointer' }}
                  onClick={()=>setActiveImage(b64)}
                />
                <span className="badge" style={{ position:'absolute', top:8, left:8 }}>{i+1}</span>
              </div>
            ))}
          </div>
          {activeImage && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
              <div style={{ background:'#fff', padding:20, borderRadius:12 }}>
                <img src={`data:image/png;base64,${activeImage}`} style={{ maxWidth:'80vw', maxHeight:'80vh' }} />
                <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'center' }}>
                  <button className="button" onClick={()=>{
                    const link = document.createElement('a');
                    link.href = `data:image/png;base64,${activeImage}`;
                    link.download = 'ref.png';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}>Скачать</button>
                  <button className="button secondary" onClick={()=>setActiveImage(null)}>Назад</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
