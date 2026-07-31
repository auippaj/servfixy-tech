import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import TaskScreen from './TaskScreen';
import WalkScreen from './WalkScreen';
import TurnTaskScreen from "./TurnTaskScreen";
import { cacheJobs, getCachedJobs, enqueue, updateCachedJob } from './db';
import { replayQueue } from './offlineQueue';
import { registerPushToken, onForegroundMessage } from './firebase';
const API = 'https://servfixy-production.up.railway.app/api';

// Haptic feedback — silent on devices that don't support it
const haptic = (pattern = [10]) => { try { navigator.vibrate && navigator.vibrate(pattern); } catch(e) {} };

// Inject skeleton pulse animation globally once
(function injectSkeletonCSS() {
  if (document.getElementById('sfx-skeleton-style')) return;
  const s = document.createElement('style');
  s.id = 'sfx-skeleton-style';
  s.textContent = '@keyframes sfxPulse { 0%,100%{opacity:1} 50%{opacity:0.4} } .sfx-skeleton{animation:sfxPulse 1.5s ease-in-out infinite;background:#e5e7eb;border-radius:6px;}';
  document.head.appendChild(s);
})();

const statusColor = { pending_triage: '#1e3a5f', dispatched: '#3b82f6', scheduled: '#14B8A6', in_progress: '#f97316', pending_qa: '#7c3aed', completed: '#22c55e' };
const tierColor = { LS: '#dc2626', '1': '#f97316', '2': '#facc15', '3': '#94a3b8' };
const tierLabel = { LS: 'LS - Life Safety', '1': 'Tier 1 - Urgent', '2': 'Tier 2 - Moderate', '3': 'Tier 3 - Routine' };
const tierLabelEs = { LS: 'LS - Seguridad Vital', '1': 'Nivel 1 - Urgente', '2': 'Nivel 2 - Moderado', '3': 'Nivel 3 - Rutina' };

function getTier(job) {
  if (job.tier) return String(job.tier);
  if (job.priority === 'emergency') return 'LS';
  if (job.priority === 'urgent') return '1';
  if (job.priority === 'high') return '2';
  if (job.priority === 'medium') return '3';
  return 'T4';
}

const STRINGS = {
  en: {
    techPortal: 'Technician Portal',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    invalidLogin: 'Invalid email or password',
    loadingJobs: 'Loading jobs...',
    assignedJob: 'assigned job',
    assignedJobs: 'assigned jobs',
    noJobs: 'No jobs assigned right now',
    accept: 'Accept →',
    decline: 'Decline',
    failAccept: 'Failed to accept job',
    failDecline: 'Failed to decline job',
    gpsActive: '📍 GPS active - Zone A',
    onDuty: '● On duty',
    certZone: 'Certified - Zone A',
    logOut: 'Log Out',
    backToJob: '← Back to Job',
    backToJobs: '← Back to Jobs',
    back: '← Back',
    checkIn: 'Check-In',
    unit: 'Unit',
    gpsStep: 'GPS Check-In',
    rvcStep: 'RVC Code',
    photosStep: 'Photos',
    confirmArrival: 'Confirm Your Arrival',
    gpsInstruction: 'Tap below to verify your GPS location.\nYou must be within 0.25 miles of the property.',
    confirmGPS: '📍 Confirm GPS Location',
    gettingLocation: 'Getting your location...',
    locationConfirmed: 'Location Confirmed',
    advancing: 'Advancing to next step...',
    locationDenied: 'Location access denied',
    locationDeniedMsg: 'Enable location in your browser settings and try again.',
    tryAgain: 'Try Again',
    rvcLabel: 'Resident Verification Code',
    showCode: 'Show this code to the resident',
    touch3Msg: 'The resident will confirm this code matches their notification. This is',
    touch3Of: 'Touch 3',
    touch3Rest: 'of the 5-Touch protocol.',
    touch3Logged: '📋 Touch 3 logged at',
    residentConfirmed: 'Resident Confirmed → Take Photos',
    beforePhotos: 'Before Photos Required',
    photoInstruction: 'Capture at least 2 photo before starting work. More is always better.',
    add: 'Add',
    photoRequired: 'At least 2 photos required',
    photoCaptured: 'photo captured',
    photosCaptured: 'photos captured',
beginWork: '🔧 Begin Work',
addPhotoToContinue: 'Add 2 photos to continue',
    diagnosis: 'Diagnosis',
    timeOnSite: '⏱ Time on site',
    rootCause: '🔍 Root Cause',
    system: 'System',
    selectSystem: 'Select system...',
    category: 'Category',
    selectCategory: 'Select category...',
    cause: 'Cause',
    selectCause: 'Select cause...',
    writtenDiagnosis: '📝 Written Diagnosis',
    diagnosisMin: 'Minimum 100 characters required',
    diagnosisPlaceholder: 'Describe what you found, what caused the issue, and what was done to resolve it...',
    minimumMet: '✅ Minimum met',
    chars: 'chars',
    partsUsed: '🔧 Parts Used',
    partsOptional: 'Optional — log any parts used on this job',
    qty: 'Qty',
    total: 'Total',
    partName: 'Part name',
    addPart: '+ Add Part',
    submitDiagnosis: 'Submit Close → Gate 1',
    completeFields: 'Complete required fields',
    warnRootCause: '⚠ Select system, category, and cause',
    warnDiagnosis: '⚠ Diagnosis needs',
    moreChars: 'more characters',
    jobDetail: 'Job Detail',
    location: 'Location',
    currentStatus: 'Current Status',
    readyToStart: 'Ready to start this job?',
    checkInRequired: 'GPS check-in, RVC code, and before photos required.',
    beginCheckIn: '📍 Begin Check-In',
    addNote: 'Add Note (optional)',
    notesPlaceholder: 'Notes about this job...',
    markEnRoute: '🚗 Mark En Route / In Progress',
    markComplete: '✅ Mark Complete',
    jobComplete: 'Job Complete',
    failStatus: 'Failed to update status',
    hi: 'Hi',
  },
  es: {
    techPortal: 'Portal de Tecnico',
    email: 'Correo electronico',
    password: 'Contrasena',
    signIn: 'Iniciar sesion',
    signingIn: 'Ingresando...',
    invalidLogin: 'Correo o contrasena incorrectos',
    loadingJobs: 'Cargando trabajos...',
    assignedJob: 'trabajo asignado',
    assignedJobs: 'trabajos asignados',
    noJobs: 'No hay trabajos asignados ahora',
    accept: 'Aceptar →',
    decline: 'Rechazar',
    failAccept: 'Error al aceptar el trabajo',
    failDecline: 'Error al rechazar el trabajo',
    gpsActive: '📍 GPS activo - Zona A',
    onDuty: '● En servicio',
    certZone: 'Certificado - Zona A',
    logOut: 'Cerrar sesion',
    backToJob: '← Volver al trabajo',
    backToJobs: '← Volver a trabajos',
    back: '← Volver',
    checkIn: 'Llegada',
    unit: 'Unidad',
    gpsStep: 'GPS',
    rvcStep: 'Codigo RVC',
    photosStep: 'Fotos',
    confirmArrival: 'Confirmar llegada',
    gpsInstruction: 'Toca para verificar tu ubicacion GPS.\nDebes estar a menos de 0.25 millas de la propiedad.',
    confirmGPS: '📍 Confirmar ubicacion GPS',
    gettingLocation: 'Obteniendo tu ubicacion...',
    locationConfirmed: 'Ubicacion confirmada',
    advancing: 'Avanzando al siguiente paso...',
    locationDenied: 'Acceso a ubicacion denegado',
    locationDeniedMsg: 'Activa la ubicacion en la configuracion del navegador e intenta de nuevo.',
    tryAgain: 'Intentar de nuevo',
    rvcLabel: 'Codigo de verificacion del residente',
    showCode: 'Muestra este codigo al residente',
    touch3Msg: 'El residente confirmara que este codigo coincide con su notificacion. Este es el',
    touch3Of: 'Toque 3',
    touch3Rest: 'del protocolo de 5 Toques.',
    touch3Logged: '📋 Toque 3 registrado a las',
    residentConfirmed: 'Residente confirmado → Tomar fotos',
    beforePhotos: 'Fotos previas requeridas',
    photoInstruction: 'Toma al menos 1 foto antes de comenzar. Mas siempre es mejor.',
    add: 'Agregar',
    photoRequired: 'Se requiere al menos 1 foto',
    photoCaptured: 'foto capturada',
    photosCaptured: 'fotos capturadas',
  beginWork: '🔧 Comenzar trabajo',
addPhotoToContinue: 'Agrega 2 fotos para continuar',
    diagnosis: 'Diagnostico',
    timeOnSite: '⏱ Tiempo en sitio',
    rootCause: '🔍 Causa raiz',
    system: 'Sistema',
    selectSystem: 'Seleccionar sistema...',
    category: 'Categoria',
    selectCategory: 'Seleccionar categoria...',
    cause: 'Causa',
    selectCause: 'Seleccionar causa...',
    writtenDiagnosis: '📝 Diagnostico escrito',
    diagnosisMin: 'Minimo 100 caracteres requeridos',
    diagnosisPlaceholder: 'Describe lo que encontraste, la causa del problema y como lo resolviste...',
    minimumMet: '✅ Minimo alcanzado',
    chars: 'caracteres',
    partsUsed: '🔧 Piezas utilizadas',
    partsOptional: 'Opcional - registra las piezas usadas en este trabajo',
    qty: 'Cant.',
    total: 'Total',
    partName: 'Nombre de pieza',
    addPart: '+ Agregar pieza',
    submitDiagnosis: 'Enviar y Cerrar → Puerta 1',
    completeFields: 'Completa los campos requeridos',
    warnRootCause: '⚠ Selecciona sistema, categoria y causa',
    warnDiagnosis: '⚠ El diagnostico necesita',
    moreChars: 'caracteres mas',
    jobDetail: 'Detalle del trabajo',
    location: 'Ubicacion',
    currentStatus: 'Estado actual',
    readyToStart: 'Listo para comenzar este trabajo?',
    checkInRequired: 'Se requiere GPS, codigo RVC y fotos previas.',
    beginCheckIn: '📍 Iniciar llegada',
    addNote: 'Agregar nota (opcional)',
    notesPlaceholder: 'Notas sobre este trabajo...',
    markEnRoute: '🚗 Marcar en camino / En progreso',
    markComplete: '✅ Marcar completado',
    jobComplete: 'Trabajo completado',
    failStatus: 'Error al actualizar el estado',
    hi: 'Hola',
  },
};

const ROOT_CAUSE_TREE = {
  'Plumbing': {
    'Leak': ['Supply line', 'Drain line', 'Wax ring', 'Valve', 'Fixture', 'Unknown'],
    'Clog': ['Toilet', 'Sink drain', 'Tub/shower drain', 'Main line', 'Unknown'],
    'No water / low pressure': ['Shutoff valve closed', 'PRV failure', 'Supply issue', 'Unknown'],
    'Water heater': ['No hot water', 'Leak', 'Pilot out', 'Thermostat', 'Unknown'],
  },
  'HVAC': {
    'No cooling': ['Thermostat', 'Filter clogged', 'Refrigerant', 'Compressor', 'Unknown'],
    'No heating': ['Thermostat', 'Pilot / igniter', 'Heat exchanger', 'Unknown'],
    'Airflow issue': ['Filter clogged', 'Duct problem', 'Blower motor', 'Unknown'],
    'Noise': ['Belt', 'Bearing', 'Loose panel', 'Unknown'],
  },
  'Appliance': {
    'Refrigerator': ['Not cooling', 'Leak', 'Ice maker', 'Noise', 'Unknown'],
    'Dishwasher': ['Not draining', 'Leak', 'Not cleaning', 'Unknown'],
    'Microwave': ['No power', 'No heat', 'Door latch', 'Unknown'],
    'Stove / Oven': ['Burner', 'Oven element', 'Igniter', 'Unknown'],
    'Washer / Dryer': ['Not spinning', 'Not draining', 'No heat', 'Noise', 'Unknown'],
  },
  'Electrical': {
    'No power': ['Tripped breaker', 'GFCI tripped', 'Outlet failure', 'Unknown'],
    'Lighting': ['Bulb', 'Fixture', 'Switch', 'Unknown'],
    'Outlet / Switch': ['Not working', 'Damaged', 'GFCI needed', 'Unknown'],
  },
  'Doors / Windows': {
    'Door': ["Won't latch", "Won't lock", 'Hinge', 'Weatherstrip', 'Unknown'],
    'Window': ["Won't open/close", 'Broken glass', 'Lock', 'Seal', 'Unknown'],
    'Sliding door': ['Off track', 'Lock', 'Screen', 'Unknown'],
  },
  'General': {
    'Flooring': ['Loose', 'Water damage', 'Crack', 'Unknown'],
    'Walls / Ceiling': ['Hole', 'Crack', 'Water stain', 'Paint', 'Unknown'],
    'Pest': ['Roaches', 'Ants', 'Rodents', 'Unknown'],
    'Other': ['Other'],
  },
};

