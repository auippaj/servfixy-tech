import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'https://servfixy-production.up.railway.app/api';

const DEFAULT_PROPERTY_ID = 'f0131587-a6b3-4a45-b13c-1d79a0db6459';

const NAVY = '#1B3A6B';
const TEAL = '#14B8A6';

const T = {
  en: {
    rounds: 'Rounds & Tasks', back: 'Back', overdue: 'Overdue', today: 'Today',
    upcoming: 'Upcoming', completed: 'Completed', none: 'No tasks scheduled.',
    loading: 'Loading tasks...', due: 'Due', log: 'Log Reading', inspect: 'Start Inspection',
    submit: 'Submit Reading', submitInspect: 'Submit Inspection', submitting: 'Submitting...',
    enterAll: 'Please enter all readings.', markAll: 'Please mark every item (Pass, Fail, or N/A).',
    pass: 'All readings within range', flag: 'Out of range',
    passInspect: 'All items passed', failInspect: 'item(s) failed', ordersMade: 'Work orders created',
    ticket: 'Ticket', pPass: 'Pass', pFail: 'Fail', pNa: 'N/A', note: 'Note (what / where)',
    done: 'Done', loadErr: 'Could not load tasks.', submitErr: 'Could not submit. Please try again.',
    cancel: 'Cancel'
  },
  es: {
    rounds: 'Rondas y Tareas', back: 'Atras', overdue: 'Atrasado', today: 'Hoy',
    upcoming: 'Proximo', completed: 'Completado', none: 'No hay tareas programadas.',
    loading: 'Cargando tareas...', due: 'Vence', log: 'Registrar Lectura', inspect: 'Iniciar Inspeccion',
    submit: 'Enviar Lectura', submitInspect: 'Enviar Inspeccion', submitting: 'Enviando...',
    enterAll: 'Por favor ingrese todas las lecturas.', markAll: 'Por favor marque cada elemento (Pasa, Falla, o N/A).',
    pass: 'Todas las lecturas en rango', flag: 'Fuera de rango',
    passInspect: 'Todos los elementos pasaron', failInspect: 'elemento(s) fallaron', ordersMade: 'Ordenes de trabajo creadas',
    ticket: 'Boleto', pPass: 'Pasa', pFail: 'Falla', pNa: 'N/A', note: 'Nota (que / donde)',
    done: 'Listo', loadErr: 'No se pudieron cargar las tareas.', submitErr: 'No se pudo enviar. Intente de nuevo.',
    cancel: 'Cancelar'
  }
};

const POOL_FIELDS = [
  { key: 'fc',  en: 'Free Chlorine (ppm)',     es: 'Cloro Libre (ppm)',      step: '0.1' },
  { key: 'cc',  en: 'Combined Chlorine (ppm)', es: 'Cloro Combinado (ppm)',  step: '0.1' },
  { key: 'ph',  en: 'pH',                       es: 'pH',                     step: '0.1' },
  { key: 'ta',  en: 'Total Alkalinity (ppm)',  es: 'Alcalinidad Total (ppm)', step: '1' },
  { key: 'cya', en: 'Cyanuric Acid (ppm)',     es: 'Acido Cianurico (ppm)',  step: '1' },
  { key: 'temp', en: 'Water Temp (F)',         es: 'Temp. del Agua (F)',     step: '1' }
];

