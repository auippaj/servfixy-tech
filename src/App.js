import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'https://servfixy-production.up.railway.app/api';

const statusColor = { pending: '#6b7280', assigned: '#3b82f6', in_progress: '#f97316', completed: '#22c55e' };
const tierColor = { T1: '#ef4444', T2: '#f97316', T3: '#3b82f6', T4: '#a855f7' };
const tierLabel = { T1: 'Tier 1 - Emergency', T2: 'Tier 2 - Urgent', T3: 'Tier 3 - Routine', T4: 'Tier 4 - Cosmetic' };
const tierLabelEs = { T1: 'Nivel 1 - Emergencia', T2: 'Nivel 2 - Urgente', T3: 'Nivel 3 - Rutina', T4: 'Nivel 4 - Cosmetico' };

function getTier(job) {
  if (job.priority === 'urgent') return 'T1';
  if (job.priority === 'high') return 'T2';
  if (job.priority === 'medium') return 'T3';
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1f3d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px 36px', width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <img src="https://i.imgur.com/eX28z4J.png" style={{ width: '320px', marginBottom: '-12px' }} alt="Servfixy" />
            
          </div>
          <p style={{ color: '#6b7280', margin: '0 0 12px', fontSize: '14px' }}>{t.techPortal}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', backgroundColor: '#f0f4ff', borderRadius: '8px', overflow: 'hidden', fontSize: '12px' }}>
              {['en', 'es'].map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: '5px 14px', border: 'none', cursor: 'pointer', backgroundColor: lang === l ? '#1B3A6B' : 'transparent', color: lang === l ? 'white' : '#6b7280', fontWeight: '700', fontSize: '12px' }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{t.email}</label>
          <input style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', backgroundColor: '#f0f4ff', boxSizing: 'border-box' }} type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{t.password}</label>
          <input style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', backgroundColor: '#f0f4ff', boxSizing: 'border-box' }} type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}
        <button style={{ width: '100%', padding: '13px', backgroundColor: '#1B3A6B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }} onClick={handleLogin} disabled={loading}>
          {loading ? t.signingIn : t.signIn}
        </button>
      </div>
    </div>
  );
}

function JobList({ tech, token, onSelectJob, lang }) {
  const t = STRINGS[lang];
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const fetchJobs = () => {
    axios.get(`${API}/technicians/${tech.id}/jobs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setJobs(res.data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchJobs(); }, [tech.id, token]);
  const handleAccept = async (e, jobId) => {
    e.stopPropagation();
    setActionLoading(jobId + '_accept');
    try {
      await axios.patch(`${API}/service-requests/${jobId}/status`, { status: 'in_progress' }, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'in_progress' } : j));
      try {
        await axios.patch(`${API}/touchpoints/${jobId}/1`, { fired_by: tech.email, notes: 'Job accepted by technician' }, { headers: { Authorization: `Bearer ${token}` } });
      } catch { console.warn('Touch 1 failed silently'); }
    } catch { alert(t.failAccept); }
    setActionLoading(null);
  };
  const handleDecline = async (e, jobId) => {
    e.stopPropagation();
    setActionLoading(jobId + '_decline');
    try {
      await axios.patch(`${API}/service-requests/${jobId}/status`, { status: 'pending' }, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch { alert(t.failDecline); }
    setActionLoading(null);
  };
  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>{t.loadingJobs}</div>;
  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{jobs.length} {jobs.length !== 1 ? t.assignedJobs : t.assignedJob}</div>
      {jobs.length === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '32px 16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          {t.noJobs}
        </div>
      )}
      {jobs.map(job => {
        const tier = getTier(job);
        const tLabel = lang === 'es' ? tierLabelEs[tier] : tierLabel[tier];
        return (
          <div key={job.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', borderLeft: `4px solid ${tierColor[tier]}` }} onClick={() => onSelectJob(job)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <span style={{ fontWeight: '600', color: '#1B3A6B', fontSize: '15px' }}>{t.unit} {job.unit_number || ''}</span>
              <span style={{ backgroundColor: tierColor[tier], color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{tLabel}</span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#374151', fontSize: '14px' }}>{job.description}</p>
            <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>{job.property_name}</div>
            <SLATimer createdAt={job.created_at} slaHours={tier === 'T1' ? 2 : tier === 'T2' ? 24 : 72} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ backgroundColor: statusColor[job.status] || '#6b7280', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                {lang === 'es' ? ({ in_progress: 'En progreso', pending: 'Pendiente', assigned: 'Asignado', completed: 'Completado' }[job.status] || job.status) : job.status?.replace('_', ' ')}
              </span>
              {job.status === 'assigned' && (
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
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span>{t.gpsActive}</span>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
      </div>
    </div>
  );
}

function generateRVC(jobId) {
  const suffix = jobId ? jobId.slice(0, 4).toUpperCase() : 'XXXX';
  return `SERV${suffix}`;
}

function CheckInScreen({ job, tech, token, onComplete, onBack, lang }) {
  const t = STRINGS[lang];
  const [step, setStep] = useState('gps');
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [touch3Fired, setTouch3Fired] = useState(false);
  const [showRvcPicker, setShowRvcPicker] = useState(false);
  const [rvcMethod, setRvcMethod] = useState('');
  const [ppeConfirmed, setPpeConfirmed] = useState(false);
  const [hvacLow, setHvacLow] = useState('');
  const [hvacHigh, setHvacHigh] = useState('');
  const [refrigerantType, setRefrigerantType] = useState('');
  const [expansionValve, setExpansionValve] = useState('TXV');
  const [suctionTemp, setSuctionTemp] = useState('');
  const [liquidTemp, setLiquidTemp] = useState('');
  const isHvac = job?.title?.toLowerCase().includes('hvac') || job?.description?.toLowerCase().includes('hvac') || job?.title?.toLowerCase().includes('ac ') || job?.title?.toLowerCase().includes('air') || job?.description?.toLowerCase().includes('cooling') || job?.description?.toLowerCase().includes('heating') || job?.category?.toLowerCase().includes('hvac') || (job?.title || '').toLowerCase().includes('hvac') || (job?.description || '').toLowerCase().includes('hvac') || (job?.description || '').toLowerCase().includes('ac ') || (job?.description || '').toLowerCase().includes('cold');
  const steps = isHvac ? [t.gpsStep, t.rvcStep, 'PPE', 'Gauges', t.photosStep] : [t.gpsStep, t.rvcStep, 'PPE', t.photosStep];
  const stepIndex = step === 'gps' ? 0 : step === 'rvc' ? 1 : step === 'ppe' ? 2 : step === 'hvac' ? 3 : (isHvac ? 4 : 3);
  const photoInputRef = useRef(null);
  const rvcCode = generateRVC(job.id);

  const requestGPS = () => {
    setGpsStatus('checking');
    setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
  (position) => {
    setGpsCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
  },
  (err) => {
    console.error('GPS error:', err);
    setGpsCoords(null);
  },
  { enableHighAccuracy: true, timeout: 10000 }
);
      setGpsStatus('confirmed');
      setTimeout(() => setStep('rvc'), 1500);
    }, 1200);
  };

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, { url: ev.target.result, name: file.name, time: new Date().toLocaleTimeString() }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBeginWork = async () => {
    if (!touch3Fired) {
      setTouch3Fired(true);
      try {
        await axios.patch(`${API}/touchpoints/${job.id}/3`, { fired_by: tech.email, notes: `RVC: ${rvcCode}` }, { headers: { Authorization: `Bearer ${token}` } });
      } catch { }
    }
    // Flip tech_checked_in flag so resident video button activates
    try {
      await axios.patch(`${API}/service-requests/${job.id}/tech-checkin`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error('Check-in flag error:', err.message, err.response?.data);
      alert('Check-in flag error: ' + err.message);
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
            {gpsStatus === 'idle' && <button style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' }} onClick={requestGPS}>{t.confirmGPS}</button>}
            {gpsStatus === 'checking' && <div style={{ color: '#6b7280', fontSize: '14px', padding: '14px' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>{t.gettingLocation}</div>}
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
                <button key={method} onClick={() => { setRvcMethod(method); setShowRvcPicker(false); setStep('ppe'); }} style={{ width: '100%', padding: '14px', marginBottom: '8px', backgroundColor: '#f0f4ff', color: '#1B3A6B', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                  {method}
                </button>
              );
            })}
            <button onClick={() => setShowRvcPicker(false)} style={{ width: '100%', padding: '12px', backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
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
          <button style={{ backgroundColor: '#14B8A6', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' }} onClick={() => setShowRvcPicker(true)}>
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
          <button style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%', marginBottom: '10px' }} onClick={() => { setPpeConfirmed(true); setStep(isHvac ? 'hvac' : 'photos'); }}>
            {lang === 'es' ? 'Confirmo - Tengo mi EPP' : 'Confirmed - I have my PPE'}
          </button>
          <button style={{ backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', width: '100%' }} onClick={() => setStep('rvc')}>
            {lang === 'es' ? 'Volver' : 'Back'}
          </button>
        </div>
      )}
{step === 'hvac' && (() => {
        const PT_TABLES = {
          'R-22':   { low: [[0,-41],[10,-30],[20,-21],[30,-13],[40,-6],[50,0],[60,6],[70,11],[80,16],[90,20],[100,24],[110,28],[120,32],[130,35],[140,38],[150,41],[160,44],[170,47],[180,49],[190,52],[200,54],[220,59],[240,63],[260,67],[280,71],[300,75]], high: [[150,41],[175,47],[200,54],[225,59],[250,64],[275,68],[300,73],[325,77],[350,81],[375,85],[400,88],[425,91],[450,94],[475,97],[500,100]] },
          'R-410A': { low: [[0,-64],[10,-55],[20,-47],[30,-40],[40,-34],[50,-28],[60,-23],[70,-18],[80,-13],[90,-9],[100,-5],[110,-1],[120,3],[130,6],[140,9],[150,12],[160,15],[170,18],[180,21],[190,23],[200,26],[220,30],[240,35],[260,39],[280,43],[300,46]], high: [[200,26],[225,31],[250,36],[275,40],[300,44],[325,48],[350,52],[375,55],[400,58],[425,61],[450,64],[475,67],[500,70]] },
          'R-32':   { low: [[0,-52],[10,-44],[20,-37],[30,-30],[40,-24],[50,-18],[60,-13],[70,-8],[80,-4],[90,0],[100,4],[110,7],[120,11],[130,14],[140,17],[150,20],[160,23],[170,26],[180,28],[190,31],[200,33],[220,38],[240,42],[260,46],[280,50],[300,54]], high: [[200,33],[225,38],[250,42],[275,46],[300,50],[325,54],[350,58],[375,61],[400,64],[425,67],[450,70],[475,73],[500,76]] },
          'R-454B': { low: [[0,-55],[10,-47],[20,-39],[30,-32],[40,-26],[50,-20],[60,-15],[70,-10],[80,-5],[90,-1],[100,3],[110,7],[120,10],[130,13],[140,16],[150,19],[160,22],[170,25],[180,27],[190,30],[200,32],[220,37],[240,41],[260,45],[280,49],[300,53]], high: [[200,32],[225,37],[250,41],[275,46],[300,50],[325,54],[350,57],[375,61],[400,64],[425,67],[450,70],[475,73],[500,76]] },
          'R-407C': { low: [[0,-45],[10,-35],[20,-26],[30,-18],[40,-11],[50,-4],[60,2],[70,7],[80,13],[90,17],[100,22],[110,26],[120,30],[130,34],[140,37],[150,41],[160,44],[170,47],[180,50],[190,52],[200,55],[220,60],[240,64],[260,68],[280,72],[300,76]], high: [[150,41],[175,47],[200,54],[225,59],[250,64],[275,69],[300,73],[325,77],[350,81],[375,85],[400,89],[425,92],[450,95],[475,98],[500,101]] },
          'R-134a': { low: [[0,-22],[5,-19],[10,-16],[15,-13],[20,-10],[25,-7],[30,-5],[35,-2],[40,0],[45,2],[50,5],[55,7],[60,9],[65,11],[70,13],[75,15],[80,17],[85,19],[90,21],[95,22],[100,24],[110,28],[120,31],[130,34],[140,37],[150,40]], high: [[100,24],[110,28],[120,31],[130,34],[140,37],[150,40],[160,43],[170,46],[175,47],[180,49],[190,51],[200,54],[210,56],[220,58],[230,60],[240,62],[250,64]] },
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
        return (
          <div style={{ padding: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
              <div style={{ fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>🌡️</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px', textAlign: 'center' }}>{lang === 'es' ? 'Diagnostico HVAC' : 'HVAC Diagnostics'}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginBottom: '20px' }}>{lang === 'es' ? 'Conecta manometros y registra lecturas' : 'Connect gauges and record all readings'}</div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'es' ? 'Tipo de refrigerante' : 'Refrigerant Type'} <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={refrigerantType} onChange={e => setRefrigerantType(e.target.value)} style={{ width: '100%', padding: '12px', border: `2px solid ${refrigerantType ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '15px', fontWeight: '700', color: '#1B3A6B', backgroundColor: 'white', boxSizing: 'border-box' }}>
                  <option value="">{lang === 'es' ? 'Seleccionar refrigerante...' : 'Select refrigerant...'}</option>
                  {['R-22', 'R-410A', 'R-32', 'R-454B', 'R-407C', 'R-134a'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'es' ? 'Tipo de valvula' : 'Expansion Valve'}</label>
                <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                  {['TXV', 'Fixed Orifice'].map(v => (
                    <button key={v} onClick={() => setExpansionValve(v)} style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', backgroundColor: expansionValve === v ? '#1B3A6B' : '#f9fafb', color: expansionValve === v ? 'white' : '#6b7280', fontWeight: '700', fontSize: '13px' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{lang === 'es' ? 'TXV es el predeterminado — cambia si la unidad usa orificio fijo' : 'TXV is default — change if unit uses fixed orifice'}</div>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔵 {lang === 'es' ? 'Lado bajo (succion)' : 'Low Side (Suction)'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Presion (PSI)' : 'Pressure (PSI)'}</label>
                    <input type="number" value={hvacLow} onChange={e => setHvacLow(e.target.value)} placeholder="e.g. 70" style={{ width: '100%', padding: '12px', border: `2px solid ${hvacLow ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
                    {hvacLow && lowSatTemp !== null && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>Sat. Temp: {lowSatTemp.toFixed(1)}°F</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Temp linea succion (°F)' : 'Suction Line Temp (°F)'}</label>
                    <input type="number" value={suctionTemp} onChange={e => setSuctionTemp(e.target.value)} placeholder="e.g. 55" style={{ width: '100%', padding: '12px', border: `2px solid ${suctionTemp ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
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
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔴 {lang === 'es' ? 'Lado alto (descarga)' : 'High Side (Discharge)'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Presion (PSI)' : 'Pressure (PSI)'}</label>
                    <input type="number" value={hvacHigh} onChange={e => setHvacHigh(e.target.value)} placeholder="e.g. 250" style={{ width: '100%', padding: '12px', border: `2px solid ${hvacHigh ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
                    {hvacHigh && highSatTemp !== null && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>Sat. Temp: {highSatTemp.toFixed(1)}°F</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>{lang === 'es' ? 'Temp linea liquido (°F)' : 'Liquid Line Temp (°F)'}</label>
                    <input type="number" value={liquidTemp} onChange={e => setLiquidTemp(e.target.value)} placeholder="e.g. 95" style={{ width: '100%', padding: '12px', border: `2px solid ${liquidTemp ? '#14B8A6' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '18px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', color: '#1B3A6B' }} />
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
            <button style={{ backgroundColor: canContinue ? '#1B3A6B' : '#d1d5db', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: canContinue ? 'pointer' : 'not-allowed', width: '100%', marginBottom: '10px' }} disabled={!canContinue} onClick={() => setStep('photos')}>
              {canContinue ? (lang === 'es' ? 'Continuar a fotos →' : 'Continue to Photos →') : (lang === 'es' ? 'Completa todas las lecturas' : 'Complete all readings')}
            </button>
            <button style={{ backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', width: '100%' }} onClick={() => setStep('ppe')}>
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

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span>{t.gpsActive}</span>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
      </div>
    </div>
  );
}

function DiagnosisScreen({ job, tech, token, checkInData, onComplete, onBack, lang }) {
  const t = STRINGS[lang];
  const [mode, setMode] = useState('completed');
  const [system, setSystem] = useState('');
  const [category, setCategory] = useState('');
  const [cause, setCause] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [parts, setParts] = useState([]);
  const [newPart, setNewPart] = useState({ name: '', qty: 1, cost: '' });
  const [timeOnSite, setTimeOnSite] = useState('');
  const [listening, setListening] = useState(false);
  const [deferralReason, setDeferralReason] = useState('');
  const [deferralNotes, setDeferralNotes] = useState('');
  const [deferralNextSteps, setDeferralNextSteps] = useState('');
  const [deferListening, setDeferListening] = useState(false);
  const checkInTime = useRef(Date.now());
  const recognition = useRef(null);
  const deferRecognition = useRef(null);

  useEffect(() => {
    const iv = setInterval(() => {
      const mins = Math.floor((Date.now() - checkInTime.current) / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setTimeOnSite(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }, 30000);
    setTimeOnSite('0m');
    return () => clearInterval(iv);
  }, []);

  const systems = Object.keys(ROOT_CAUSE_TREE);
  const categories = system ? Object.keys(ROOT_CAUSE_TREE[system]) : [];
  const causes = system && category ? ROOT_CAUSE_TREE[system][category] : [];

  const handleSystemChange = (val) => { setSystem(val); setCategory(''); setCause(''); };
  const handleCategoryChange = (val) => { setCategory(val); setCause(''); };

  const addPart = () => {
    if (!newPart.name.trim()) return;
    setParts(prev => [...prev, { ...newPart, id: Date.now() }]);
    setNewPart({ name: '', qty: 1, cost: '' });
  };
  const removePart = (id) => setParts(prev => prev.filter(p => p.id !== id));

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
    r.onresult = (e) => { const transcript = Array.from(e.results).map(r => r[0].transcript).join(' '); setDeferralNotes(prev => prev ? prev + ' ' + transcript : transcript); };
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
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{job.property_name}</div>
      </div>
      <div style={{ backgroundColor: '#0f1f3d', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{t.timeOnSite}</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#14B8A6' }}>{timeOnSite}</span>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Completed / Deferred Toggle ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'es' ? 'Estado del trabajo' : 'Job Outcome'}
          </div>
          <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <button onClick={() => setMode('completed')} style={{ flex: 1, padding: '12px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'completed' ? '#1B3A6B' : '#f9fafb', color: mode === 'completed' ? 'white' : '#6b7280', fontWeight: '700', fontSize: '14px', transition: 'all 0.15s' }}>
              ✅ {lang === 'es' ? 'Completado' : 'Completed'}
            </button>
            <button onClick={() => setMode('deferred')} style={{ flex: 1, padding: '12px', border: 'none', borderLeft: '1px solid #e5e7eb', cursor: 'pointer', backgroundColor: mode === 'deferred' ? '#dc2626' : '#f9fafb', color: mode === 'deferred' ? 'white' : '#6b7280', fontWeight: '700', fontSize: '14px', transition: 'all 0.15s' }}>
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
              <select style={selectStyle} value={deferralReason} onChange={e => setDeferralReason(e.target.value)}>
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
                  value={deferralNotes} onChange={e => setDeferralNotes(e.target.value)} />
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
                value={deferralNextSteps} onChange={e => setDeferralNextSteps(e.target.value)} />
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
                <select style={{ ...selectStyle, backgroundColor: category ? 'white' : '#f9fafb', color: category ? '#374151' : '#9ca3af' }} value={cause} onChange={e => setCause(e.target.value)} disabled={!category}>
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
                <textarea style={{ width: '100%', padding: '12px', paddingRight: '52px', border: `1px solid ${diagnosisOk ? '#22c55e' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', height: '120px', resize: 'none', lineHeight: '1.5' }} placeholder={t.diagnosisPlaceholder} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                <button onClick={() => {
                  if (listening) { recognition.current && recognition.current.stop(); setListening(false); return; }
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SR) { alert('Speech recognition not supported on this browser.'); return; }
                  const r = new SR();
                  r.lang = lang === 'es' ? 'es-MX' : 'en-US';
                  r.continuous = true;
                  r.interimResults = false;
                  r.onresult = (e) => { const transcript = Array.from(e.results).map(r => r[0].transcript).join(' '); setDiagnosis(prev => prev ? prev + ' ' + transcript : transcript); };
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
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{p.name}</div>
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
                <input style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} placeholder={t.partName} value={newPart.name} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))} />
                <input style={{ width: '52px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box' }} type="number" min="1" placeholder={t.qty} value={newPart.qty} onChange={e => setNewPart(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} />
                <input style={{ width: '72px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} type="number" min="0" step="0.01" placeholder="$cost" value={newPart.cost} onChange={e => setNewPart(p => ({ ...p, cost: e.target.value }))} />
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

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span>{t.gpsActive}</span>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
      </div>
    </div>
  );
}
function Gate1Screen({ job, tech, token, checkInData, diagData, onComplete, onBack, lang, ppeConfirmed }) {
  const t = STRINGS[lang];
  const isDeferred = diagData?.mode === 'deferred';
  const autoChecked = {
    0: (checkInData?.photos?.length || 0) >= 2,
    1: false,
    2: isDeferred ? true : !!diagData?.system && !!diagData?.category && !!diagData?.cause,
    3: isDeferred ? true : (diagData?.diagnosis?.trim().length || 0) >= 100,
    4: true,
    5: !!checkInData?.rvc,
    6: true,
    10: !!ppeConfirmed,
  };
  const checklistItems = lang === 'es' ? [
    'Fotos previas subidas (min 2)',
    'Fotos posteriores subidas (min 2)',
    'Causa raiz seleccionada',
    'Diagnostico escrito (100+ caracteres)',
    'Registro de piezas completo o marcado como ninguno',
    'RVC verificado con el residente',
    'Reparacion Cerrada o Aplazamiento Anotado',
    'Area de trabajo limpia y restaurada',
    'No se identificaron nuevos problemas',
    'Residente informado del resultado',
    'EPP adecuado usado durante el trabajo',
    'GPS check-out registrado',
    'Articulo de capital marcado si aplica',
    'Firma digital obtenida',
  ] : [
    'Before photos uploaded (min 2)',
    'After photos uploaded (min 2)',
    'Root cause selected from enum',
    'Written diagnosis (100+ chars)',
    'Parts log complete or marked none',
    'RVC verified with resident',
    'Repair Closed or Deferral Noted',
    'Work area cleaned and restored',
    'No new issues identified',
    'Resident informed of outcome',
    'Proper PPE was used throughout job',
    'GPS check-out recorded',
    'Capital item flagged if applicable',
    'Digital signature obtained',
  ];

  const [checked, setChecked] = useState(() => checklistItems.map((_, i) => autoChecked[i] || false));
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [sigMode, setSigMode] = useState(false);
  const [signed, setSigned] = useState(false);
  const [gpsOut, setGpsOut] = useState(null);
  const [gpsOutLoading, setGpsOutLoading] = useState(false);
  const [contactMethod, setContactMethod] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const afterPhotoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const toggleCheck = (i) => {
    if (i === 13 && !signed) return;
    if (i === 9) return;
    if (i === 11) return;
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const handleAfterPhoto = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAfterPhotos(prev => {
          const updated = [...prev, { url: ev.target.result, time: new Date().toLocaleTimeString() }];
          if (updated.length >= 2) setChecked(prev2 => prev2.map((v, i) => i === 1 ? true : v));
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const startDraw = (e) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1B3A6B';
    ctx.lineCap = 'round';
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clearSig = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    setChecked(prev => prev.map((v, i) => i === 13 ? false : v));
  };
  const acceptSig = () => {
    const canvas = canvasRef.current;
    const blank = document.createElement('canvas');
    blank.width = canvas.width; blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) return;
    setSigned(true);
    setSigMode(false);
    setChecked(prev => prev.map((v, i) => i === 13 ? true : v));
  };

  const requiredCount = diagData?.mode === 'deferred' ? 12 : 14;
  const totalChecked = checked.filter(Boolean).length;
  const allChecked = totalChecked >= requiredCount;
  const progress = totalChecked / requiredCount;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '100px' }}>
      <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '8px' }}>{t.back}</button>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>Gate 1 - {lang === 'es' ? 'Pre-cierre' : 'Pre-close'}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{lang === 'es' ? 'Certificacion de 14 puntos requerida' : '14-point certification required'}</div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{lang === 'es' ? 'Lista de verificacion' : 'Completion checklist'}</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: allChecked ? '#22c55e' : '#1B3A6B' }}>{totalChecked} / {requiredCount} {allChecked ? '✓' : ''}</span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: allChecked ? '#22c55e' : '#14B8A6', borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '16px' }}>
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
          {checklistItems.map((item, i) => (
            <div key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderBottom: i < 13 ? '1px solid #f3f4f6' : 'none', cursor: i === 13 && !signed ? 'default' : 'pointer', opacity: i === 13 && !signed ? 0.5 : 1 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${checked[i] ? '#14B8A6' : '#d1d5db'}`, backgroundColor: checked[i] ? '#14B8A6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {checked[i] && <span style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: checked[i] ? '#6b7280' : '#374151', textDecoration: checked[i] ? 'line-through' : 'none' }}>{item}</div>
                {i === 0 && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{lang === 'es' ? `${checkInData?.photos?.length || 0} foto(s) capturada(s)` : `${checkInData?.photos?.length || 0} captured`}</div>}
                {i === 1 && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{lang === 'es' ? `${afterPhotos.length} foto(s) posterior(es)` : `${afterPhotos.length} after photos`}</div>}
                {i === 9 && contactMethod && <div style={{ fontSize: '11px', color: '#14B8A6', marginTop: '2px', fontWeight: '600' }}>via {contactMethod}</div>}
              </div>
              {i === 0 && autoChecked[0] && <span style={{ fontSize: '10px', color: '#14B8A6', fontWeight: '700' }}>AUTO</span>}
              {i === 2 && autoChecked[2] && <span style={{ fontSize: '10px', color: '#14B8A6', fontWeight: '700' }}>AUTO</span>}
              {i === 3 && autoChecked[3] && <span style={{ fontSize: '10px', color: '#14B8A6', fontWeight: '700' }}>AUTO</span>}
              {i === 5 && autoChecked[5] && <span style={{ fontSize: '10px', color: '#14B8A6', fontWeight: '700' }}>AUTO</span>}
              {i === 9 && !contactMethod && <button onClick={(e) => { e.stopPropagation(); setShowContactPicker(true); }} style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>Log →</button>}
              {i === 9 && contactMethod && <span style={{ fontSize: '10px', color: '#14B8A6', fontWeight: '700' }}>✓</span>}
              {i === 11 && !gpsOut && (
                <button onClick={(e) => { e.stopPropagation(); setGpsOutLoading(true); navigator.geolocation.getCurrentPosition((position) => { const coords = { lat: position.coords.latitude, lng: position.coords.longitude }; setGpsOut(coords); setGpsOutLoading(false); setChecked(prev => prev.map((v, idx) => idx === 11 ? true : v)); }, (err) => { console.error('GPS error:', err); setGpsOutLoading(false); }, { enableHighAccuracy: true, timeout: 10000 }); }} style={{ backgroundColor: '#1B3A6B', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                  {gpsOutLoading ? '...' : '📍 Check Out'}
                </button>
              )}
              {i === 11 && gpsOut && <span style={{ fontSize: '10px', color: '#14B8A6', fontWeight: '700' }}>✓ GPS</span>}
            </div>
          ))}
        </div>

        {showContactPicker && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxWidth: '430px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>How was the resident notified?</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Select the contact method used</div>
              {['Knocked on door', 'Phone call', 'Text message', 'Left door hanger', 'No contact - left note'].map(method => (
                <button key={method} onClick={() => { setContactMethod(method); setShowContactPicker(false); setChecked(prev => prev.map((v, idx) => idx === 9 ? true : v)); }} style={{ width: '100%', padding: '14px', marginBottom: '8px', backgroundColor: '#f0f4ff', color: '#1B3A6B', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                  {method}
                </button>
              ))}
              <button onClick={() => setShowContactPicker(false)} style={{ width: '100%', padding: '12px', backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>📷 {lang === 'es' ? 'Fotos posteriores' : 'After Photos'} {isDeferred && <span style={{ fontSize: '11px', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', marginLeft: '6px' }}>{lang === 'es' ? 'Opcional' : 'Optional'}</span>}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>{isDeferred ? (lang === 'es' ? 'Opcional para trabajos aplazados' : 'Optional for deferred jobs') : (lang === 'es' ? 'Se requieren minimo 2 fotos posteriores' : 'Minimum 2 after photos required')}</div>
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

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B3A6B', marginBottom: '4px' }}>✍️ {lang === 'es' ? 'Firma digital' : 'Digital Signature'} {isDeferred && <span style={{ fontSize: '11px', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', marginLeft: '6px' }}>{lang === 'es' ? 'Opcional' : 'Optional'}</span>}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>{isDeferred ? (lang === 'es' ? 'Opcional para trabajos aplazados' : 'Optional for deferred jobs') : (lang === 'es' ? 'El residente debe firmar para confirmar la finalizacion' : 'Resident must sign to confirm completion')}</div>
          {!sigMode && !signed && (
            <button onClick={() => setSigMode(true)} style={{ width: '100%', padding: '14px', backgroundColor: '#f0f4ff', color: '#1B3A6B', border: '2px dashed #1B3A6B', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              {lang === 'es' ? 'Toca para firmar →' : 'Tap to sign →'}
            </button>
          )}
          {sigMode && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{lang === 'es' ? 'Firma en el recuadro de abajo' : 'Sign in the box below'}</div>
              <canvas ref={canvasRef} width={340} height={150} style={{ border: '2px solid #1B3A6B', borderRadius: '10px', width: '100%', touchAction: 'none', backgroundColor: '#f9fafb', display: 'block' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={clearSig} style={{ flex: 1, padding: '10px', backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>{lang === 'es' ? 'Borrar' : 'Clear'}</button>
                <button onClick={acceptSig} style={{ flex: 2, padding: '10px', backgroundColor: '#1B3A6B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>{lang === 'es' ? 'Aceptar firma' : 'Accept Signature'}</button>
              </div>
            </div>
          )}
          {signed && !sigMode && (
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '14px', border: '2px solid #22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#15803d', fontWeight: '700', fontSize: '14px' }}>✅ {lang === 'es' ? 'Firma obtenida' : 'Signature obtained'}</div>
                <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>{new Date().toLocaleTimeString()}</div>
              </div>
              <button onClick={() => { setSigMode(true); setSigned(false); setChecked(prev => prev.map((v, i) => i === 13 ? false : v)); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '12px' }}>{lang === 'es' ? 'Repetir' : 'Redo'}</button>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: allChecked ? '#1B3A6B' : '#f9fafb', borderRadius: '12px', padding: '16px', border: `1px solid ${allChecked ? 'transparent' : '#e5e7eb'}` }}>
          {!allChecked && (
            <div style={{ marginBottom: '12px', padding: '10px 14px', backgroundColor: '#fef9ec', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <div style={{ fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
                {requiredCount - totalChecked} {lang === 'es' ? 'elementos restantes - no se puede enviar aun' : 'items remaining - cannot submit yet'}
              </div>
            </div>
          )}
          <button style={{ width: '100%', padding: '14px', backgroundColor: allChecked ? '#14B8A6' : '#d1d5db', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: allChecked ? 'pointer' : 'not-allowed' }} disabled={!allChecked}
            onClick={() => onComplete({ afterPhotos, signed, totalChecked })}>
            {allChecked ? (lang === 'es' ? '✅ Enviar Gate 1' : '✅ Submit Gate 1') : (lang === 'es' ? 'Completa todos los elementos' : 'Complete all items')}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', backgroundColor: '#1B3A6B', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span>{t.gpsActive}</span>
        <span style={{ backgroundColor: '#14B8A6', padding: '3px 10px', borderRadius: '10px', fontWeight: '600' }}>{t.onDuty}</span>
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
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{val}</span>
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
            {(() => { const scheduled = ['assigned','in_progress','submitted','completed']; const prefix = scheduled.includes(job.status) ? 'SO' : 'SR'; const num = job.ticket_number ? String(job.ticket_number).padStart(4,'0') : '????'; return `${prefix}-${num}`; })()}
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
        <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{t.location}</div>
          <div style={{ fontWeight: '600' }}>{t.unit} {job.unit_number || ''}</div>
          <div style={{ color: '#374151' }}>{job.property_name}</div>
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>{t.currentStatus}</div>
        <span style={{ backgroundColor: statusColor[job.status] || '#6b7280', color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>
          {lang === 'es' ? ({ in_progress: 'En progreso', pending: 'Pendiente', assigned: 'Asignado', completed: 'Completado' }[job.status] || job.status) : job.status?.replace('_', ' ')}
        </span>
      </div>
      {(job.status === 'in_progress' || job.status === 'assigned') && (
        <div style={{ backgroundColor: '#1B3A6B', borderRadius: '10px', padding: '20px', margin: '0 12px 12px', boxShadow: '0 2px 8px rgba(27,58,107,0.25)' }}>
          <div style={{ color: 'white', fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{t.readyToStart}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '16px' }}>{t.checkInRequired}</div>
          <button style={{ backgroundColor: '#14B8A6', color: 'white', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%' }} onClick={onCheckIn}>{t.beginCheckIn}</button>
          {job.status === 'in_progress' && <button style={{ backgroundColor: '#7c3aed', color: 'white', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%', marginTop: '10px' }} onClick={() => onVideoCall(job)}>📹 Start Video Call</button>}
        </div>
      )}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', margin: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>{t.addNote}</div>
        <textarea style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', height: '80px', resize: 'none' }} placeholder={t.notesPlaceholder} value={note} onChange={e => setNote(e.target.value)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {job.status === 'assigned' && (
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
export default function App() {
  const [tech, setTech] = useState(() => { const s = localStorage.getItem('techUser'); return s ? JSON.parse(s) : null; });
  const [token, setToken] = useState(() => localStorage.getItem('techToken') || '');
  const [selectedJob, setSelectedJob] = useState(null);
  const [screen, setScreen] = useState('list');
  const [checkInData, setCheckInData] = useState(null);
  const [diagData, setDiagData] = useState(null);
  const [gate1Data, setGate1Data] = useState(null);
  const [videoToken, setVideoToken] = useState(null);
const [videoRoom, setVideoRoom] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('techLang') || 'en');

  const handleLangChange = (l) => { setLang(l); localStorage.setItem('techLang', l); };
  const handleLogin = (techData) => { setTech(techData); setToken(localStorage.getItem('techToken')); };
  const handleLogout = () => { localStorage.clear(); setTech(null); setToken(''); setScreen('list'); };
  const handleStatusUpdate = () => {};
  const handleCheckInComplete = (data) => { setCheckInData(data); setScreen('diagnosis'); };
  const handleDiagnosisComplete = (data) => { setDiagData(data); setScreen('gate1'); };
  const handleGate1Complete = async (data) => {
    setGate1Data(data);
    try {
      if (data.afterPhotos && data.afterPhotos.length > 0) {
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
    } catch (err) {
      console.error('Gate 1 submit error:', err);
    }
    setScreen('submitted');
  };
  const handleSubmittedNext = () => {
    setScreen('list');
    setSelectedJob(null);
    setCheckInData(null);
    setDiagData(null);
    setGate1Data(null);
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

  if (!tech) return <LoginScreen onLogin={handleLogin} lang={lang} setLang={handleLangChange} />;

  const getTitle = () => {
    if (screen === 'checkin') return t.checkIn;
    if (screen === 'diagnosis') return t.diagnosis;
    if (screen === 'detail') return t.jobDetail;
    return `${t.hi}, ${tech.first_name} 👋`;
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {screen !== 'checkin' && screen !== 'diagnosis' && (
        <div style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{getTitle()}</h1>
            {screen === 'list' && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{t.certZone}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LangToggle lang={lang} setLang={handleLangChange} />
            <div style={{ width: '34px', height: '34px', backgroundColor: '#14B8A6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
              {tech.first_name?.[0]}{tech.last_name?.[0]}
            </div>
            <button style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} onClick={handleLogout}>{t.logOut}</button>
          </div>
        </div>
      )}
      {screen === 'list' && <JobList tech={tech} token={token} onSelectJob={(job) => { setSelectedJob(job); setScreen('detail'); }} lang={lang} />}
      {screen === 'detail' && selectedJob && <JobDetail job={selectedJob} token={token} tech={tech} onBack={() => setScreen('list')} onStatusUpdate={handleStatusUpdate} onCheckIn={() => setScreen('checkin')} onVideoCall={handleVideoCall} lang={lang} />}
      {screen === 'checkin' && selectedJob && <CheckInScreen job={selectedJob} tech={tech} token={token} onComplete={handleCheckInComplete} onBack={() => setScreen('detail')} lang={lang} />}
      {screen === 'diagnosis' && selectedJob && <DiagnosisScreen job={selectedJob} tech={tech} token={token} checkInData={checkInData} onComplete={handleDiagnosisComplete} onBack={() => setScreen('checkin')} lang={lang} />}
      {screen === 'gate1' && selectedJob && <Gate1Screen job={selectedJob} tech={tech} token={token} checkInData={checkInData} diagData={diagData} onComplete={handleGate1Complete} onBack={() => setScreen('diagnosis')} lang={lang} ppeConfirmed={checkInData?.ppeConfirmed} />}
      {screen === 'submitted' && selectedJob && <SubmittedScreen job={selectedJob} tech={tech} token={token} checkInData={checkInData} diagData={diagData} gate1Data={gate1Data} onNext={handleSubmittedNext} lang={lang} />}
      {screen === 'video' && selectedJob && videoToken && <VideoCallScreen job={selectedJob} token={videoToken} roomName={videoRoom} onBack={() => setScreen('detail')} lang={lang} />}
    </div>
  );
}