function SLATimer({ createdAt, slaHours = 24 }) {
  const [remaining, setRemaining] = useState('');
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    const calc = () => {
      if (!createdAt) { setRemaining('Unknown'); return; }
      const created = new Date(createdAt);
      if (isNaN(created.getTime())) { setRemaining('Unknown'); return; }
      const deadline = new Date(created.getTime() + slaHours * 3600000);
      const diff = deadline - new Date();
      if (diff <= 0) { setRemaining('Overdue'); setUrgent(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m remaining`);
      setUrgent(h < 2);
    };
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [createdAt, slaHours]);
  return <div style={{ fontSize: '12px', color: urgent ? '#ef4444' : '#6b7280', marginTop: '4px' }}>⏱ SLA: {remaining}</div>;
}

function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', overflow: 'hidden', fontSize: '12px', fontWeight: '700' }}>
      {['en', 'es'].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 10px', border: 'none', cursor: 'pointer', backgroundColor: lang === l ? '#14B8A6' : 'transparent', color: 'white', fontWeight: '700', fontSize: '12px', transition: 'background 0.15s' }}>
          {l.toUpperCase()}
        </button>
      ))}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, lang, setLang }) {
  const t = STRINGS[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/tech-auth/login`, { email, password });
      localStorage.setItem('techToken', res.data.token);
      localStorage.setItem('techUser', JSON.stringify(res.data.technician));
      onLogin(res.data.technician);
    } catch { setError(t.invalidLogin); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Arial, sans-serif' }}>
      {/* Left navy panel */}
      <div style={{ width: '400px', minWidth: '400px', backgroundColor: '#1B3A6B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <img src="https://i.imgur.com/OKIqq0K.png" alt="Servfixy" style={{ width: '200px', marginBottom: '28px' }} />
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textAlign: 'center', marginBottom: '40px' }}>Field Technician Portal</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          {['GPS-verified job check-in', '5-Touch communication protocol', 'HVAC diagnostics and gauges', 'Gate 1 QA closeout workflow'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '40px', display: 'flex', gap: '6px' }}>
          {['en', 'es'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: lang === l ? '#14B8A6' : 'rgba(255,255,255,0.1)', color: lang === l ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: '12px' }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {/* Right login panel */}
      <div style={{ flex: 1, backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>{t.techPortal}</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>Sign in to view your assigned work orders</p>
          {error && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '20px' }}>{error}</div>}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>{t.email}</label>
            <input style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#111827', backgroundColor: '#fff', boxSizing: 'border-box' }} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>{t.password}</label>
            <input style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#111827', backgroundColor: '#fff', boxSizing: 'border-box' }} type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <button style={{ width: '100%', padding: '13px', backgroundColor: '#1B3A6B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }} onClick={handleLogin} disabled={loading}>
            {loading ? t.signingIn : t.signIn}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobList({ tech, token, onSelectJob, lang, onShow911, onSupportCall }) {
  const t = STRINGS[lang];
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const fetchJobs = () => {
    axios.get(`${API}/technicians/${tech.id}/jobs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setJobs(res.data);
        cacheJobs(res.data).catch(() => {});
      })
      .catch(() => {
        getCachedJobs().then(cached => {
          if (cached && cached.length > 0) setJobs(cached);
        }).catch(() => {});
      })
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [tech.id, token]);
  const handleAccept = async (e, jobId) => {
    e.stopPropagation();
    haptic([10, 50, 10]);
    setActionLoading(jobId + '_accept');
    // Optimistic update immediately
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'in_progress' } : j));
    updateCachedJob({ id: jobId, status: 'in_progress' }).catch(() => {});
    if (!navigator.onLine) {
      await enqueue({ type: 'accept_job', url: `/service-requests/${jobId}/status`, method: 'PATCH', payload: { status: 'in_progress' } });
      await enqueue({ type: 'touch1', url: `/touchpoints/${jobId}/1`, method: 'PATCH', payload: { fired_by: tech.email, notes: 'Job accepted by technician' } });
      console.log('[offline] accept queued for job', jobId);
    } else {
      try {
        await axios.patch(`${API}/service-requests/${jobId}/status`, { status: 'in_progress' }, { headers: { Authorization: `Bearer ${token}` } });
        try {
          await axios.patch(`${API}/touchpoints/${jobId}/1`, { fired_by: tech.email, notes: 'Job accepted by technician' }, { headers: { Authorization: `Bearer ${token}` } });
        } catch { console.warn('Touch 1 failed silently'); }
      } catch { alert(t.failAccept); }
    }
    setActionLoading(null);
  };
  const handleDecline = async (e, jobId) => {
    e.stopPropagation();
    haptic([30]);
    setActionLoading(jobId + '_decline');
    // Optimistic update immediately
    setJobs(prev => prev.filter(j => j.id !== jobId));
    if (!navigator.onLine) {
      await enqueue({ type: 'decline_job', url: `/service-requests/${jobId}/status`, method: 'PATCH', payload: { status: 'pending_triage' } });
      console.log('[offline] decline queued for job', jobId);
    } else {
      try {
        await axios.patch(`${API}/service-requests/${jobId}/status`, { status: 'pending_triage' }, { headers: { Authorization: `Bearer ${token}` } });
      } catch { alert(t.failDecline); }
    }
    setActionLoading(null);
  };
  // Pull-to-refresh
  const [pullStartY, setPullStartY] = React.useState(null);
  const [isPulling, setIsPulling] = React.useState(false);
  const handleTouchStart = (e) => setPullStartY(e.touches[0].clientY);
  const handleTouchEnd = (e) => {
    if (pullStartY !== null && e.changedTouches[0].clientY - pullStartY > 70) {
      haptic([10, 30, 10]);
      fetchJobs();
    }
    setPullStartY(null);
    setIsPulling(false);
  };
  const handleTouchMove = (e) => {
    if (pullStartY !== null && e.touches[0].clientY - pullStartY > 40) setIsPulling(true);
  };

  if (loading) return (
    <div style={{ paddingBottom: '80px' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ width: '80px', height: '16px', backgroundColor: '#f0f4ff', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width: '90px', height: '16px', backgroundColor: '#f0f4ff', borderRadius: '6px' }} />
          </div>
          <div style={{ width: '100%', height: '14px', backgroundColor: '#f0f4ff', borderRadius: '6px', marginBottom: '8px' }} />
          <div style={{ width: '60%', height: '12px', backgroundColor: '#f0f4ff', borderRadius: '6px' }} />
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ paddingBottom: '80px' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove}>
      {isPulling && <div style={{ textAlign: 'center', padding: '12px', color: '#14B8A6', fontSize: '13px', fontWeight: '600' }}>↓ Release to refresh</div>}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {jobs.length > 0 && <span style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>{jobs.length}</span>}
          <span style={{ color: '#6b7280', fontSize: '13px' }}>{jobs.length} {jobs.length !== 1 ? t.assignedJobs : t.assignedJob}</span>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '11px' }}>↕ Pull to refresh</span>
      </div>
      {jobs.length === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '32px 16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontWeight: '700', color: '#1B3A6B', fontSize: '16px', marginBottom: '6px' }}>{t.noJobs}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>{lang === 'es' ? 'Todo esta bajo control. Buen trabajo.' : 'Queue is clear. Great work.'}</div>
        </div>
      )}
      {jobs.map(job => {
        const tier = getTier(job);
        const tLabel = lang === 'es' ? tierLabelEs[tier] : tierLabel[tier];
        return (
          <div key={job.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', margin: '12px', boxShadow: tier === 'LS' ? '0 0 0 2px #dc2626, 0 1px 8px rgba(220,38,38,0.25)' : '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', borderLeft: `4px solid ${tierColor[tier]}` }} onClick={() => { haptic([10]); onSelectJob(job); }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <span style={{ fontWeight: '600', color: '#1B3A6B', fontSize: '15px' }}>{t.unit} {job.unit_number || ''}</span>
              <span style={{ backgroundColor: tierColor[tier], color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{tLabel}</span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#111827', fontSize: '14px' }}>{job.description}</p>
            <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>{job.property_name}</div>
            <SLATimer createdAt={job.created_at} slaHours={tier === 'LS' ? 1 : tier === '1' ? 4 : tier === '2' ? 24 : 72} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ backgroundColor: statusColor[job.status] || '#6b7280', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                {lang === 'es' ? ({ in_progress: 'En progreso', pending: 'Pendiente', assigned: 'Asignado', completed: 'Completado' }[job.status] || job.status) : job.status?.replace('_', ' ')}
              </span>
              {(job.status === 'dispatched' || job.status === 'scheduled') && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }} onClick={e => handleAccept(e, job.id)} disabled={actionLoading === job.id + '_accept'}>
                    {actionLoading === job.id + '_accept' ? '...' : t.accept}
                  </button>
                  <button style={{ backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }} onClick={e => handleDecline(e, job.id)} disabled={actionLoading === job.id + '_decline'}>
                    {actionLoading === job.id + '_decline' ? '...' : t.decline}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <button onClick={onShow911} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>🚨 911</button>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
        <button onClick={onSupportCall} style={{ backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>📞 Support</button>
      </div>
    </div>
  );
}
function TurnWalkList({ tech, token, lang, onBack, onStartWalk }) {
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const PROPERTY_ID = 'f0131587-a6b3-4a45-b13c-1d79a0db6459';
  useEffect(() => {
    axios.get(`${API}/turns?property_id=${PROPERTY_ID}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTurns((res.data || []).filter(t => t.status !== 'certified_ready')))
      .catch(() => setTurns([]))
      .finally(() => setLoading(false));
  }, [token]);
  const handleStart = async (turn, walkType) => {
    setStarting(turn.id + '_' + walkType);
    try {
      await axios.post(`${API}/turns/${turn.id}/walks`, { walk_type: walkType, walked_by: tech.id }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      if (!e.response || e.response.status !== 409) {
        alert('Could not start walk: ' + (e.response?.data?.error || e.message));
        setStarting(null);
        return;
      }
    }
    setStarting(null);
    try {
      const res = await axios.get(`${API}/turns/${turn.id}`, { headers: { Authorization: `Bearer ${token}` } });
      onStartWalk(res.data, walkType);
    } catch (e2) {
      alert('Could not load turn: ' + e2.message);
    }
  };
  const statusLabel = { notice_received: 'Notice Received', walk_scheduled: 'Walk Scheduled', walk_complete: 'Walk Complete', scoped: 'Scoped', in_progress: 'In Progress', qa: 'QA', certified_ready: 'Certified Ready' };
  const statusColor = { notice_received: '#6b7280', walk_scheduled: '#f59e0b', walk_complete: '#3b82f6', scoped: '#8b5cf6', in_progress: '#14B8A6', qa: '#f97316', certified_ready: '#22c55e' };
  return (
    <div style={{ paddingBottom: '80px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '0' }}>←</button>
        <span style={{ fontWeight: '700', fontSize: '17px' }}>Turn Walks</span>
      </div>
      {loading && <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading turns...</div>}
      {!loading && turns.length === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '32px 16px', margin: '16px', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚪</div>
          <div>No active turns assigned.</div>
        </div>
      )}
      {turns.map(turn => (
        <div key={turn.id} style={{ backgroundColor: 'white', borderRadius: '10px', margin: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontWeight: '700', fontSize: '16px', color: '#1B3A6B' }}>Unit {turn.unit_number}</span>
            <span style={{ backgroundColor: statusColor[turn.status] || '#6b7280', color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{statusLabel[turn.status] || turn.status}</span>
          </div>
          <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>{turn.floorplan_type || ''}</div>
          {turn.projected_ready_date && <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px' }}>Projected ready: {new Date(turn.projected_ready_date).toLocaleDateString()}</div>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => handleStart(turn, 'notice')}
              disabled={!!starting}
              style={{ flex: 1, backgroundColor: starting === turn.id + '_notice' ? '#9ca3af' : '#1B3A6B', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 8px', fontSize: '13px', fontWeight: '600', cursor: starting ? 'not-allowed' : 'pointer' }}>
              {starting === turn.id + '_notice' ? '...' : 'Notice Walk'}
            </button>
            <button
              onClick={() => handleStart(turn, 'move_out')}
              disabled={!!starting}
              style={{ flex: 1, backgroundColor: starting === turn.id + '_move_out' ? '#9ca3af' : '#14B8A6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 8px', fontSize: '13px', fontWeight: '600', cursor: starting ? 'not-allowed' : 'pointer' }}>
              {starting === turn.id + '_move_out' ? '...' : 'Move-Out Walk'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
function generateRVC(jobId) {
  const suffix = jobId ? jobId.slice(0, 4).toUpperCase() : 'XXXX';
  return `SERV${suffix}`;
}

// ── CheckInScreen ──
// State is now lifted to App and passed in as `state` + `setState`.
// `setState` merges partial updates, e.g. setState({ step: 'rvc' }).
function CheckInScreen({  job, tech, token, onComplete, onBack, lang, state, setState , onShow911, onSupportCall }) {
  const t = STRINGS[lang];
  const {
    step, gpsStatus, gpsCoords, photos, touch3Fired, showRvcPicker, rvcMethod,
    ppeConfirmed, unitConfirm, hvacLow, hvacHigh, refrigerantType,
    expansionValve, suctionTemp, liquidTemp, hvacAnalysis, hvacAnalysisLoading,
  } = state;

  const isHvac = job?.title?.toLowerCase().includes('hvac') || job?.description?.toLowerCase().includes('hvac') || job?.title?.toLowerCase().includes('ac ') || job?.title?.toLowerCase().includes('air') || job?.description?.toLowerCase().includes('cooling') || job?.description?.toLowerCase().includes('heating') || job?.category?.toLowerCase().includes('hvac') || (job?.title || '').toLowerCase().includes('hvac') || (job?.description || '').toLowerCase().includes('hvac') || (job?.description || '').toLowerCase().includes('ac ') || (job?.description || '').toLowerCase().includes('cold');
  const steps = isHvac ? [t.gpsStep, t.rvcStep, 'PPE', 'Gauges', t.photosStep] : [t.gpsStep, t.rvcStep, 'PPE', t.photosStep];
  const stepIndex = step === 'gps' ? 0 : step === 'rvc' ? 1 : step === 'ppe' ? 2 : step === 'hvac' ? 3 : (isHvac ? 4 : 3);
  const photoInputRef = useRef(null);
  const rvcCode = generateRVC(job.id);

  const requestGPS = () => {
    setState({ gpsStatus: 'checking' });
    setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({ gpsCoords: { lat: position.coords.latitude, lng: position.coords.longitude }, gpsStatus: 'confirmed' });
          setTimeout(() => setState({ step: 'rvc' }), 1500);
        },
        (err) => {
          console.error('GPS error:', err);
          const next = (state.gpsFailCount || 0) + 1;
          setState({ gpsCoords: null, gpsFailCount: next, gpsStatus: next >= 2 ? 'manual' : 'denied' });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }, 1200);
  };

  // Only auto-fire GPS once per job (when this is the very first time we're
  // hitting the gps step with no status yet). Navigating back into this
  // screen later (e.g. tapping "Back" from RVC/PPE) won't re-trigger it,
  // since gpsStatus will already be 'confirmed' or 'manual' from before.
  useEffect(() => {
    if (step === 'gps' && gpsStatus === 'idle') {
      requestGPS();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualConfirm = () => {
    if (!unitConfirm.trim()) return;
    setState({ gpsCoords: { manual: true, unit_entered: unitConfirm.trim() }, step: 'rvc' });
  };

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setState({ photos: [...state.photos, { url: ev.target.result, name: file.name, time: new Date().toLocaleTimeString() }] });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBeginWork = async () => {
    if (!touch3Fired) {
      setState({ touch3Fired: true });
      if (!navigator.onLine) {
        await enqueue({ type: 'touch3', url: `/touchpoints/${job.id}/3`, method: 'PATCH', payload: { fired_by: tech.email, notes: `RVC: ${rvcCode}` } }).catch(() => {});
        console.log('[offline] touch3 queued');
      } else {
        try {
          await axios.patch(`${API}/touchpoints/${job.id}/3`, { fired_by: tech.email, notes: `RVC: ${rvcCode}` }, { headers: { Authorization: `Bearer ${token}` } });
        } catch { }
      }
    }
    // Flip tech_checked_in flag so resident video button activates
    if (!navigator.onLine) {
      await enqueue({ type: 'tech_checkin', url: `/service-requests/${job.id}/tech-checkin`, method: 'PATCH', payload: {} }).catch(() => {});
      console.log('[offline] tech-checkin queued');
    } else {
      try {
        await axios.patch(`${API}/service-requests/${job.id}/tech-checkin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        console.error('Check-in flag error:', err.message, err.response?.data);
      }
    }
    onComplete({ rvc: rvcCode, photos, coords: gpsCoords, rvcMethod, ppeConfirmed, hvacLow, hvacHigh, refrigerantType, expansionValve, suctionTemp, liquidTemp });
  };

  

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '8px' }}>{t.backToJob}</button>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>{t.checkIn} - {t.unit} {job.unit_number || ''}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{job.property_name}</div>
      </div>
      <div style={{ backgroundColor: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: i <= stepIndex ? '#14B8A6' : '#e5e7eb', color: i <= stepIndex ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '10px', color: i <= stepIndex ? '#14B8A6' : '#9ca3af', fontWeight: i === stepIndex ? '700' : '400', textAlign: 'center' }}>{s}</div>
            </div>
            {i < steps.length - 1 && <div style={{ height: '2px', flex: 1, backgroundColor: i < stepIndex ? '#14B8A6' : '#e5e7eb', marginBottom: '18px' }} />}
          </React.Fragment>
        ))}
      </div>

      {step === 'gps' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📍</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1B3A6B', marginBottom: '8px' }}>{t.confirmArrival}</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{t.gpsInstruction}</div>
            {(gpsStatus === 'idle' || gpsStatus === 'checking') && <div style={{ color: '#6b7280', fontSize: '14px', padding: '14px' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>{t.gettingLocation}</div>}
            {gpsStatus === 'confirmed' && (
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '20px', border: '2px solid #22c55e' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <div style={{ color: '#15803d', fontWeight: '700', fontSize: '16px' }}>{t.locationConfirmed}</div>
                <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '6px' }}>{gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` : ''}</div>
                <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{t.advancing}</div>
              </div>
            )}
            {gpsStatus === 'denied' && (
              <div>
                <div style={{ backgroundColor: '#fef2f2', borderRadius: '12px', padding: '16px', border: '2px solid #ef4444', marginBottom: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚠️</div>
                  <div style={{ color: '#dc2626', fontWeight: '600', fontSize: '14px' }}>{t.locationDenied}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{t.locationDeniedMsg}</div>
                </div>
                <button style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%' }} onClick={requestGPS}>{t.tryAgain}</button>
              </div>
            )}
            {gpsStatus === 'manual' && (
              <div>
                <div style={{ backgroundColor: '#fef9ec', borderRadius: '12px', padding: '16px', border: '2px solid #fbbf24', marginBottom: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>📝</div>
                  <div style={{ color: '#92400e', fontWeight: '600', fontSize: '14px' }}>{lang === 'es' ? 'Ubicacion no disponible' : 'Location unavailable'}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{lang === 'es' ? 'Confirma manualmente ingresando el numero de unidad' : 'Confirm manually by entering the unit number'}</div>
                </div>
                <input
                  type="text"
                  value={unitConfirm}
                  onChange={e => setState({ unitConfirm: e.target.value })}
                  placeholder={lang === 'es' ? 'Numero de unidad' : 'Unit number'}
                  style={{ width: '100%', padding: '14px', border: '2px solid #1B3A6B', borderRadius: '10px', fontSize: '16px', fontWeight: '600', textAlign: 'center', boxSizing: 'border-box', marginBottom: '12px', color: '#1B3A6B' }}
                />
                <button
                  style={{ backgroundColor: unitConfirm.trim() ? '#1B3A6B' : '#d1d5db', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: unitConfirm.trim() ? 'pointer' : 'not-allowed', width: '100%' }}
                  disabled={!unitConfirm.trim()}
                  onClick={handleManualConfirm}
                >
                  {lang === 'es' ? 'Confirmar y continuar →' : 'Confirm and Continue →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRvcPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxWidth: '430px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>{lang === 'es' ? 'Como confirmo el residente?' : 'How did the resident confirm?'}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{lang === 'es' ? 'Selecciona el metodo de confirmacion' : 'Select the confirmation method'}</div>
            {['In person - face to face', 'Resident showed notification on phone', 'Resident verbally confirmed code', 'Left door tag - no contact'].map(function(method) {
              return (
                <button key={method} onClick={() => { setState({ rvcMethod: method, showRvcPicker: false, step: 'ppe' }); }} style={{ width: '100%', padding: '14px', marginBottom: '8px', backgroundColor: '#f0f4ff', color: '#1B3A6B', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                  {method}
                </button>
              );
            })}
            <button onClick={() => setState({ showRvcPicker: false })} style={{ width: '100%', padding: '12px', backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {step === 'rvc' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ backgroundColor: '#1B3A6B', borderRadius: '16px', padding: '40px 24px', boxShadow: '0 4px 16px rgba(27,58,107,0.3)', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>{t.rvcLabel}</div>
            <div style={{ fontSize: '48px', fontWeight: '900', color: '#14B8A6', letterSpacing: '6px', fontFamily: 'monospace', marginBottom: '8px' }}>{rvcCode}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>{t.showCode}</div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
              {t.touch3Msg} <strong style={{ color: '#14B8A6' }}>{t.touch3Of}</strong> {t.touch3Rest}
            </div>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{t.touch3Logged} {new Date().toLocaleTimeString()}</div>
            <div style={{ fontSize: '13px', color: '#374151' }}>{t.unit} {job.unit_number || ''} - {job.property_name}</div>
          </div>
          <button style={{ backgroundColor: '#14B8A6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' }} onClick={() => setState({ showRvcPicker: true })}>
            {t.residentConfirmed}
          </button>
        </div>
      )}

      {step === 'ppe' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🦺</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1B3A6B', marginBottom: '8px' }}>{lang === 'es' ? 'Confirmacion de EPP' : 'PPE Confirmation'}</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>{lang === 'es' ? 'Confirma que llevas el equipo de proteccion personal adecuado para este trabajo.' : 'Confirm you have the proper personal protective equipment for this job.'}</div>
            {[['🥽', lang === 'es' ? 'Proteccion ocular' : 'Eye protection'], ['🧤', lang === 'es' ? 'Guantes' : 'Gloves'], ['👷', lang === 'es' ? 'Casco si aplica' : 'Hard hat if applicable'], ['👟', lang === 'es' ? 'Calzado de seguridad' : 'Safety footwear']].map(function(item) {
              return (
                <div key={item[1]} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '10px', marginBottom: '8px', textAlign: 'left' }}>
                  <span style={{ fontSize: '24px' }}>{item[0]}</span>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>{item[1]}</span>
                </div>
              );
            })}
          </div>
          <button style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%', marginBottom: '10px' }} onClick={() => { setState({ ppeConfirmed: true, step: isHvac ? 'hvac' : 'photos' }); }}>
            {lang === 'es' ? 'Confirmo - Tengo mi EPP' : 'Confirmed - I have my PPE'}
          </button>
          <button style={{ backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', width: '100%' }} onClick={() => setState({ step: 'rvc' })}>
            {lang === 'es' ? 'Volver' : 'Back'}
          </button>
        </div>
      )}
{step === 'hvac' && (() => {
        const PT_TABLES = {
          'R-22':   { low: [[20,-16],[30,-8],[40,0],[50,8],[60,15],[70,22],[80,28],[90,34],[100,40],[110,45],[120,50],[130,55],[140,59],[150,63],[160,67],[170,71],[180,75],[200,82],[220,88],[240,94]], high: [[100,40],[125,48],[150,56],[175,63],[200,70],[225,76],[250,82],[275,87],[300,92],[325,97],[350,102],[375,107],[400,111]] },
          'R-410A': { low: [[68,20],[83,30],[100,40],[118,50],[139,60],[162,70],[188,80],[216,90],[247,100],[281,110],[317,120],[357,130]], high: [[216,90],[247,100],[281,110],[317,120],[357,130],[400,141],[445,152],[494,163]] },
          'R-32':   { low: [[50,-4],[70,8],[90,19],[110,28],[130,37],[150,45],[170,53],[190,60],[210,67],[230,73],[250,79],[270,85],[290,91],[310,96]], high: [[250,79],[280,87],[310,96],[340,104],[370,111],[400,118],[430,125],[460,131],[490,137]] },
          'R-454B': { low: [[65,20],[80,30],[97,40],[116,50],[137,60],[160,70],[186,80],[214,90],[245,100],[279,110],[315,120],[354,130]], high: [[214,90],[245,100],[279,110],[315,120],[354,130],[396,141],[441,152],[489,163]] },
          'R-407C': { low: [[40,0],[55,10],[70,20],[87,30],[106,40],[127,50],[150,60],[175,70],[202,80],[232,90],[264,100],[299,110],[336,120]], high: [[175,70],[202,80],[232,90],[264,100],[299,110],[336,120],[376,130],[419,140],[465,150]] },
          'R-134a': { low: [[8,0],[11,5],[15,10],[19,15],[23,20],[28,25],[33,30],[39,35],[45,40],[51,45],[58,50],[65,55],[73,60],[82,65],[91,70],[101,75],[112,80]], high: [[91,70],[101,75],[112,80],[124,85],[137,90],[150,95],[165,100],[180,105],[196,110],[213,115],[231,120]] },
        };
        const getPT = (table, psi) => {
          if (!table || !psi) return null;
          const p = parseFloat(psi);
          if (isNaN(p)) return null;
          for (let i = 0; i < table.length - 1; i++) {
            const [p1, t1] = table[i];
            const [p2, t2] = table[i + 1];
            if (p >= p1 && p <= p2) return t1 + (t2 - t1) * ((p - p1) / (p2 - p1));
          }
          if (p < table[0][0]) return table[0][1];
          return table[table.length - 1][1];
        };
        const refData = PT_TABLES[refrigerantType];
        const lowSatTemp = refData ? getPT(refData.low, hvacLow) : null;
        const highSatTemp = refData ? getPT(refData.high, hvacHigh) : null;
        const superheat = (lowSatTemp !== null && suctionTemp !== '') ? parseFloat(suctionTemp) - lowSatTemp : null;
        const subcool = (highSatTemp !== null && liquidTemp !== '') ? highSatTemp - parseFloat(liquidTemp) : null;
        const RANGES = {
          'R-22':   { superheat: { TXV: [8,15], 'Fixed Orifice': [10,25] }, subcool: { TXV: [10,18], 'Fixed Orifice': [5,15] } },
          'R-410A': { superheat: { TXV: [8,15], 'Fixed Orifice': [10,20] }, subcool: { TXV: [10,18], 'Fixed Orifice': [5,10] } },
          'R-32':   { superheat: { TXV: [8,15], 'Fixed Orifice': [10,20] }, subcool: { TXV: [10,18], 'Fixed Orifice': [5,10] } },
          'R-454B': { superheat: { TXV: [8,15], 'Fixed Orifice': [10,20] }, subcool: { TXV: [10,18], 'Fixed Orifice': [5,10] } },
          'R-407C': { superheat: { TXV: [8,15], 'Fixed Orifice': [10,25] }, subcool: { TXV: [10,18], 'Fixed Orifice': [5,15] } },
          'R-134a': { superheat: { TXV: [8,15], 'Fixed Orifice': [10,20] }, subcool: { TXV: [10,18], 'Fixed Orifice': [5,10] } },
        };
        const getStatus = (val, type) => {
          if (val === null || !refrigerantType) return null;
          const range = RANGES[refrigerantType]?.[type]?.[expansionValve];
          if (!range) return null;
          const [lo, hi] = range;
          if (val >= lo && val <= hi) return 'green';
          if (val >= lo - 2 && val <= hi + 2) return 'yellow';
          return 'red';
        };
        const shStatus = getStatus(superheat, 'superheat');
        const scStatus = getStatus(subcool, 'subcool');
        const statusStyle = (s) => s === 'green' ? { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', icon: '🟢' } : s === 'yellow' ? { bg: '#fefce8', border: '#fbbf24', text: '#92400e', icon: '🟡' } : { bg: '#fef2f2', border: '#ef4444', text: '#dc2626', icon: '🔴' };
        const canContinue = refrigerantType && hvacLow && hvacHigh && suctionTemp && liquidTemp;

const handleHvacAnalysis = async () => {
  setState({ hvacAnalysisLoading: true });
  try {
    const res = await axios.post(`${API}/service-requests/${job.id}/hvac-analysis`, {
      hvac_low_side_psi: hvacLow,
      hvac_high_side_psi: hvacHigh,
      refrigerant_type: refrigerantType,
      expansion_valve_type: expansionValve,
      suction_line_temp: suctionTemp,
      liquid_line_temp: liquidTemp,
      superheat_result: superheat !== null ? superheat.toFixed(1) : null,
      subcool_result: subcool !== null ? subcool.toFixed(1) : null,
      triage_assessment: job.triage_assessment || null,
    }, { headers: { Authorization: `Bearer ${token}` } });
    setState({ hvacAnalysis: res.data, hvacAnalysisLoading: false });
  } catch (err) {
    console.error('[hvac-analysis] error:', err);
    setState({ hvacAnalysis: { likely_issue: 'Analysis unavailable', confidence: 'Low', next_step: 'Proceed with manual diagnosis' }, hvacAnalysisLoading: false });
  }
};
        return (
          <div style={{ padding: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>🌡️</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px', textAlign: 'center' }}>{lang === 'es' ? 'Diagnostico HVAC' : 'HVAC Diagnostics'}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginBottom: '20px' }}>{lang === 'es' ? 'Conecta manometros y registra lecturas' : 'Connect gauges and record all readings'}</div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#111827', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'es' ? 'Tipo de refrigerante' : 'Refrigerant Type'} <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={refrigerantType} onChange={e => setState({ refrigerantType: e.target.value })} style={{ width: '100%', padding: '12px', border: `2px solid ${refrigerantType ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B', backgroundColor: 'white', boxSizing: 'border-box' }}>
                  <option value="">{lang === 'es' ? 'Seleccionar refrigerante...' : 'Select refrigerant...'}</option>
                  {['R-22', 'R-410A', 'R-32', 'R-454B', 'R-407C', 'R-134a'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#111827', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'es' ? 'Tipo de valvula' : 'Expansion Valve'}</label>
                <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                  {['TXV', 'Fixed Orifice'].map(v => (
                    <button key={v} onClick={() => setState({ expansionValve: v })} style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', backgroundColor: expansionValve === v ? '#1B3A6B' : '#f9fafb', color: expansionValve === v ? 'white' : '#6b7280', fontWeight: '700', fontSize: '13px' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{lang === 'es' ? 'TXV es el predeterminado — cambia si la unidad usa orificio fijo' : 'TXV is default — change if unit uses fixed orifice'}</div>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔵 {lang === 'es' ? 'Lado bajo (succion)' : 'Low Side (Suction)'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Presion (PSI)' : 'Pressure (PSI)'}</label>
                    <input type="number" value={hvacLow} onChange={e => setState({ hvacLow: e.target.value })} placeholder="e.g. 70" style={{ width: '100%', padding: '12px', border: `2px solid ${hvacLow ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
                    {hvacLow && lowSatTemp !== null && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>Sat. Temp: {lowSatTemp.toFixed(1)}°F</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Temp linea succion (°F)' : 'Suction Line Temp (°F)'}</label>
                    <input type="number" value={suctionTemp} onChange={e => setState({ suctionTemp: e.target.value })} placeholder="e.g. 55" style={{ width: '100%', padding: '12px', border: `2px solid ${suctionTemp ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
                  </div>
                </div>
                {superheat !== null && (
                  <div style={{ backgroundColor: statusStyle(shStatus).bg, borderRadius: '10px', padding: '12px 16px', border: `2px solid ${statusStyle(shStatus).border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>{lang === 'es' ? 'SUPERCALENTAMIENTO' : 'SUPERHEAT'}</div>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: statusStyle(shStatus).text }}>{superheat.toFixed(1)}°F</div>
                        {refrigerantType && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{lang === 'es' ? 'Rango aceptable' : 'Acceptable range'}: {RANGES[refrigerantType]?.superheat?.[expansionValve]?.[0]}–{RANGES[refrigerantType]?.superheat?.[expansionValve]?.[1]}°F</div>}
                      </div>
                      <div style={{ fontSize: '32px' }}>{statusStyle(shStatus).icon}</div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔴 {lang === 'es' ? 'Lado alto (descarga)' : 'High Side (Discharge)'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Presion (PSI)' : 'Pressure (PSI)'}</label>
                    <input type="number" value={hvacHigh} onChange={e => setState({ hvacHigh: e.target.value })} placeholder="e.g. 250" style={{ width: '100%', padding: '12px', border: `2px solid ${hvacHigh ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
                    {hvacHigh && highSatTemp !== null && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>Sat. Temp: {highSatTemp.toFixed(1)}°F</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Temp linea liquido (°F)' : 'Liquid Line Temp (°F)'}</label>
                    <input type="number" value={liquidTemp} onChange={e => setState({ liquidTemp: e.target.value })} placeholder="e.g. 95" style={{ width: '100%', padding: '12px', border: `2px solid ${liquidTemp ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
                  </div>
                </div>
                {subcool !== null && (
                  <div style={{ backgroundColor: statusStyle(scStatus).bg, borderRadius: '10px', padding: '12px 16px', border: `2px solid ${statusStyle(scStatus).border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>{lang === 'es' ? 'SUBENFRIAMIENTO' : 'SUBCOOL'}</div>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: statusStyle(scStatus).text }}>{subcool.toFixed(1)}°F</div>
                        {refrigerantType && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{lang === 'es' ? 'Rango aceptable' : 'Acceptable range'}: {RANGES[refrigerantType]?.subcool?.[expansionValve]?.[0]}–{RANGES[refrigerantType]?.subcool?.[expansionValve]?.[1]}°F</div>}
                      </div>
                      <div style={{ fontSize: '32px' }}>{statusStyle(scStatus).icon}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {canContinue && !hvacAnalysis && (
              <button style={{ backgroundColor: hvacAnalysisLoading ? '#6b7280' : '#14B8A6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: hvacAnalysisLoading ? 'not-allowed' : 'pointer', width: '100%', marginBottom: '10px' }} disabled={hvacAnalysisLoading} onClick={handleHvacAnalysis}>
                {hvacAnalysisLoading ? '🤖 Analyzing readings...' : '🤖 Get AI Analysis →'}
              </button>
            )}
            {hvacAnalysis && (
              <div style={{ backgroundColor: '#0f1f3d', borderRadius: '12px', padding: '16px', marginBottom: '10px', border: '2px solid #14B8A6' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#14B8A6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>🤖 AI Finding</div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Likely Issue</div>
                  <div style={{ fontSize: '14px', color: 'white', fontWeight: '600', lineHeight: '1.4' }}>{hvacAnalysis.likely_issue}</div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confidence</div>
                  <span style={{ backgroundColor: hvacAnalysis.confidence === 'High' ? '#22c55e' : hvacAnalysis.confidence === 'Medium' ? '#f97316' : '#6b7280', color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>{hvacAnalysis.confidence}</span>
                </div>
                <div style={{ backgroundColor: 'rgba(20,184,166,0.15)', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #14B8A6' }}>
                  <div style={{ fontSize: '11px', color: '#14B8A6', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Next Step</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.4' }}>{hvacAnalysis.next_step}</div>
                </div>
                <button style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%', marginTop: '14px' }} onClick={() => setState({ step: 'photos' })}>
                  Continue to Photos →
                </button>
              </div>
            )}
            {!canContinue && (
              <button style={{ backgroundColor: '#d1d5db', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'not-allowed', width: '100%', marginBottom: '10px' }} disabled>
                {lang === 'es' ? 'Completa todas las lecturas' : 'Complete all readings'}
              </button>
            )}
            <button style={{ backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', width: '100%' }} onClick={() => setState({ step: 'ppe' })}>
              {lang === 'es' ? 'Volver' : 'Back'}
            </button>
          </div>
        );
      })()}
      {step === 'photos' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>{t.beforePhotos}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{t.photoInstruction}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '2px solid #14B8A6' }}>
                  <img src={p.url} alt={`photo-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '9px', padding: '2px 4px', textAlign: 'center' }}>{p.time}</div>
                </div>
              ))}
              <div style={{ aspectRatio: '1', borderRadius: '8px', border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#f9fafb' }} onClick={() => photoInputRef.current?.click()}>
                <div style={{ fontSize: '24px' }}>📷</div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{t.add}</div>
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={handlePhotoCapture} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: photos.length >= 2 ? '#f0fdf4' : '#fef9ec', border: `1px solid ${photos.length >= 2 ? '#22c55e' : '#fbbf24'}` }}>
              <span style={{ fontSize: '16px' }}>{photos.length >= 2 ? '✅' : '📸'}</span>
<span style={{ fontSize: '13px', color: photos.length >= 2 ? '#15803d' : '#92400e', fontWeight: '600' }}>
  {photos.length >= 1 ? `${photos.length} ${photos.length > 1 ? t.photosCaptured : t.photoCaptured}` : t.photoRequired}
              </span>
            </div>
          </div>
          <button style={{ backgroundColor: photos.length >= 2 ? '#1B3A6B' : '#d1d5db', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: photos.length >= 2 ? 'pointer' : 'not-allowed', width: '100%' }} disabled={photos.length < 1} onClick={handleBeginWork}>
            {photos.length >= 1 ? t.beginWork : t.addPhotoToContinue}
          </button>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <button onClick={onShow911} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>🚨 911</button>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
        <button onClick={onSupportCall} style={{ backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>📞 Support</button>
      </div>
    </div>
  );
}

// ── DiagnosisScreen ──
// State is now lifted to App and passed in as `state` + `setState`.
function DiagnosisScreen({  job, tech, token, checkInData, onComplete, onBack, lang, onVideoCall, checkedIn, state, setState , onShow911, onSupportCall }) {
  const t = STRINGS[lang];
  const {
    mode, system, category, cause, diagnosis, parts, newPart,
    deferralReason, deferralNotes, deferralNextSteps, checkInTimeMs,
  } = state;
  const [timeOnSite, setTimeOnSite] = useState('');
  const [listening, setListening] = useState(false);
  const [deferListening, setDeferListening] = useState(false);
  const recognition = useRef(null);
  const deferRecognition = useRef(null);

  // checkInTimeMs is set once per job (lifted state), so the timer keeps
  // counting correctly even if the tech navigates back and forward again.
  useEffect(() => {
    if (!checkInTimeMs) {
      setState({ checkInTimeMs: Date.now() });
      setTimeOnSite('0m');
      return;
    }
    const calc = () => {
      const mins = Math.floor((Date.now() - checkInTimeMs) / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setTimeOnSite(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const iv = setInterval(calc, 30000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInTimeMs]);

  const systems = Object.keys(ROOT_CAUSE_TREE);
  const categories = system ? Object.keys(ROOT_CAUSE_TREE[system]) : [];
  const causes = system && category ? ROOT_CAUSE_TREE[system][category] : [];

  const handleSystemChange = (val) => { setState({ system: val, category: '', cause: '' }); };
  const handleCategoryChange = (val) => { setState({ category: val, cause: '' }); };

  const addPart = () => {
    if (!newPart.name.trim()) return;
    setState({ parts: [...parts, { ...newPart, id: Date.now() }], newPart: { name: '', qty: 1, cost: '' } });
  };
  const removePart = (id) => setState({ parts: parts.filter(p => p.id !== id) });

  const diagnosisOk = diagnosis.trim().length >= 100;
  const rootCauseOk = system && category && cause;
  const canSubmitCompleted = diagnosisOk && rootCauseOk;

  const deferralReasons = lang === 'es'
    ? ['Piezas no disponibles', 'Residente no en casa', 'Problema de acceso', 'Requiere especialista/proveedor', 'Problema de seguridad', 'Requiere aprobacion del propietario', 'Otro']
    : ['Parts not available', 'Resident not home', 'Access issue', 'Requires specialist / vendor', 'Safety concern', 'Owner approval needed', 'Other'];

  const deferralOk = deferralReason && deferralNotes.trim().length >= 50;
  const totalPartsCost = parts.reduce((sum, p) => sum + (parseFloat(p.cost) || 0) * p.qty, 0);

  const handleSubmit = () => {
    if (mode === 'completed') {
      onComplete({ mode: 'completed', system, category, cause, diagnosis, parts, timeOnSite });
    } else {
      onComplete({ mode: 'deferred', deferralReason, deferralNotes, deferralNextSteps, timeOnSite, parts });
    }
  };

  const selectStyle = { width: '100%', padding: '11px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white', color: '#374151', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath fill=\'%236b7280\' d=\'M1 1l5 5 5-5\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' };

  const startDeferListen = () => {
    if (deferListening) { deferRecognition.current && deferRecognition.current.stop(); setDeferListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported.'); return; }
    const r = new SR();
    r.lang = lang === 'es' ? 'es-MX' : 'en-US';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => { const transcript = Array.from(e.results).map(r => r[0].transcript).join(' '); setState({ deferralNotes: deferralNotes ? deferralNotes + ' ' + transcript : transcript }); };
    r.onerror = () => setDeferListening(false);
    r.onend = () => setDeferListening(false);
    deferRecognition.current = r;
    r.start();
    setDeferListening(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '100px' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '8px' }}>{t.back}</button>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>{lang === 'es' ? 'Diagnostico y Cierre' : 'Diagnosis & Completion'} - {t.unit} {job.unit_number || ''}</div>
        {checkedIn && <button onClick={() => onVideoCall(job)} style={{ marginTop: '8px', backgroundColor: '#7c3aed', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>📹 Start Video Call</button>}
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{job.property_name}</div>
      </div>
      <div style={{ backgroundColor: '#0f1f3d', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{t.timeOnSite}</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#14B8A6' }}>{timeOnSite}</span>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Completed / Deferred Toggle ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'es' ? 'Estado del trabajo' : 'Job Outcome'}
          </div>
          <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <button onClick={() => setState({ mode: 'completed' })} style={{ flex: 1, padding: '12px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'completed' ? '#1B3A6B' : '#f9fafb', color: mode === 'completed' ? 'white' : '#6b7280', fontWeight: '700', fontSize: '14px', transition: 'all 0.15s' }}>
              ✅ {lang === 'es' ? 'Completado' : 'Completed'}
            </button>
            <button onClick={() => setState({ mode: 'deferred' })} style={{ flex: 1, padding: '12px', border: 'none', borderLeft: '1px solid #e5e7eb', cursor: 'pointer', backgroundColor: mode === 'deferred' ? '#dc2626' : '#f9fafb', color: mode === 'deferred' ? 'white' : '#6b7280', fontWeight: '700', fontSize: '14px', transition: 'all 0.15s' }}>
              ⏸ {lang === 'es' ? 'Aplazado' : 'Deferred'}
            </button>
          </div>
          {mode === 'deferred' && (
            <div style={{ marginTop: '10px', backgroundColor: '#fef2f2', borderRadius: '8px', padding: '10px 12px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                ⚠️ {lang === 'es' ? 'El aplazamiento se registra en el expediente del trabajo y notifica al coordinador.' : 'Deferral is logged to the job record and notifies the coordinator.'}
              </div>
            </div>
          )}
        </div>

        {/* ── DEFERRED MODE ── */}
        {mode === 'deferred' && (
          <>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626', marginBottom: '16px' }}>⏸ {lang === 'es' ? 'Razon del aplazamiento' : 'Deferral Reason'}</div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {lang === 'es' ? 'Selecciona una razon' : 'Select a reason'}
              </label>
              <select style={selectStyle} value={deferralReason} onChange={e => setState({ deferralReason: e.target.value })}>
                <option value="">{lang === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                {deferralReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                📝 {lang === 'es' ? 'Notas del aplazamiento' : 'Deferral Notes'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                {lang === 'es' ? 'Minimo 50 caracteres requeridos' : 'Minimum 50 characters required'}
              </div>
              <div style={{ position: 'relative' }}>
                <textarea style={{ width: '100%', padding: '12px', paddingRight: '52px', border: `1px solid ${deferralNotes.trim().length >= 50 ? '#22c55e' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', height: '120px', resize: 'none', lineHeight: '1.5' }}
                  placeholder={lang === 'es' ? 'Describe por que se aplaza este trabajo, que se intento y que se necesita para completarlo...' : 'Describe why this job is being deferred, what was attempted, and what is needed to complete it...'}
                  value={deferralNotes} onChange={e => setState({ deferralNotes: e.target.value })} />
                <button onClick={startDeferListen} style={{ position: 'absolute', right: '10px', top: '10px', width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: deferListening ? '#ef4444' : '#dc2626', color: 'white', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: deferListening ? '0 0 0 4px rgba(239,68,68,0.3)' : 'none' }}>
                  {deferListening ? '⏹' : '🎤'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: deferralNotes.trim().length >= 50 ? '#15803d' : deferListening ? '#ef4444' : '#6b7280' }}>
                  {deferralNotes.trim().length >= 50 ? '✅ ' + (lang === 'es' ? 'Minimo alcanzado' : 'Minimum met') : deferListening ? '🎤 ' + (lang === 'es' ? 'Escuchando...' : 'Listening...') : `${deferralNotes.trim().length} / 50 ${t.chars}`}
                </span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{deferralNotes.length} {t.chars}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>
                🔜 {lang === 'es' ? 'Proximos pasos' : 'Next Steps'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                {lang === 'es' ? 'Que pasa despues y quien es responsable?' : 'What happens next and who owns it?'}
              </div>
              <textarea style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', height: '80px', resize: 'none', lineHeight: '1.5' }}
                placeholder={lang === 'es' ? 'Ej: Coordinador ordenara la pieza, reprogramar en 3-5 dias...' : 'e.g. Coordinator will order part, reschedule within 3-5 days...'}
                value={deferralNextSteps} onChange={e => setState({ deferralNextSteps: e.target.value })} />
            </div>

            <div style={{ backgroundColor: deferralOk ? '#dc2626' : '#f9fafb', borderRadius: '12px', padding: '16px', border: `1px solid ${deferralOk ? 'transparent' : '#e5e7eb'}` }}>
              {!deferralOk && (
                <div style={{ marginBottom: '12px' }}>
                  {!deferralReason && <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>⚠ {lang === 'es' ? 'Selecciona una razon de aplazamiento' : 'Select a deferral reason'}</div>}
                  {deferralNotes.trim().length < 50 && <div style={{ fontSize: '13px', color: '#6b7280' }}>⚠ {lang === 'es' ? 'Notas necesitan' : 'Notes need'} {Math.max(0, 50 - deferralNotes.trim().length)} {lang === 'es' ? 'caracteres mas' : 'more characters'}</div>}
                </div>
              )}
              <button style={{ width: '100%', padding: '14px', backgroundColor: deferralOk ? 'white' : '#d1d5db', color: deferralOk ? '#dc2626' : '#9ca3af', border: deferralOk ? '2px solid white' : 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: deferralOk ? 'pointer' : 'not-allowed' }} disabled={!deferralOk} onClick={handleSubmit}>
                {deferralOk ? (lang === 'es' ? '⏸ Enviar aplazamiento' : '⏸ Submit Deferral') : (lang === 'es' ? 'Completa los campos requeridos' : 'Complete required fields')}
              </button>
            </div>
          </>
        )}

        {/* ── COMPLETED MODE ── */}
        {mode === 'completed' && (
          <>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '16px' }}>{t.rootCause}</div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.system}</label>
                <select style={selectStyle} value={system} onChange={e => handleSystemChange(e.target.value)}>
                  <option value="">{t.selectSystem}</option>
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.category}</label>
                <select style={{ ...selectStyle, backgroundColor: system ? 'white' : '#f9fafb', color: system ? '#374151' : '#9ca3af' }} value={category} onChange={e => handleCategoryChange(e.target.value)} disabled={!system}>
                  <option value="">{t.selectCategory}</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.cause}</label>
                <select style={{ ...selectStyle, backgroundColor: category ? 'white' : '#f9fafb', color: category ? '#374151' : '#9ca3af' }} value={cause} onChange={e => setState({ cause: e.target.value })} disabled={!category}>
                  <option value="">{t.selectCause}</option>
                  {causes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {rootCauseOk && (
                <div style={{ marginTop: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#15803d', fontWeight: '600' }}>
                  ✅ {system} → {category} → {cause}
                </div>
              )}
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>📝 {lang === 'es' ? 'Diagnostico y Cierre' : 'Diagnosis & Completion'}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>{t.diagnosisMin}</div>
              <div style={{ position: 'relative' }}>
                <textarea style={{ width: '100%', padding: '12px', paddingRight: '52px', border: `1px solid ${diagnosisOk ? '#22c55e' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', height: '120px', resize: 'none', lineHeight: '1.5' }} placeholder={t.diagnosisPlaceholder} value={diagnosis} onChange={e => setState({ diagnosis: e.target.value })} />
                <button onClick={() => {
                  if (listening) { recognition.current && recognition.current.stop(); setListening(false); return; }
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SR) { alert('Speech recognition not supported on this browser.'); return; }
                  const r = new SR();
                  r.lang = lang === 'es' ? 'es-MX' : 'en-US';
                  r.continuous = true;
                  r.interimResults = false;
                  r.onresult = (e) => { const transcript = Array.from(e.results).map(r => r[0].transcript).join(' '); setState({ diagnosis: diagnosis ? diagnosis + ' ' + transcript : transcript }); };
                  r.onerror = () => setListening(false);
                  r.onend = () => setListening(false);
                  recognition.current = r;
                  r.start();
                  setListening(true);
                }} style={{ position: 'absolute', right: '10px', top: '10px', width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: listening ? '#ef4444' : '#1B3A6B', color: 'white', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: listening ? '0 0 0 4px rgba(239,68,68,0.3)' : 'none' }}>
                  {listening ? '⏹' : '🎤'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: diagnosisOk ? '#15803d' : listening ? '#ef4444' : '#6b7280' }}>
                  {diagnosisOk ? t.minimumMet : listening ? (lang === 'es' ? '🎤 Escuchando...' : '🎤 Listening...') : `${diagnosis.trim().length} / 100 ${t.chars}`}
                </span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{diagnosis.length} {t.chars}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>{t.partsUsed}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>{t.partsOptional}</div>
              {parts.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {parts.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{t.qty}: {p.qty} {p.cost ? `- $${(parseFloat(p.cost) * p.qty).toFixed(2)}` : ''}</div>
                      </div>
                      <button onClick={() => removePart(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}>×</button>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#1B3A6B' }}>
                    {t.total}: ${totalPartsCost.toFixed(2)}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder={t.partName} value={newPart.name} onChange={e => setState({ newPart: { ...newPart, name: e.target.value } })} />
                <input style={{ width: '52px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box' }} type="number" min="1" placeholder={t.qty} value={newPart.qty} onChange={e => setState({ newPart: { ...newPart, qty: parseInt(e.target.value) || 1 } })} />
                <input style={{ width: '72px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} type="number" min="0" step="0.01" placeholder="$cost" value={newPart.cost} onChange={e => setState({ newPart: { ...newPart, cost: e.target.value } })} />
              </div>
              <button style={{ width: '100%', padding: '10px', backgroundColor: newPart.name.trim() ? '#f0fdf4' : '#f9fafb', color: newPart.name.trim() ? '#15803d' : '#9ca3af', border: `1px solid ${newPart.name.trim() ? '#22c55e' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: newPart.name.trim() ? 'pointer' : 'default' }} onClick={addPart} disabled={!newPart.name.trim()}>
                {t.addPart}
              </button>
            </div>

            <div style={{ backgroundColor: canSubmitCompleted ? '#1B3A6B' : '#f9fafb', borderRadius: '12px', padding: '16px', border: `1px solid ${canSubmitCompleted ? 'transparent' : '#e5e7eb'}` }}>
              {!canSubmitCompleted && (
                <div style={{ marginBottom: '12px' }}>
                  {!rootCauseOk && <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{t.warnRootCause}</div>}
                  {!diagnosisOk && <div style={{ fontSize: '13px', color: '#6b7280' }}>{t.warnDiagnosis} {Math.max(0, 100 - diagnosis.trim().length)} {t.moreChars}</div>}
                </div>
              )}
              <button style={{ width: '100%', padding: '14px', backgroundColor: canSubmitCompleted ? '#14B8A6' : '#d1d5db', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: canSubmitCompleted ? 'pointer' : 'not-allowed' }} disabled={!canSubmitCompleted} onClick={handleSubmit}>
                {canSubmitCompleted ? t.submitDiagnosis : t.completeFields}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <button onClick={onShow911} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>🚨 911</button>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
        <button onClick={onSupportCall} style={{ backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>📞 Support</button>
      </div>
    </div>
  );
}

// ── Gate1Screen ──
// Revised checklist: 7 items (tech close-out). QA handles deeper verification.
// Auto-checked: item 3 (resident notified — RVC), item 4 (parts log), item 5 (after photos).
// Manual: items 0, 1, 2, 6.
// GPS check-out fires automatically on Submit (see handleSubmitClick).
//
// State (checked / afterPhotos / gpsOut / etc.) is lifted to App so it
// survives back-navigation. `checked` starts as null in initial state;
// we lazily initialize it to the correct array the first time this screen
// mounts for a given job.
function Gate1Screen({  job, tech, token, checkInData, diagData, onComplete, onBack, lang, ppeConfirmed, state, setState , onShow911, onSupportCall }) {
  const t = STRINGS[lang];
  const isDeferred = diagData?.mode === 'deferred';

  const checklistItems = lang === 'es' ? [
    'Trabajo completado segun lo descrito',
    'Area limpia y escombros retirados',
    'Todos los puntos de acceso asegurados',
    'Residente notificado o nota dejada',
    'Piezas y materiales registrados',
    'Foto del trabajo completado tomada',
    'EPP retirado y equipo contabilizado',
  ] : [
    'Work completed as described',
    'Area cleaned and debris removed',
    'All access points secured',
    'Resident notified or note left',
    'Parts and materials logged',
    'Photo of completed work taken',
    'PPE removed and equipment accounted for',
  ];

  const autoChecked = {
    3: !!checkInData?.rvc,
    4: (diagData?.parts?.length || 0) > 0 || diagData?.partsNone === true,
    5: (state.afterPhotos?.length || 0) >= 1,
  };

  // All hooks must run unconditionally, in the same order, on every render
  // — including the very first render before `state.checked` has been
  // initialized. So every useState/useRef/useEffect lives here, above any
  // early return, even though some of their values aren't used until
  // `checked` is set a moment later.
  const { afterPhotos, signed, gpsOut } = state;
  const afterPhotoRef = useRef(null);
  const [gpsOutLoading, setGpsOutLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [unitAssets, setUnitAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Lazily initialize `checked` the first time this screen renders for a job.
  // (Effect, not a render-time setState-and-return, so hook order never changes.)
  useEffect(() => {
    if (state.checked === null) {
      setState({ checked: checklistItems.map((_, i) => autoChecked[i] || false) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.checked === null]);

  // Keep auto-checked items in sync as their underlying data changes
  // (e.g. after photos uploaded after this screen already mounted).
  useEffect(() => {
    if (state.checked === null) return;
    setState({
      checked: checklistItems.map((_, i) => (i in autoChecked) ? autoChecked[i] : state.checked[i]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInData?.photos?.length, afterPhotos?.length, diagData?.system, diagData?.category, diagData?.cause, diagData?.diagnosis, checkInData?.rvc, diagData?.parts?.length]);

  // Fetch assets for this unit so tech can link work order to asset
  useEffect(() => {
    if (!job?.property_id || !job?.unit_number) return;
    setAssetsLoading(true);
    fetch(`${process.env.REACT_APP_API_URL || 'https://servfixy-production.up.railway.app/api'}/assets?property_id=${job.property_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setUnitAssets(list.filter(a => a.unit_number === job.unit_number || a.unit_number === 'Common'));
      })
      .catch(() => setUnitAssets([]))
      .finally(() => setAssetsLoading(false));
  }, [job?.property_id, job?.unit_number]);

  // Until `checked` has been initialized (one tick after first mount),
  // render nothing. This is a plain conditional return AFTER all hooks
  // above have already run, so it's safe.
  if (state.checked === null) {
    return null;
  }
  const checked = state.checked;

  const toggleCheck = (i) => {
    if (i in autoChecked) return; // auto items aren't manually toggleable
    setState({ checked: checked.map((v, idx) => idx === i ? !v : v) });
  };

  const handleAfterPhoto = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setState({ afterPhotos: [...(state.afterPhotos || []), { url: ev.target.result, time: new Date().toLocaleTimeString() }] });
      };
      reader.readAsDataURL(file);
    });
  };

  const requiredCount = checklistItems.length; // 7 items — tech close-out
  const totalChecked = checked.filter(Boolean).length;
  const allChecked = totalChecked >= requiredCount;
  const progress = totalChecked / requiredCount;

  // Combined action: fire GPS check-out (if not already captured), then submit.
  const handleSubmitClick = () => {
    if (gpsOut) {
      onComplete({ afterPhotos, signed, totalChecked, gpsOut, selectedAssetId });
      return;
    }
    setSubmitError('');
    setGpsOutLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setState({ gpsOut: coords });
        setGpsOutLoading(false);
        onComplete({ afterPhotos, signed, totalChecked, gpsOut: coords, selectedAssetId });
      },
      (err) => {
        console.error('GPS check-out error:', err);
        setGpsOutLoading(false);
        // Don't block submission on GPS failure — proceed without coords,
        // same spirit as the manual check-in fallback.
        onComplete({ afterPhotos, signed, totalChecked, gpsOut: null, selectedAssetId });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '100px' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '8px' }}>{t.back}</button>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>Gate 1 - {lang === 'es' ? 'Pre-cierre' : 'Pre-close'}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{lang === 'es' ? `Lista de ${requiredCount} puntos requerida` : `${requiredCount}-point checklist required`}</div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{lang === 'es' ? 'Lista de verificacion' : 'Completion checklist'}</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: allChecked ? '#22c55e' : '#1B3A6B' }}>{totalChecked} / {requiredCount} {allChecked ? '✓' : ''}</span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: allChecked ? '#22c55e' : '#14B8A6', borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Asset Linkage Picker */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>
            🔗 {lang === 'es' ? 'Vincular activo' : 'Link Asset'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
            {lang === 'es' ? 'Selecciona el activo en el que trabajaste' : 'Select the asset you worked on — updates health score and CapEx forecast automatically'}
          </div>
          {assetsLoading ? (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading assets...</div>
          ) : unitAssets.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No assets registered for this unit.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unitAssets.map(asset => {
                const isSelected = selectedAssetId === asset.id;
                return (
                  <button key={asset.id} onClick={() => setSelectedAssetId(isSelected ? '' : asset.id)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '2px solid ' + (isSelected ? '#14B8A6' : '#e5e7eb'),
                      backgroundColor: isSelected ? 'rgba(20,184,166,0.08)' : '#f8fafc',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{asset.asset_type}</div>
                      {asset.make && <div style={{ fontSize: '11px', color: '#64748b' }}>{asset.make} {asset.model || ''}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {asset.unit_number === 'Common' && (
                        <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>Common</span>
                      )}
                      {isSelected && <span style={{ color: '#14B8A6', fontSize: '18px', fontWeight: '700' }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isDeferred && (
          <div style={{ backgroundColor: '#fef2f2', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px', border: '2px solid #dc2626', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⏸</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626', marginBottom: '2px' }}>{lang === 'es' ? 'Trabajo aplazado' : 'Job Deferred'}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang === 'es' ? 'Razon' : 'Reason'}: {diagData?.deferralReason}</div>
              {diagData?.deferralNextSteps && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{lang === 'es' ? 'Proximos pasos' : 'Next steps'}: {diagData?.deferralNextSteps}</div>}
            </div>
          </div>
        )}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '4px 0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          {checklistItems.map((item, i) => {
            const isAuto = i in autoChecked;
            return (
              <div key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderBottom: i < checklistItems.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: isAuto ? 'default' : 'pointer', opacity: isAuto ? 0.6 : 1 }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${checked[i] ? '#14B8A6' : '#d1d5db'}`, backgroundColor: checked[i] ? '#14B8A6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {checked[i] && <span style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: checked[i] ? '#6b7280' : '#374151', textDecoration: checked[i] ? 'line-through' : 'none' }}>{item}</div>
                  {i === 0 && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{lang === 'es' ? `${checkInData?.photos?.length || 0} foto(s) capturada(s)` : `${checkInData?.photos?.length || 0} captured`}</div>}
                  {i === 1 && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{lang === 'es' ? `${afterPhotos.length} foto(s) posterior(es)` : `${afterPhotos.length} after photos`}</div>}
                </div>
                {isAuto && <span style={{ fontSize: '10px', color: '#14B8A6', fontWeight: '700' }}>AUTO</span>}
              </div>
            );
          })}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>📷 {lang === 'es' ? 'Fotos posteriores' : 'After Photos'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>{lang === 'es' ? 'Se requieren minimo 2 fotos posteriores' : 'Minimum 2 after photos required'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {afterPhotos.map((p, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '2px solid #14B8A6' }}>
                <img src={p.url} alt={`after-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '9px', padding: '2px 4px', textAlign: 'center' }}>{p.time}</div>
              </div>
            ))}
            <div style={{ aspectRatio: '1', borderRadius: '8px', border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#f9fafb' }} onClick={() => afterPhotoRef.current?.click()}>
              <div style={{ fontSize: '24px' }}>📷</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{t.add}</div>
            </div>
          </div>
          <input ref={afterPhotoRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={handleAfterPhoto} />
        </div>

        <div style={{ backgroundColor: allChecked ? '#1B3A6B' : '#f9fafb', borderRadius: '12px', padding: '16px', border: `1px solid ${allChecked ? 'transparent' : '#e5e7eb'}` }}>
          {!allChecked && (
            <div style={{ marginBottom: '12px', padding: '10px 14px', backgroundColor: '#fef9ec', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <div style={{ fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
                {requiredCount - totalChecked} {lang === 'es' ? 'elementos restantes - no se puede enviar aun' : 'items remaining - cannot submit yet'}
              </div>
            </div>
          )}
          {submitError && (
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#dc2626' }}>{submitError}</div>
          )}
          <button style={{ width: '100%', padding: '14px', backgroundColor: allChecked ? '#14B8A6' : '#d1d5db', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: allChecked && !gpsOutLoading ? 'pointer' : 'not-allowed' }} disabled={!allChecked || gpsOutLoading}
            onClick={handleSubmitClick}>
            {gpsOutLoading ? (lang === 'es' ? '📍 Registrando salida...' : '📍 Recording check-out...') : allChecked ? (lang === 'es' ? '✅ Enviar Gate 1' : '✅ Submit Gate 1') : (lang === 'es' ? 'Completa todos los elementos' : 'Complete all items')}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <button onClick={onShow911} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>🚨 911</button>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
        <button onClick={onSupportCall} style={{ backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>📞 Support</button>
      </div>
    </div>
  );
}

function SubmittedScreen({ job, tech, token, checkInData, diagData, gate1Data, onNext, lang }) {
  const totalPartsCost = (diagData?.parts || []).reduce((sum, p) => sum + (parseFloat(p.cost) || 0) * p.qty, 0);
  const [stats, setStats] = useState({ closed: '-', gate1Pct: '-', satisfaction: 0, totalAssigned: '-' });
  useEffect(() => {
    axios.get(`${API}/technicians/${tech.id}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStats(r.data))
      .catch(() => {});
  }, [tech.id, token]);
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', backgroundColor: '#14B8A6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px' }}>✓</div>
        <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>{lang === 'es' ? 'Gate 1 completo!' : 'Gate 1 complete!'}</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{lang === 'es' ? 'Paquete enviado al coordinador para revision QA Gate 2' : 'Pre-close package submitted to coordinator for Gate 2 QA review.'}</div>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '16px' }}>{lang === 'es' ? 'Resumen del paquete' : 'Package summary'}</div>
          {[
            [lang === 'es' ? 'Fotos enviadas' : 'Photos submitted', `${(checkInData?.photos?.length || 0) + (gate1Data?.afterPhotos?.length || 0)} (${checkInData?.photos?.length || 0} ${lang === 'es' ? 'antes' : 'before'} + ${gate1Data?.afterPhotos?.length || 0} ${lang === 'es' ? 'despues' : 'after'})`],
            [lang === 'es' ? 'Causa raiz' : 'Root cause', diagData?.cause || '-'],
            [lang === 'es' ? 'Piezas usadas' : 'Parts used', diagData?.parts?.length ? `${diagData.parts.length} ${lang === 'es' ? 'articulo(s)' : 'item(s)'} - $${totalPartsCost.toFixed(2)}` : (lang === 'es' ? 'Ninguna' : 'None')],
            [lang === 'es' ? 'Tiempo en sitio' : 'Time on site', diagData?.timeOnSite || '-'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              [stats.closed ?? '-', lang === 'es' ? 'Cerrados' : 'Closed'],
              [stats.gate1Pct !== undefined ? `${stats.gate1Pct}%` : '-', 'Gate 1'],
              [stats.satisfaction > 0 ? stats.satisfaction : '-', lang === 'es' ? 'Satisfaccion' : 'Sat.'],
              [stats.totalAssigned, lang === 'es' ? 'Asignados' : 'Assigned'],
            ].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1B3A6B' }}>{val}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: '#1B3A6B', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }} onClick={onNext}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{lang === 'es' ? 'Siguiente asignacion' : 'Next assignment'}</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '12px' }}>{lang === 'es' ? 'Volver a la cola' : 'Back to queue'}</div>
          <div style={{ backgroundColor: '#14B8A6', color: 'white', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', display: 'inline-block' }}>{lang === 'es' ? 'Navegar' : 'Navigate'} →</div>
        </div>
      </div>
    </div>
  );
}

function JobDetail({ job, token, tech, onBack, onStatusUpdate, onCheckIn, onVideoCall, lang }) {
  const t = STRINGS[lang];
  const tier = getTier(job);
  const tLabel = lang === 'es' ? tierLabelEs[tier] : tierLabel[tier];
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [speaking, setSpeaking] = useState(false);

  const handleAudioSummary = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const isEs = lang === 'es';
    const unit = job.unit_number || '';
    const text = isEs
      ? `Trabajo en unidad ${unit}, ${job.property_name}. ${job.description}. Estado: ${job.status}.`
      : `Job at unit ${unit}, ${job.property_name}. ${job.description}. Status: ${job.status}.`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = isEs ? 'es-MX' : 'en-US';
    utt.rate = 0.95;
    utt.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      await axios.patch(`${API}/service-requests/${job.id}/status`, { status: newStatus, notes: note }, { headers: { Authorization: `Bearer ${token}` } });
      onStatusUpdate(job.id, newStatus);
      onBack();
    } catch { alert(t.failStatus); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', position: 'relative' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#1B3A6B', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '12px' }}>{t.backToJobs}</button>
        <button onClick={handleAudioSummary} style={{ position: 'absolute', top: '8px', right: '64px', backgroundColor: speaking ? '#ef4444' : '#1B3A6B', color: 'white', border: 'none', width: '38px', height: '38px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: speaking ? '0 0 0 4px rgba(239,68,68,0.3)' : '0 2px 6px rgba(0,0,0,0.2)' }}>
          {speaking ? '⏹' : '🔊'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: '700', color: '#1B3A6B' }}>
            {(() => { const scheduled = ['dispatched','scheduled','in_progress','pending_qa','completed']; const prefix = scheduled.includes(job.status) ? 'SO' : 'SR'; const num = job.ticket_number ? String(job.ticket_number).padStart(4,'0') : '????'; return `${prefix}-${num}`; })()}
          </span>
          <span style={{ backgroundColor: tierColor[tier], color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>{tLabel}</span>
        </div>
        <p style={{ margin: '0 0 16px', color: '#374151' }}>{job.description}</p>

        {/* Packaged Service Order */}
        {(job.triage_assessment || job.description || (job.photo_urls && job.photo_urls.length > 0) || job.location_room) && (
          <div style={{ backgroundColor: '#f0f4ff', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid #c7d7f5' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#1B3A6B', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>
              📋 {lang === 'es' ? 'Paquete de Servicio' : 'Service Brief'}
            </div>

            {job.description && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>{lang === 'es' ? 'Reporte del Residente' : 'Resident Report'}</div>
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{job.description}</div>
              </div>
            )}

            {job.triage_assessment && (
              <div style={{ marginBottom: '10px', backgroundColor: 'white', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #1B3A6B' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>🤖 {lang === 'es' ? 'Evaluacion IA' : 'AI Assessment'}</div>
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{job.triage_assessment}</div>
              </div>
            )}

            {job.location_room && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>📍 {lang === 'es' ? 'Ubicacion' : 'Location'}</div>
                <div style={{ fontSize: '13px', color: '#1B3A6B', fontWeight: '600' }}>{job.location_room}{job.location_spot ? ` — ${job.location_spot}` : ''}</div>
              </div>
            )}

            {job.photo_urls && job.photo_urls.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>📷 {lang === 'es' ? 'Fotos del Residente' : 'Resident Photos'} ({job.photo_urls.length})</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {job.photo_urls.map((url, i) => (
                    <img key={i} src={url} alt={`photo-${i}`} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #c7d7f5' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent((job.property_address || job.property_name || '') + ' Houston TX')}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', backgroundColor: '#f0f4ff', borderRadius: '8px', padding: '12px', marginBottom: '16px', textDecoration: 'none', border: '1px solid #c7d7f5' }}
          onClick={() => haptic([10])}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 {t.location} — Tap to Navigate</div>
          <div style={{ fontWeight: '700', color: '#1B3A6B' }}>{t.unit} {job.unit_number || ''}</div>
          <div style={{ color: '#111827', fontSize: '13px' }}>{job.property_name}</div>
        </a>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>{t.currentStatus}</div>
        <span style={{ backgroundColor: statusColor[job.status] || '#6b7280', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>
          {lang === 'es' ? ({ in_progress: 'En progreso', pending: 'Pendiente', assigned: 'Asignado', completed: 'Completado' }[job.status] || job.status) : job.status?.replace('_', ' ')}
        </span>
      </div>
      {(job.status === 'in_progress' || job.status === 'dispatched' || job.status === 'scheduled') && (
        <div style={{ backgroundColor: '#1B3A6B', borderRadius: '10px', padding: '20px', margin: '0 12px 12px', boxShadow: '0 2px 8px rgba(27,58,107,0.25)' }}>
          <div style={{ color: 'white', fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{t.readyToStart}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '16px' }}>{t.checkInRequired}</div>
          <button style={{ backgroundColor: '#14B8A6', color: 'white', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' }} onClick={() => { haptic([15, 50, 15]); onCheckIn(); }}>{t.beginCheckIn}</button>
          {job.status === 'in_progress' && job.tech_checked_in && <button style={{ backgroundColor: '#7c3aed', color: 'white', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%', marginTop: '10px' }} onClick={() => onVideoCall(job)}>📹 Start Video Call</button>}
        </div>
      )}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>{t.addNote}</div>
        <textarea style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', height: '80px', resize: 'none' }} placeholder={t.notesPlaceholder} value={note} onChange={e => setNote(e.target.value)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(job.status === 'dispatched' || job.status === 'scheduled') && (
            <button style={{ backgroundColor: '#f97316', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }} onClick={() => updateStatus('in_progress')} disabled={loading}>{t.markEnRoute}</button>
          )}
          {job.status === 'completed' && <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: '600' }}>{t.jobComplete}</div>}
        </div>
      </div>
    </div>
  );
}
function VideoCallScreen({ job, token, roomName, onBack, lang }) {
  const [, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const roomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import('twilio-video').then(TwilioVideo => {
      TwilioVideo.connect(token, { name: roomName, audio: true, video: { width: 640 } })
        .then(r => {
          if (cancelled) { r.disconnect(); return; }
          roomRef.current = r;
          setRoom(r);
          setConnecting(false);

          // Attach local video
          r.localParticipant.videoTracks.forEach(pub => {
            if (localVideoRef.current) localVideoRef.current.appendChild(pub.track.attach());
          });

          // Attach existing remote participants
          r.participants.forEach(participant => {
            participant.videoTracks.forEach(pub => {
              if (pub.track && remoteVideoRef.current) remoteVideoRef.current.appendChild(pub.track.attach());
            });
            participant.on('trackSubscribed', track => {
              if (track.kind === 'video' && remoteVideoRef.current) remoteVideoRef.current.appendChild(track.attach());
            });
          });

          // Handle new participants
          r.on('participantConnected', participant => {
            participant.on('trackSubscribed', track => {
              if (track.kind === 'video' && remoteVideoRef.current) remoteVideoRef.current.appendChild(track.attach());
            });
          });
        })
        .catch(err => {
          if (!cancelled) { setError('Could not connect to video room.'); setConnecting(false); }
        });
    });
    return () => {
      cancelled = true;
      if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
    };
  }, [token, roomName]);

  const handleHangUp = () => {
    if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
    onBack();
  };

  const toggleMute = () => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.audioTracks.forEach(pub => {
      muted ? pub.track.enable() : pub.track.disable();
    });
    setMuted(!muted);
  };

  const toggleVideo = () => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.videoTracks.forEach(pub => {
      videoOff ? pub.track.enable() : pub.track.disable();
    });
    setVideoOff(!videoOff);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1f3d', display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handleHangUp} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '14px', padding: 0 }}>← Back</button>
        <div style={{ fontSize: '15px', fontWeight: '700' }}>📹 Video Call</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Unit {job.unit_number}</div>
      </div>

      {connecting && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📡</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Connecting...</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>{roomName}</div>
        </div>
      )}

      {error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#ef4444' }}>{error}</div>
          <button onClick={onBack} style={{ marginTop: '20px', backgroundColor: '#14B8A6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Go Back</button>
        </div>
      )}

      {!connecting && !error && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
          <div ref={remoteVideoRef} style={{ flex: 1, backgroundColor: '#1a1a2e', borderRadius: '16px', overflow: 'hidden', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Waiting for CS team...</div>
          </div>
          <div ref={localVideoRef} style={{ width: '120px', height: '90px', backgroundColor: '#1B3A6B', borderRadius: '10px', overflow: 'hidden', alignSelf: 'flex-end', border: '2px solid #14B8A6' }} />
        </div>
      )}

      <div style={{ backgroundColor: '#1B3A6B', padding: '20px 16px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button onClick={toggleMute} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: muted ? '#ef4444' : 'rgba(255,255,255,0.15)', color: 'white', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {muted ? '🔇' : '🎤'}
        </button>
        <button onClick={handleHangUp} style={{ width: '64px', height: '64px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
          📵
        </button>
        <button onClick={toggleVideo} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: videoOff ? '#ef4444' : 'rgba(255,255,255,0.15)', color: 'white', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {videoOff ? '🚫' : '📷'}
        </button>
      </div>
    </div>
  );
}
function AdminDashboard({ tech, token, onLogout, lang, setLang }) {
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState(null);
  const [techJobs, setTechJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/technicians`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const filtered = (res.data || []).filter(t => t.email !== 'james@servfixy.com');
        setTechs(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSelectTech = (t) => {
    setSelectedTech(t);
    setJobsLoading(true);
    axios.get(`${API}/technicians/${t.id}/jobs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTechJobs(res.data || []))
      .catch(() => setTechJobs([]))
      .finally(() => setJobsLoading(false));
  };

  const tierColor = { LS: '#dc2626', '1': '#f97316', '2': '#facc15', '3': '#94a3b8' };
  const statusColor = { pending_triage: '#1e3a5f', dispatched: '#3b82f6', scheduled: '#14B8A6', in_progress: '#f97316', pending_qa: '#7c3aed', completed: '#22c55e' };

  const getTier = (job) => {
    if (job.tier) return String(job.tier);
    if (job.priority === 'emergency') return 'LS';
    if (job.priority === 'urgent') return '1';
    if (job.priority === 'high') return '2';
    if (job.priority === 'medium') return '3';
    return 'T4';
  };

  const getInitials = (t) => `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`;

  const getSatColor = (avg) => {
    if (!avg || avg === 0) return '#6b7280';
    if (avg >= 4) return '#22c55e';
    if (avg >= 3) return '#f97316';
    return '#ef4444';
  };

  if (selectedTech) return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px' }}>
        <button onClick={() => { setSelectedTech(null); setTechJobs([]); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '12px' }}>← Back to Team</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#14B8A6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px' }}>
            {getInitials(selectedTech)}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{selectedTech.first_name} {selectedTech.last_name}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{selectedTech.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
          {[
            ['Active Jobs', selectedTech.current_job_count || 0],
            ['Sat. Avg', selectedTech.satisfaction_avg > 0 ? `${Number(selectedTech.satisfaction_avg).toFixed(1)}★` : '—'],
            ['Reviews', selectedTech.satisfaction_count || 0],
          ].map(([label, val]) => (
            <div key={label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#14B8A6' }}>{val}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
          {jobsLoading ? 'Loading jobs...' : `${techJobs.length} active job${techJobs.length !== 1 ? 's' : ''}`}
        </div>
        {!jobsLoading && techJobs.length === 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '32px', textAlign: 'center', color: '#6b7280', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            No active jobs
          </div>
        )}
        {techJobs.map(job => {
          const tier = getTier(job);
          return (
            <div key={job.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${tierColor[tier]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700', color: '#1B3A6B', fontSize: '13px' }}>
                  {(() => { const scheduled = ['dispatched','scheduled','in_progress','pending_qa','completed']; const prefix = scheduled.includes(job.status) ? 'SO' : 'SR'; const num = job.ticket_number ? String(job.ticket_number).padStart(4,'0') : '????'; return `${prefix}-${num}`; })()}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ backgroundColor: tierColor[tier], color: tier === '2' ? '#000' : 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>{tierLabel[tier] || tier}</span>
                  <span style={{ backgroundColor: statusColor[job.status] || '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600' }}>{job.status?.replace('_', ' ')}</span>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>{job.description}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Unit {job.unit_number} · {job.property_name}</div>
              <SLATimer createdAt={job.created_at} slaHours={tier === 'LS' ? 1 : tier === '1' ? 4 : tier === '2' ? 24 : 72} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>👑 Admin View</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Team overview — {techs.length} technicians</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LangToggle lang={lang} setLang={setLang} />
          <button style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} onClick={onLogout}>Log Out</button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>Loading team...</div>
        ) : (
          techs.map(t => (
            <div key={t.id} onClick={() => handleSelectTech(t)}
              style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid #f0f0f0' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#14B8A6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f0f0'}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#0F2A52', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', color: '#14B8A6', flexShrink: 0 }}>
                {getInitials(t)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#1B3A6B', fontSize: '15px' }}>{t.first_name} {t.last_name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{t.email}</div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: t.current_job_count > 3 ? '#f97316' : '#1B3A6B' }}>{t.current_job_count || 0}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>Active</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: getSatColor(t.satisfaction_avg) }}>
                      {t.satisfaction_avg > 0 ? `${Number(t.satisfaction_avg).toFixed(1)}★` : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>Sat.</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#1B3A6B' }}>{t.satisfaction_count || 0}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>Reviews</div>
                  </div>
                </div>
              </div>
              <div style={{ color: '#14B8A6', fontSize: '18px' }}>›</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Initial values for the lifted check-in / diagnosis / gate1 form state.
// Pulled out so resetJobState() and useState() can both reference the
// same shape, and so each screen's state survives back/forward navigation
// (it now lives in App, not in the screen component itself).
const initialCheckInState = {
  step: 'gps',
  gpsStatus: 'idle',
  gpsCoords: null,
  photos: [],
  touch3Fired: false,
  showRvcPicker: false,
  rvcMethod: '',
  ppeConfirmed: false,
  unitConfirm: '',
  gpsFailCount: 0,
  hvacLow: '',
  hvacHigh: '',
  refrigerantType: '',
  expansionValve: 'TXV',
  suctionTemp: '',
  liquidTemp: '',
  hvacAnalysis: null,
  hvacAnalysisLoading: false,
};

const initialDiagnosisState = {
  mode: 'completed',
  system: '',
  category: '',
  cause: '',
  diagnosis: '',
  parts: [],
  newPart: { name: '', qty: 1, cost: '' },
  deferralReason: '',
  deferralNotes: '',
  deferralNextSteps: '',
  checkInTimeMs: null,
};

const initialGate1State = {
  checked: null, // null = not yet initialized for this job; Gate1Screen lazily fills this in
  afterPhotos: [],
  signed: false,
  gpsOut: null,
};

function JobHistoryScreen({ tech, token, lang, onBack }) {
  const t = STRINGS[lang];
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const tierColor = { LS: '#dc2626', '1': '#f97316', '2': '#facc15', '3': '#94a3b8' };
  React.useEffect(() => {
    fetch(`${API}/technicians/${tech.id}/jobs?status=completed&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setJobs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tech.id, token]);
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '40px' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '0' }}>←</button>
        <span style={{ fontWeight: '700', fontSize: '17px' }}>📋 {lang === 'es' ? 'Historial' : 'Job History'}</span>
      </div>
      {loading && (
        <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading history...</div>
      )}
      {!loading && jobs.length === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '32px 16px', margin: '16px', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div>No completed jobs yet.</div>
        </div>
      )}
      {jobs.map(job => {
        const tier = getTier(job);
        return (
          <div key={job.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${tierColor[tier]}`, opacity: 0.85 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <span style={{ fontWeight: '700', color: '#1B3A6B', fontSize: '14px' }}>{t.unit} {job.unit_number || ''}</span>
              <span style={{ backgroundColor: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>✓ Complete</span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#111827', fontSize: '13px' }}>{job.description}</p>
            <div style={{ color: '#9ca3af', fontSize: '11px' }}>
              {job.property_name} · {job.updated_at ? new Date(job.updated_at).toLocaleDateString() : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [tech, setTech] = useState(() => { const s = localStorage.getItem('techUser'); return s ? JSON.parse(s) : null; });
  const [token, setToken] = useState(() => localStorage.getItem('techToken') || '');
  const [selectedJob, setSelectedJob] = useState(null);
  const [screen, setScreen] = useState('list');
  const [selectedTurn, setSelectedTurn] = useState(null);
  const [walkType, setWalkType] = useState('notice');
  const [checkInData, setCheckInData] = useState(null);
  const [diagData, setDiagData] = useState(null);
  const [gate1Data, setGate1Data] = useState(null);
  const [videoToken, setVideoToken] = useState(null);
  const [videoRoom, setVideoRoom] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('techLang') || (navigator.language || navigator.userLanguage || '').toLowerCase().startsWith('es') ? 'es' : 'en');
  const [show911Confirm, setShow911Confirm] = useState(false);
  const [showSupportUnavailable, setShowSupportUnavailable] = useState(false);
  const [myTurnTasks, setMyTurnTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);

  const handleSupportVideoCall = async () => {
    try {
      const res = await axios.post(`${API}/video/token`, {
        serviceRequestId: null,
        techId: tech.id,
        techName: `${tech.first_name} ${tech.last_name}`,
        roomName: `support-${tech.id}-${Date.now()}`,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setVideoToken(res.data.token);
      setVideoRoom(res.data.roomName);
      setScreen('video');
    } catch (err) {
      alert('Failed to start support call. Please try again.');
    }
  };

  const handleSupportCall = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeVal = hour * 60 + minute;
    const monFri = day >= 1 && day <= 5;
    const sat = day === 6;
    const inHours = (monFri && timeVal >= 420 && timeVal < 1140) || (sat && timeVal >= 540 && timeVal < 1020);
    if (inHours) {
      handleSupportVideoCall();
    } else {
      setShowSupportUnavailable(true);
    }
  };


  // Lifted form state for the check-in / diagnosis / gate1 screens.
  // Living here (in App) instead of inside each screen component means
  // navigating back (onBack) and forward again doesn't remount-and-wipe
  // the screen's fields — only resetJobState() (called when a job is
  // fully submitted or abandoned) clears them.
  const [checkInState, setCheckInState] = useState(initialCheckInState);
  const [diagnosisState, setDiagnosisState] = useState(initialDiagnosisState);
  const [gate1State, setGate1State] = useState(initialGate1State);

  // Shallow-merge setters, so screens can call setState({ field: value })
  // instead of replacing the whole state object each time.
  const updateCheckInState = (patch) => setCheckInState(prev => ({ ...prev, ...patch }));
  const updateDiagnosisState = (patch) => setDiagnosisState(prev => ({ ...prev, ...patch }));
  const updateGate1State = (patch) => setGate1State(prev => ({ ...prev, ...patch }));

  const resetJobState = () => {
    setCheckInState(initialCheckInState);
    setDiagnosisState(initialDiagnosisState);
    setGate1State(initialGate1State);
  };

  const handleLangChange = (l) => { setLang(l); localStorage.setItem('techLang', l); };
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authReady, setAuthReady] = useState(false);
  const [isOnCall, setIsOnCall] = useState(false);

  // Mark auth as ready after first render so we never flash a blank screen
  useEffect(() => { setAuthReady(true); }, []);

  // Register FCM push token whenever tech is authenticated
  useEffect(() => {
    const t = localStorage.getItem('techToken');
    if (tech && t) {
      registerPushToken(t).catch(() => {});
    }
  }, [tech]);

  // Check if this tech is on-call today
  useEffect(() => {
    if (!tech) return;
    const t = localStorage.getItem('techToken');
    const today = new Date().toISOString().split('T')[0];
    fetch(`${API}/schedule?date=${today}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        const onCall = Array.isArray(rows) && rows.some(r => r.technician_id === tech.id);
        setIsOnCall(onCall);
      })
      .catch(() => {});
  }, [tech]);
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      const t = localStorage.getItem('techToken');
      if (t) replayQueue(t).catch(() => {});
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    // Foreground push notifications — show browser notification
    const unsubPush = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (Notification.permission === 'granted' && title) {
        new Notification(title, { body, icon: '/logo192.png' });
      }
    });
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (typeof unsubPush === 'function') unsubPush();
    };
  }, []);

  const speakWelcome = async (firstName, lastName) => {
    console.log('[speakWelcome] called with', firstName, lastName);
    try {
      const res = await fetch('https://servfixy-production.up.railway.app/api/tech-auth/welcome-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName || '', last_name: lastName || '' })
      });
      console.log('[speakWelcome] response status', res.status, res.headers.get('content-type'));
      if (!res.ok) { console.warn('[speakWelcome] non-ok response'); return; }
      const audioBlob = await res.blob();
      console.log('[speakWelcome] blob size', audioBlob.size, audioBlob.type);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.onerror = (e) => console.error('[speakWelcome] audio error', e);
      const playResult = audio.play();
      if (playResult) playResult.catch(e => console.warn('[speakWelcome] play()', e));
    } catch (e) {
      console.warn('[speakWelcome] catch:', e);
    }
  };

  const handleLogin = (techData) => {
    const t = localStorage.getItem('techToken');
    setTech(techData);
    setToken(t);
    // Register FCM push token
    if (t) registerPushToken(t).catch(() => {});
    // Welcome message
    speakWelcome(techData?.first_name, techData?.last_name);
  };
  useEffect(() => {
    if (screen === 'list' && tech && token) {
      setMyTasksLoading(true);
      fetch(`https://servfixy-production.up.railway.app/api/turns/my-tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => { setMyTurnTasks(Array.isArray(data) ? data : []); setMyTasksLoading(false); })
        .catch(() => setMyTasksLoading(false));
    }
  }, [screen, tech, token]);

  const handleLogout = () => { localStorage.clear(); setTech(null); setToken(''); setScreen('turn_tasks'); };
  const handleStatusUpdate = () => {};
  const handleCheckInComplete = (data) => { setCheckInData(data); setSelectedJob(prev => ({ ...prev, tech_checked_in: true, status: 'in_progress' })); setScreen('diagnosis'); };
  const handleDiagnosisComplete = (data) => { setDiagData(data); setScreen('gate1'); };
  const handleGate1Complete = async (data) => {
    setGate1Data(data);
    try {
      if (data.afterPhotos && data.afterPhotos.length > 0) {
        try {
          const formData = new FormData();
          for (const photo of data.afterPhotos) {
            const base64 = photo.url.split(',')[1];
            const binary = atob(base64);
            const arr = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
            const blob = new Blob([arr], { type: 'image/jpeg' });
            formData.append('photos', blob, `after-${Date.now()}.jpg`);
          }
          await axios.post(`${API}/service-requests/${selectedJob.id}/photos`, formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
        } catch (photoErr) {
          console.warn('After photos upload failed silently:', photoErr.message);
        }
      }
      await axios.post(`${API}/service-requests/${selectedJob.id}/gate1`, {
        tech_id: tech.id,
        root_cause_system: diagData?.system,
        root_cause_category: diagData?.category,
        root_cause_cause: diagData?.cause,
        diagnosis: diagData?.diagnosis,
        parts: diagData?.parts,
        time_on_site: diagData?.timeOnSite,
        checklist_completed: data.totalChecked,
        signed: data.signed,
        gps_checkout_lat: data.gpsOut?.lat || null,
        gps_checkout_lng: data.gpsOut?.lng || null,
        hvac_low_side_psi: checkInData?.hvacLow || null,
        hvac_high_side_psi: checkInData?.hvacHigh || null,
        refrigerant_type: checkInData?.refrigerantType || null,
        expansion_valve_type: checkInData?.expansionValve || null,
        suction_line_temp: checkInData?.suctionTemp || null,
        liquid_line_temp: checkInData?.liquidTemp || null,
        superheat_result: checkInData?.superheat || null,
        subcool_result: checkInData?.subcool || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      try {
        await axios.patch(`${API}/touchpoints/${selectedJob.id}/5`, { fired_by: tech.email, notes: `Gate 1 submitted. ${data.totalChecked} checklist items completed.` }, { headers: { Authorization: `Bearer ${token}` } });
      } catch { console.warn('Touch 5 failed silently'); }

      // Auto-log service event to asset if tech linked one
      if (data.selectedAssetId) {
        try {
          const repairCost = (diagData?.parts || []).reduce((s, p) => s + (parseFloat(p.cost) || 0) * (p.qty || 1), 0);
          const description = diagData?.diagnosis
            ? diagData.diagnosis.substring(0, 120)
            : (diagData?.cause || 'Service completed via work order');
          await axios.post(`${API}/assets/${data.selectedAssetId}/service-log`, {
            service_request_id: selectedJob.id,
            repair_cost: repairCost,
            service_date: new Date().toISOString().split('T')[0],
            technician: `${tech.first_name} ${tech.last_name}`,
            description,
          }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (assetErr) {
          console.warn('Asset service log failed silently:', assetErr.message);
        }
      }

    } catch (err) {
      if (!navigator.onLine) {
        // Queue gate1 submit for replay when back online
        await enqueue({
          type: 'gate1_submit',
          url: `/service-requests/${selectedJob.id}/gate1`,
          method: 'POST',
          payload: {
            tech_id: tech.id,
            root_cause_system: diagData?.system,
            root_cause_category: diagData?.category,
            root_cause_cause: diagData?.cause,
            diagnosis: diagData?.diagnosis,
            parts: diagData?.parts,
            time_on_site: diagData?.timeOnSite,
            checklist_completed: data.totalChecked,
            signed: data.signed,
            gps_checkout_lat: data.gpsOut?.lat || null,
            gps_checkout_lng: data.gpsOut?.lng || null,
          }
        }).catch(() => {});
        console.log('[offline] gate1 queued for job', selectedJob.id);
      } else {
        console.error('Gate 1 submit error:', err);
      }
    }
    setScreen('submitted');
  };
  const handleWalkComplete = async (result) => {
    const { walkType, assessmentRows } = result;
    try {
      const walkRes = await fetch(`${API}/turns/${selectedTurn.id}/walks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ walk_type: walkType, walked_by: tech.id })
      });
      const walkData = await walkRes.json();
      console.log('walkRes status:', walkRes.status, 'walkData:', JSON.stringify(walkData));
      console.log('assessmentRows:', JSON.stringify(assessmentRows));
      if (walkRes.ok && walkData.id && assessmentRows && assessmentRows.length > 0) {
        await fetch(`${API}/turns/${selectedTurn.id}/walks/${walkData.id}/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ assessments: assessmentRows })
        });
      }
    } catch (err) { console.error('Walk submit error:', err); }
    setScreen("turn_tasks");
  };
  const handleSubmittedNext = () => {
    setScreen('list');
    setSelectedJob(null);
    setCheckInData(null);
    setDiagData(null);
    setGate1Data(null);
    resetJobState();
  };
  const handleVideoCall = async (job) => {
  try {
    const res = await axios.post(`${API}/video/token`, {
      serviceRequestId: job.id,
      techId: tech.id,
      techName: `${tech.first_name} ${tech.last_name}`,
    }, { headers: { Authorization: `Bearer ${token}` } });
    setVideoToken(res.data.token);
    setVideoRoom(res.data.roomName);
    setScreen('video');
  } catch (err) {
    alert('Failed to start video call. Please try again.');
  }
};

  const t = STRINGS[lang];

  if (!authReady) return null;
  if (!tech) return <LoginScreen onLogin={handleLogin} lang={lang} setLang={handleLangChange} />;
  const OfflineBanner = () => !isOnline ? (
    <div style={{ background: '#f97316', color: 'white', textAlign: 'center', padding: '6px 12px', fontSize: '13px', fontWeight: '600', position: 'sticky', top: 0, zIndex: 9999 }}>
      ⚡ Offline — changes will sync when reconnected
    </div>
  ) : null;
  if (tech.email === 'james@servfixy.com') return <AdminDashboard tech={tech} token={token} onLogout={handleLogout} lang={lang} setLang={handleLangChange} />;

  const getTitle = () => {
    if (screen === 'checkin') return t.checkIn;
    if (screen === 'diagnosis') return t.diagnosis;
    if (screen === 'detail') return t.jobDetail;
    return `${t.hi}, ${tech.first_name} 👋`;
  };

  // Starting a brand new job (from JobDetail's "Begin Check-In") should
  // start with a clean slate, in case leftover state exists from a
  // previous job that wasn't fully submitted.
  const handleBeginCheckIn = () => {
    resetJobState();
    setScreen('checkin');
  };

  const techInitials = (tech.first_name?.[0] || '') + (tech.last_name?.[0] || '');
  const sidebarNavItems = [
    { key: 'list', label: 'My Jobs', icon: '🔧' },
    { key: 'turn_tasks', label: 'Turn Tasks', icon: '🏠' },
    { key: 'history', label: 'Job History', icon: '🕐' },
    { key: 'tasks', label: 'Tasks', icon: '✅' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#F0F4F8' }}>
      {/* Sidebar — hidden on checkin/diagnosis/gate1 screens */}
      {screen !== 'checkin' && screen !== 'diagnosis' && screen !== 'gate1' && (
        <div style={{ width: '220px', minWidth: '220px', backgroundColor: '#1B3A6B', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100 }}>
          {/* Logo */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <img src="https://i.imgur.com/OKIqq0K.png" alt="Servfixy" style={{ width: '150px', height: 'auto' }} />
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Technician Portal</div>
          </div>
          {/* Tech info */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#14B8A6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', color: '#fff', flexShrink: 0 }}>
                {techInitials}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{tech.first_name} {tech.last_name}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{tech.certification_level || 'S1 Specialist'}</div>
              </div>
            </div>
            {isOnCall && (
              <div style={{ marginTop: '10px', backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', display: 'inline-block', letterSpacing: '0.5px' }}>ON CALL</div>
            )}
          </div>
          {/* Nav */}
          <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
            {sidebarNavItems.map(item => {
              const isActive = screen === item.key;
              return (
                <button key={item.key} onClick={() => { haptic([10]); setScreen(item.key); setSelectedJob(null); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginBottom: '2px', backgroundColor: isActive ? 'rgba(20,184,166,0.15)' : 'transparent', color: isActive ? '#14B8A6' : 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: isActive ? '600' : '400', textAlign: 'left' }}>
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
          {/* Lang toggle + logout */}
          <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['en', 'es'].map(l => (
                <button key={l} onClick={() => handleLangChange(l)} style={{ flex: 1, padding: '5px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: lang === l ? '#14B8A6' : 'rgba(255,255,255,0.1)', color: lang === l ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: '11px' }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.55)', fontSize: '12px', cursor: 'pointer' }}>{t.logOut}</button>
          </div>
        </div>
      )}
      {/* Main content area */}
      <div style={{ marginLeft: screen !== 'checkin' && screen !== 'diagnosis' && screen !== 'gate1' ? '220px' : '0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <OfflineBanner />
      {screen !== 'checkin' && screen !== 'diagnosis' && screen !== 'gate1' && (
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{getTitle()}</span>
            {screen === 'list' && <span style={{ fontSize: '12px', color: '#6b7280', background: '#F0F4F8', padding: '3px 10px', borderRadius: '20px' }}>{t.certZone}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>On duty</span>
          </div>
        </div>
      )}
      {screen === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '12px 16px 0' }}>
          <div onClick={() => { haptic([10]); setScreen('tasks'); }} style={{ backgroundColor: '#14B8A6', color: 'white', padding: '14px 12px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>🧪 Rounds</span><span>→</span></div>
          <div onClick={() => { haptic([10]); setScreen('history'); }} style={{ backgroundColor: '#7c3aed', color: 'white', padding: '14px 12px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>📋 History</span><span>→</span></div>
        </div>
      )}
      {screen === 'list' && <div onClick={() => { haptic([10]); setScreen('turns'); }} style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '14px 16px', margin: '8px 16px 0', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>🚪 Turn Walks</span><span>→</span></div>}
      {screen === 'list' && (() => {
        if (myTasksLoading) return <div style={{ margin: '8px 16px 0', padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '10px', color: '#6b7280', fontSize: '13px' }}>Loading your turn tasks...</div>;
        if (myTurnTasks.length === 0) return null;
        // Group by turn
        const byTurn = myTurnTasks.reduce((acc, t) => {
          const key = t.turn_id;
          if (!acc[key]) acc[key] = { turn_id: t.turn_id, unit_number: t.unit_number, floorplan_name: t.floorplan_name, projected_ready_date: t.projected_ready_date, tasks: [] };
          acc[key].tasks.push(t);
          return acc;
        }, {});
        return (
          <div style={{ margin: '8px 16px 0' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', letterSpacing: '1px', marginBottom: '6px', paddingLeft: '2px' }}>MY TURN TASKS</div>
            {Object.values(byTurn).map(group => {
              const pending = group.tasks.filter(t => t.status === 'pending').length;
              const inProg = group.tasks.filter(t => t.status === 'in_progress').length;
              const fakeTurn = { id: group.turn_id, unit_number: group.unit_number, floorplan_name: group.floorplan_name, floorplan_type: group.floorplan_name };
              return (
                <div key={group.turn_id}
                  onClick={() => { setSelectedTurn(fakeTurn); setScreen('turn_tasks'); }}
                  style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#1B3A6B', fontSize: '14px' }}>Unit {group.unit_number}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{group.floorplan_name || ''}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      {inProg > 0 && <span style={{ fontSize: '11px', backgroundColor: '#fff7ed', color: '#f97316', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>▶ {inProg} in progress</span>}
                      {pending > 0 && <span style={{ fontSize: '11px', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '6px' }}>{pending} pending</span>}
                    </div>
                  </div>
                  <span style={{ color: '#14B8A6', fontSize: '20px' }}>→</span>
                </div>
              );
            })}
          </div>
        );
      })()}
      {screen === 'list' && <JobList tech={tech} token={token} onSelectJob={(job) => { setSelectedJob(job); setScreen('detail'); }} lang={lang} onShow911={() => setShow911Confirm(true)} onSupportCall={handleSupportCall} />}
      {screen === 'detail' && selectedJob && <JobDetail job={selectedJob} token={token} tech={tech} onBack={() => setScreen('list')} onStatusUpdate={handleStatusUpdate} onCheckIn={handleBeginCheckIn} onVideoCall={handleVideoCall} lang={lang} />}
      {screen === 'checkin' && selectedJob && <CheckInScreen job={selectedJob} tech={tech} token={token} onComplete={handleCheckInComplete} onBack={() => setScreen('detail')} lang={lang} state={checkInState} setState={updateCheckInState} onShow911={() => setShow911Confirm(true)} onSupportCall={handleSupportCall} />}
      {screen === 'diagnosis' && selectedJob && <DiagnosisScreen job={selectedJob} tech={tech} token={token} checkInData={checkInData} onComplete={handleDiagnosisComplete} onBack={() => setScreen('checkin')} lang={lang} onVideoCall={handleVideoCall} checkedIn={selectedJob.tech_checked_in} state={diagnosisState} setState={updateDiagnosisState} onShow911={() => setShow911Confirm(true)} onSupportCall={handleSupportCall} />}
      {screen === 'gate1' && selectedJob && <Gate1Screen job={selectedJob} tech={tech} token={token} checkInData={checkInData} diagData={diagData} onComplete={handleGate1Complete} onBack={() => setScreen('diagnosis')} lang={lang} ppeConfirmed={checkInData?.ppeConfirmed} state={gate1State} setState={updateGate1State} onShow911={() => setShow911Confirm(true)} onSupportCall={handleSupportCall} />}
      {screen === 'submitted' && selectedJob && <SubmittedScreen job={selectedJob} tech={tech} token={token} checkInData={checkInData} diagData={diagData} gate1Data={gate1Data} onNext={handleSubmittedNext} lang={lang} />}
      {screen === 'video' && selectedJob && videoToken && <VideoCallScreen job={selectedJob} token={videoToken} roomName={videoRoom} onBack={() => setScreen('detail')} lang={lang} />}
      {screen === 'tasks' && <TaskScreen token={token} lang={lang} onBack={() => setScreen('list')} />}
      {screen === 'history' && <JobHistoryScreen tech={tech} token={token} lang={lang} onBack={() => setScreen('list')} />}
      {screen === 'turns' && <TurnWalkList tech={tech} token={token} lang={lang} onBack={() => setScreen('list')} onStartWalk={(turn, walkType) => { setSelectedTurn(turn); setWalkType(walkType); setScreen('turn_walk'); }} />}
        {screen === 'turn_walk' && selectedTurn && <WalkScreen turn={selectedTurn} walkType={walkType} tech={tech} token={token} onBack={() => setScreen('list')} onComplete={handleWalkComplete} />}
      {screen === "turn_tasks" && selectedTurn && <TurnTaskScreen turn={selectedTurn} token={token} tech={tech} onBack={() => setScreen("turns")} onDone={() => setScreen("turns")} />}
      {show911Confirm && (
        
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px 24px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚨</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginBottom: '8px' }}>Call 911?</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.5' }}>This will open your phone dialer to call emergency services.</div>
            <a href="tel:911" style={{ display: 'block', backgroundColor: '#ef4444', color: 'white', borderRadius: '10px', padding: '14px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', marginBottom: '12px' }} onClick={() => setShow911Confirm(false)}>
              Yes, Call 911
            </a>
            <button onClick={() => setShow911Confirm(false)} style={{ width: '100%', backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {showSupportUnavailable && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px 24px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🕐</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#1B3A6B', marginBottom: '12px' }}>Support Unavailable</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.6' }}>Support is unavailable right now. Hours are M-F 7am-7pm and Sat 9am-5pm. For emergencies call 911.</div>
            <button onClick={() => { setShowSupportUnavailable(false); setShow911Confirm(true); }} style={{ width: '100%', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px' }}>
              🚨 Call 911
            </button>
            <button onClick={() => setShowSupportUnavailable(false)} style={{ width: '100%', backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