// Monthly life-safety walkthrough checklist. `label` (en) is the canonical
// value stored in result_data and used in the auto-created work order title.
const LIFE_SAFETY_ITEMS = [
  { key: 'extinguishers',   en: 'Fire extinguishers (present, mounted, gauge green, pin/seal, tag)', es: 'Extintores (presentes, montados, aguja verde, pin/sello, etiqueta)' },
  { key: 'exit_signs',      en: 'Exit signs illuminated and undamaged',        es: 'Senales de salida iluminadas y sin danos' },
  { key: 'emergency_light', en: 'Emergency lighting functional (test button)', es: 'Luz de emergencia funcional (boton de prueba)' },
  { key: 'egress',          en: 'Egress paths and stairwells clear',           es: 'Rutas de salida y escaleras despejadas' },
  { key: 'fire_doors',      en: 'Fire doors close and latch, not propped',     es: 'Puertas cortafuego cierran y aseguran, no trabadas' },
  { key: 'pull_stations',   en: 'Fire alarm pull stations visible',            es: 'Estaciones de alarma visibles' },
  { key: 'detectors',       en: 'Common-area smoke / CO detectors present',    es: 'Detectores de humo / CO en areas comunes presentes' },
  { key: 'building_numbers', en: 'Building / unit numbers visible',            es: 'Numeros de edificio / unidad visibles' }
];

function isInspection(task) {
  return !!task && (task.task_type === 'inspection' || task.template_key === 'life-safety');
}

function dateOnly(d) {
  if (!d) return '';
  const s = String(d);
  return s.indexOf('T') > -1 ? s.split('T')[0] : s.slice(0, 10);
}

function todayStr() {
  const n = new Date();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const day = String(n.getDate()).padStart(2, '0');
  return `${n.getFullYear()}-${m}-${day}`;
}

