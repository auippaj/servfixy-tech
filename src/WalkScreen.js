import React, { useState, useRef } from 'react';

const NAVY = '#1B3A6B';
const TEAL = '#14B8A6';
const SUPABASE_URL = 'https://xqovkhwdhgwbbgkpsqcs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxb3ZraHdkaGd3YmJna3BzcWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTUxODksImV4cCI6MjA5NDY5MTE4OX0.yFhRJrrS-AzIX2xGDX7hNWei6zlB2IcsCxU4Uuf5f94';

const ITEMS = {
  entry:      ['Walls & Paint', 'Ceiling', 'Flooring', 'Light Fixture', 'Doors & Hardware', 'Closet'],
  kitchen:    ['Walls & Paint', 'Ceiling', 'Flooring', 'Cabinets', 'Countertops', 'Sink & Faucet', 'Appliances', 'Light Fixture'],
  living:     ['Walls & Paint', 'Ceiling', 'Flooring', 'Light Fixture', 'Outlets & Switches', 'Blinds / Window Covering'],
  dining:     ['Walls & Paint', 'Ceiling', 'Flooring', 'Light Fixture'],
  bathroom:   ['Walls & Paint', 'Ceiling', 'Flooring', 'Tub / Shower', 'Toilet', 'Vanity & Sink', 'Mirror', 'Light Fixture', 'Exhaust Fan'],
  bathroom_1: ['Walls & Paint', 'Ceiling', 'Flooring', 'Tub / Shower', 'Toilet', 'Vanity & Sink', 'Mirror', 'Light Fixture', 'Exhaust Fan'],
  bathroom_2: ['Walls & Paint', 'Ceiling', 'Flooring', 'Tub / Shower', 'Toilet', 'Vanity & Sink', 'Mirror', 'Light Fixture', 'Exhaust Fan'],
  bedroom:    ['Walls & Paint', 'Ceiling', 'Flooring', 'Light Fixture', 'Closet', 'Outlets & Switches', 'Blinds / Window Covering', 'Doors & Hardware'],
  bedroom_1:  ['Walls & Paint', 'Ceiling', 'Flooring', 'Light Fixture', 'Closet', 'Outlets & Switches', 'Blinds / Window Covering', 'Doors & Hardware'],
  bedroom_2:  ['Walls & Paint', 'Ceiling', 'Flooring', 'Light Fixture', 'Closet', 'Outlets & Switches', 'Blinds / Window Covering', 'Doors & Hardware'],
  patio:      ['Flooring / Surface', 'Railing', 'Door & Screen', 'Ceiling / Soffit'],
};

const CONDITION_LABELS = {
  1: { label: 'Normal Wear', color: '#22c55e', bg: '#0d2d1a' },
  2: { label: 'Damage', color: '#f87171', bg: '#3a1e1e' },
  3: { label: 'Deferred / Capital', color: '#fb923c', bg: '#3a2a1e' },
};