function friendlyDate(d) {
  const parts = dateOnly(d).split('-');
  if (parts.length !== 3) return dateOnly(d);
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

function getGps() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

export default function TaskScreen({ token, lang = 'en', onBack, propertyId = DEFAULT_PROPERTY_ID }) {
  const t = T[lang] || T.en;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedTask, setSelectedTask] = useState(null);
  const [form, setForm] = useState({});          // pool: {fc,...} | inspection: {key:{result,note}}
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [failsSubmitted, setFailsSubmitted] = useState([]); // labels, ordered to match created_tickets

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tasks`, {
        params: { propertyId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (e) {
      setError(t.loadErr);
    } finally {
      setLoading(false);
    }
  }, [token, propertyId, t.loadErr]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const openTask = (task) => {
    setSelectedTask(task);
    setForm({});
    setResult(null);
    setFailsSubmitted([]);
    setError('');
  };

  const closeTask = () => {
    setSelectedTask(null);
    setForm({});
    setResult(null);
    setFailsSubmitted([]);
  };

  const setItem = (key, patch) =>
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));

  const handleSubmitPool = async () => {
    const filled = POOL_FIELDS.every((f) => form[f.key] !== undefined && form[f.key] !== '');
    if (!filled) { setError(t.enterAll); return; }
    setSubmitting(true);
    setError('');
    try {
      const gps = await getGps();
      const result_data = {};
      POOL_FIELDS.forEach((f) => { result_data[f.key] = Number(form[f.key]); });
      const res = await axios.post(
        `${API}/tasks/${selectedTask.id}/complete`,
        { result_data, gps_lat: gps.lat, gps_lng: gps.lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      await loadTasks();
    } catch (e) {
      setError(t.submitErr);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitInspection = async () => {
    const allMarked = LIFE_SAFETY_ITEMS.every((i) => form[i.key] && form[i.key].result);
    if (!allMarked) { setError(t.markAll); return; }
    setSubmitting(true);
    setError('');
    try {
      const gps = await getGps();
      const items = LIFE_SAFETY_ITEMS.map((i) => ({
        key: i.key,
        label: i.en,
        result: form[i.key].result,
        note: (form[i.key].note || '').trim(),
        photo_url: ''
      }));
      setFailsSubmitted(items.filter((it) => it.result === 'fail').map((it) => it.label));
      const res = await axios.post(
        `${API}/tasks/${selectedTask.id}/complete`,
        { result_data: { items }, gps_lat: gps.lat, gps_lng: gps.lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      await loadTasks();
    } catch (e) {
      setError(t.submitErr);
    } finally {
      setSubmitting(false);
    }
  };

  const today = todayStr();
  const pending = tasks.filter((x) => x.status === 'pending' || x.status === 'in_progress');
  const overdue = pending.filter((x) => dateOnly(x.due_date) < today);
  const dueToday = pending.filter((x) => dateOnly(x.due_date) === today);
  const upcoming = pending.filter((x) => dateOnly(x.due_date) > today);
  const completed = tasks.filter((x) => x.status === 'completed');

  const wrap = { padding: '16px', maxWidth: '430px', margin: '0 auto' };

  // ================= FORM VIEW =================
  if (selectedTask) {
    const inspection = isInspection(selectedTask);
    return (
      <div style={wrap}>
        <button onClick={closeTask} style={backBtn}>&larr; {t.cancel}</button>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: NAVY, margin: '12px 0 4px' }}>
          {selectedTask.title}
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          {t.due}: {friendlyDate(selectedTask.due_date)}{selectedTask.due_time ? ` @ ${selectedTask.due_time.slice(0, 5)}` : ''}
        </div>

        {/* ---- POOL FORM ---- */}
        {!result && !inspection && POOL_FIELDS.map((f) => (
          <div key={f.key} style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              {f[lang] || f.en}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step={f.step}
              value={form[f.key] === undefined ? '' : form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        {/* ---- INSPECTION CHECKLIST ---- */}
        {!result && inspection && LIFE_SAFETY_ITEMS.map((item) => {
          const state = form[item.key] || {};
          return (
            <div key={item.key} style={{ marginBottom: '14px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', backgroundColor: 'white' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                {item[lang] || item.en}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[['pass', t.pPass, '#15803d', '#f0fdf4', '#86efac'],
                  ['fail', t.pFail, '#b91c1c', '#fef2f2', '#fca5a5'],
                  ['na',   t.pNa,   '#6b7280', '#f3f4f6', '#d1d5db']].map(([val, label, fg, bg, br]) => {
                  const on = state.result === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setItem(item.key, { result: val })}
                      style={{
                        flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 700,
                        borderRadius: '8px', cursor: 'pointer',
                        color: on ? fg : '#6b7280',
                        backgroundColor: on ? bg : 'white',
                        border: `1px solid ${on ? br : '#d1d5db'}`
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {state.result === 'fail' && (
                <input
                  type="text"
                  placeholder={t.note}
                  value={state.note || ''}
                  onChange={(e) => setItem(item.key, { note: e.target.value })}
                  style={{ width: '100%', marginTop: '8px', padding: '10px', fontSize: '15px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              )}
            </div>
          );
        })}

        {error && <div style={{ color: '#dc2626', fontSize: '13px', margin: '8px 0' }}>{error}</div>}

        {!result && (
          <button
            onClick={inspection ? handleSubmitInspection : handleSubmitPool}
            disabled={submitting}
            style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? t.submitting : (inspection ? t.submitInspect : t.submit)}
          </button>
        )}

        {/* ---- RESULT ---- */}
        {result && !inspection && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              padding: '16px', borderRadius: '10px', textAlign: 'center',
              backgroundColor: result.flagged ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${result.flagged ? '#fca5a5' : '#86efac'}`
            }}>
              <div style={{ fontSize: '28px' }}>{result.flagged ? '\u26A0\uFE0F' : '\u2705'}</div>
              <div style={{ fontWeight: 700, color: result.flagged ? '#b91c1c' : '#15803d', marginTop: '4px' }}>
                {result.flagged ? t.flag : t.pass}
              </div>
              {result.flagged && result.flag_reason && (
                <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '6px' }}>{result.flag_reason}</div>
              )}
            </div>
            <button onClick={closeTask} style={{ ...primaryBtn, marginTop: '14px' }}>{t.done}</button>
          </div>
        )}

        {result && inspection && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              padding: '16px', borderRadius: '10px', textAlign: 'center',
              backgroundColor: result.flagged ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${result.flagged ? '#fca5a5' : '#86efac'}`
            }}>
              <div style={{ fontSize: '28px' }}>{result.flagged ? '\u26A0\uFE0F' : '\u2705'}</div>
              <div style={{ fontWeight: 700, color: result.flagged ? '#b91c1c' : '#15803d', marginTop: '4px' }}>
                {result.flagged ? `${failsSubmitted.length} ${t.failInspect}` : t.passInspect}
              </div>
              {result.flagged && Array.isArray(result.created_tickets) && result.created_tickets.length > 0 && (
                <div style={{ marginTop: '10px', textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>{t.ordersMade}:</div>
                  {result.created_tickets.map((tk, idx) => (
                    <div key={tk.id} style={{ fontSize: '13px', color: '#b91c1c' }}>
                      {t.ticket} #{tk.ticket_number} — {failsSubmitted[idx] || ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={closeTask} style={{ ...primaryBtn, marginTop: '14px' }}>{t.done}</button>
          </div>
        )}
      </div>
    );
  }

  // ================= LIST VIEW =================
  return (
    <div style={wrap}>
      <button onClick={onBack} style={backBtn}>&larr; {t.back}</button>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: NAVY, margin: '12px 0 16px' }}>{t.rounds}</h2>

      {loading && <div style={{ color: '#6b7280', fontSize: '14px' }}>{t.loading}</div>}
      {error && !loading && <div style={{ color: '#dc2626', fontSize: '14px' }}>{error}</div>}

      {!loading && !error && tasks.length === 0 && (
        <div style={{ color: '#6b7280', fontSize: '14px' }}>{t.none}</div>
      )}

      {!loading && !error && (
        <>
          <TaskGroup label={t.overdue} color="#dc2626" items={overdue} onOpen={openTask} t={t} />
          <TaskGroup label={t.today} color={NAVY} items={dueToday} onOpen={openTask} t={t} />
          <TaskGroup label={t.upcoming} color="#6b7280" items={upcoming} onOpen={openTask} t={t} />
          <TaskGroup label={t.completed} color="#15803d" items={completed} onOpen={openTask} t={t} done />
        </>
      )}
    </div>
  );
}

function TaskGroup({ label, color, items, onOpen, t, done }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color, marginBottom: '8px' }}>
        {label} ({items.length})
      </div>
      {items.map((item) => (
        <TaskCard key={item.id} item={item} onOpen={onOpen} t={t} done={done} />
      ))}
    </div>
  );
}

function TaskCard({ item, onOpen, t, done }) {
  const clickable = !done && (item.status === 'pending' || item.status === 'in_progress');
  const cta = isInspection(item) ? t.inspect : t.log;
  return (
    <div
      onClick={clickable ? () => onOpen(item) : undefined}
      style={{
        backgroundColor: 'white', borderRadius: '10px', padding: '14px',
        marginBottom: '8px', border: '1px solid #e5e7eb',
        borderLeft: item.flagged ? '4px solid #dc2626' : `4px solid ${done ? '#22c55e' : TEAL}`,
        cursor: clickable ? 'pointer' : 'default',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{item.title}</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
          {t.due}: {friendlyDate(item.due_date)}{item.due_time ? ` @ ${item.due_time.slice(0, 5)}` : ''}
        </div>
        {item.flagged && item.flag_reason && (
          <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>{'\u26A0\uFE0F'} {item.flag_reason}</div>
        )}
      </div>
      {done
        ? <span style={{ fontSize: '18px' }}>{item.flagged ? '\u26A0\uFE0F' : '\u2705'}</span>
        : <span style={{ fontSize: '13px', fontWeight: 600, color: TEAL }}>{cta} &rarr;</span>}
    </div>
  );
}

const backBtn = {
  background: 'none', border: 'none', color: '#6b7280', fontSize: '14px',
  cursor: 'pointer', padding: 0
};
const primaryBtn = {
  width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, color: 'white',
  backgroundColor: NAVY, border: 'none', borderRadius: '10px', cursor: 'pointer'
};