async function uploadPhoto(file, turnId, roomKey, item) {
  const ext = file.name.split('.').pop();
  const path = `${turnId}/${roomKey}/${item.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/turn-photos/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed');
  return `${SUPABASE_URL}/storage/v1/object/public/turn-photos/${path}`;
}

function RoomScreen({ room, roomIndex, totalRooms, onNext, onBack, isLast, turnId }) {
  const items = ITEMS[room.key] || ['General Condition'];
  const [assessments, setAssessments] = useState(
    items.reduce((acc, item) => ({ ...acc, [item]: { condition: null, notes: '', photo: null, uploading: false, listening: false } }), {})
  );
  const fileRefs = useRef({});

  const setCondition = (item, val) =>
    setAssessments(a => ({ ...a, [item]: { ...a[item], condition: val } }));
  const setNotes = (item, val) =>
    setAssessments(a => ({ ...a, [item]: { ...a[item], notes: val } }));
  const setField = (item, field, val) =>
    setAssessments(a => ({ ...a, [item]: { ...a[item], [field]: val } }));

  const handlePhoto = async (item, file) => {
    if (!file) return;
    setField(item, 'uploading', true);
    try {
      const url = await uploadPhoto(file, turnId, room.key, item);
      setField(item, 'photo', url);
    } catch (e) {
      alert('Photo upload failed. Try again.');
    }
    setField(item, 'uploading', false);
  };

  const handleMic = (item) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Voice input not supported on this device.'); return; }
    const a = assessments[item];
    if (a.listening) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setField(item, 'listening', true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setNotes(item, a.notes ? a.notes + ' ' + transcript : transcript);
      setField(item, 'listening', false);
    };
    rec.onerror = () => setField(item, 'listening', false);
    rec.onend = () => setField(item, 'listening', false);
    rec.start();
  };

  const allAnswered = items.every(i => assessments[i].condition !== null);
  const progress = ((roomIndex) / totalRooms) * 100;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: NAVY, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: 0 }}>&#8592;</button>
          <div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>{room.label}</div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>Room {roomIndex + 1} of {totalRooms}</div>
          </div>
        </div>
        <div style={{ backgroundColor: '#0d2040', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: TEAL, height: '100%', width: `${progress}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {items.map(item => {
          const a = assessments[item];
          return (
            <div key={item} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ color: '#1e293b', fontWeight: '600', fontSize: '14px', marginBottom: '10px' }}>{item}</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: a.condition ? '10px' : 0 }}>
                {[1, 2, 3].map(c => {
                  const cl = CONDITION_LABELS[c];
                  const selected = a.condition === c;
                  return (
                    <button key={c} onClick={() => setCondition(item, c)}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: selected ? `2px solid ${cl.color}` : '2px solid #e2e8f0', backgroundColor: selected ? cl.bg : 'white', color: selected ? cl.color : '#64748b', fontSize: '11px', fontWeight: selected ? 'bold' : 'normal', cursor: 'pointer', lineHeight: '1.3' }}>
                      {c === 1 ? '✓' : c === 2 ? '!' : '⚠'} {cl.label}
                    </button>
                  );
                })}
              </div>

              {a.condition === 2 && (
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    ref={el => fileRefs.current[item] = el}
                    onChange={e => handlePhoto(item, e.target.files[0])}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {(a.photos || []).map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <img src={url} alt="damage" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #f87171' }} />
                        <button onClick={() => setAssessments(as => ({ ...as, [item]: { ...as[item], photos: as[item].photos.filter((_, i) => i !== idx) } }))}
                          style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => fileRefs.current[item]?.click()} disabled={a.uploading}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px dashed #f87171', backgroundColor: '#3a1e1e', color: '#f87171', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    {a.uploading ? 'Uploading...' : `📷 ${(a.photos || []).length > 0 ? 'Add Another Photo' : 'Add Photo'}`}
                  </button>
                </div>
              )}

              {a.condition && a.condition !== 1 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <textarea
                    placeholder="Notes (optional)"
                    value={a.notes}
                    onChange={e => setNotes(item, e.target.value)}
                    rows={2}
                    style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px', fontSize: '13px', color: '#1e293b', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <button onClick={() => handleMic(item)}
                    style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', backgroundColor: a.listening ? '#ef4444' : '#f1f5f9', color: a.listening ? 'white' : '#64748b', fontSize: '18px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🎤
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '16px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0' }}>
        {!allAnswered && (
          <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>
            Rate all items to continue
          </div>
        )}
        <button onClick={() => onNext(assessments)} disabled={!allAnswered}
          style={{ width: '100%', backgroundColor: allAnswered ? TEAL : '#e2e8f0', color: allAnswered ? 'white' : '#94a3b8', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: 'bold', cursor: allAnswered ? 'pointer' : 'not-allowed' }}>
          {isLast ? 'Review Summary' : 'Next Room'}
        </button>
      </div>
    </div>
  );
}

function SummaryScreen({ rooms, allAssessments, unitNumber, walkType, onSubmit, onBack, submitting }) {
  const flags = [];
  rooms.forEach(room => {
    const a = allAssessments[room.key] || {};
    Object.entries(a).forEach(([item, val]) => {
      if (val.condition && val.condition > 1) {
        flags.push({ room: room.label, item, condition: val.condition, notes: val.notes, photos: val.photos || [] });
      }
    });
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: NAVY, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: 0 }}>&#8592;</button>
        <div>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Walk Summary</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Unit {unitNumber} — {walkType === 'notice' ? 'Notice Walk' : 'Move-Out Walk'}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: '16px', textAlign: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                {rooms.reduce((n, r) => n + Object.values(allAssessments[r.key] || {}).filter(v => v.condition === 1).length, 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Normal Wear</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>
                {rooms.reduce((n, r) => n + Object.values(allAssessments[r.key] || {}).filter(v => v.condition === 2).length, 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Damage</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fb923c' }}>
                {rooms.reduce((n, r) => n + Object.values(allAssessments[r.key] || {}).filter(v => v.condition === 3).length, 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Deferred</div>
            </div>
          </div>
        </div>

        {flags.length === 0 && (
          <div style={{ backgroundColor: '#0d2d1a', borderRadius: '10px', padding: '16px', textAlign: 'center', color: '#22c55e', fontWeight: 'bold' }}>
            No damage or deferred items found
          </div>
        )}

        {flags.map((f, i) => {
          const cl = CONDITION_LABELS[f.condition];
          return (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px', marginBottom: '8px', borderLeft: `4px solid ${cl.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{f.room} — {f.item}</div>
                <span style={{ backgroundColor: cl.bg, color: cl.color, fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '8px' }}>{cl.label}</span>
              </div>
              {(f.photos || []).map((url, i) => <img key={i} src={url} alt="damage" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', marginRight: '6px', marginBottom: '6px' }} />)}
              {f.notes && <div style={{ fontSize: '12px', color: '#64748b' }}>{f.notes}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '16px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0' }}>
        <button onClick={onSubmit} disabled={submitting}
          style={{ width: '100%', backgroundColor: TEAL, color: 'white', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Submitting...' : 'Submit Walk'}
        </button>
      </div>
    </div>
  );
}

export default function WalkScreen({ turn, walkType, tech, token, onBack, onComplete }) {
  const rooms = turn?.floorplan_rooms || [];
  const [roomIndex, setRoomIndex] = useState(0);
  const [allAssessments, setAllAssessments] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRoomNext = (assessments) => {
    setAllAssessments(prev => ({ ...prev, [rooms[roomIndex].key]: assessments }));
    if (roomIndex + 1 >= rooms.length) {
      setShowSummary(true);
    } else {
      setRoomIndex(i => i + 1);
    }
  };

  const handleBack = () => {
    if (showSummary) { setShowSummary(false); return; }
    if (roomIndex === 0) { onBack(); return; }
    setRoomIndex(i => i - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const assessmentRows = [];
      rooms.forEach(room => {
        const a = allAssessments[room.key] || {};
        Object.entries(a).forEach(([item, val]) => {
          if (val.condition) {
            assessmentRows.push({
              room_key: room.key,
              room_label: room.label,
              item_label: item,
              condition_class: val.condition,
              notes: val.notes || null,
              photo_urls: val.photos || [],
            });
          }
        });
      });
      if (onComplete) onComplete({ walkType, assessmentRows });
    } catch (err) {
      setSubmitting(false);
    }
  };

  if (rooms.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#9888;</div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No room list found</div>
          <div style={{ fontSize: '13px' }}>This unit has no floorplan assigned.</div>
          <button onClick={onBack} style={{ marginTop: '20px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer' }}>Go Back</button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return <SummaryScreen rooms={rooms} allAssessments={allAssessments} unitNumber={turn?.unit_number} walkType={walkType} onSubmit={handleSubmit} onBack={handleBack} submitting={submitting} />;
  }

  if (roomIndex >= rooms.length) return null;
  return <RoomScreen key={roomIndex} room={rooms[roomIndex]} roomIndex={roomIndex} totalRooms={rooms.length} onNext={handleRoomNext} onBack={handleBack} isLast={roomIndex === rooms.length - 1} turnId={turn?.id} />;
}