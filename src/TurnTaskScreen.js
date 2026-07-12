import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://servfixy-production.up.railway.app/api';
const NAVY = '#1B3A6B';
const TEAL = '#14B8A6';

const STATUS_LABEL = {
  pending:     { label: 'Pending',     color: '#6b7280', bg: '#f3f4f6' },
  in_progress: { label: 'In Progress', color: '#f97316', bg: '#fff7ed' },
  complete:    { label: 'Complete',    color: '#15803d', bg: '#f0fdf4' },
  blocked:     { label: 'Blocked',     color: '#dc2626', bg: '#fef2f2' },
};

export default function TurnTaskScreen({ turn, token, tech, onBack, onDone }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // taskId being updated
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/turns/${turn.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data.tasks || []);
    } catch (e) {
      setError('Could not load tasks.');
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId, patch) => {
    setUpdating(taskId);
    setError('');
    try {
      const res = await axios.patch(
        `${API}/turns/${turn.id}/tasks/${taskId}`,
        patch,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
    } catch (e) {
      setError('Could not update task. Try again.');
    } finally {
      setUpdating(null);
    }
  };

  const allComplete = tasks.length > 0 && tasks.every(t => t.status === 'complete');
  const completeCount = tasks.filter(t => t.status === 'complete').length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ backgroundColor: NAVY, padding: '16px 20px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: 0, marginBottom: '10px' }}
        >
          ←
        </button>
        <div style={{ color: 'white', fontWeight: '700', fontSize: '17px' }}>
          Turn Tasks — Unit {turn.unit_number}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>
          {turn.floorplan_name || turn.floorplan_type || ''}
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                {completeCount} of {tasks.length} complete
              </span>
              {allComplete && (
                <span style={{ fontSize: '12px', color: TEAL, fontWeight: '700' }}>✓ All done</span>
              )}
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  backgroundColor: allComplete ? '#22c55e' : TEAL,
                  height: '100%',
                  width: `${tasks.length > 0 ? (completeCount / tasks.length) * 100 : 0}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px', fontSize: '14px' }}>
            Loading tasks...
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px', color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontWeight: '700', color: NAVY, marginBottom: '6px' }}>No tasks assigned</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>No tasks have been created for this turn yet.</div>
          </div>
        )}

        {!loading && tasks.map((task, idx) => {
          const s = STATUS_LABEL[task.status] || STATUS_LABEL.pending;
          const isUpdating = updating === task.id;

          return (
            <div
              key={task.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${s.color}`,
              }}
            >
              {/* Task header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1, marginRight: '10px' }}>
                  <div style={{ fontWeight: '700', color: NAVY, fontSize: '14px' }}>
                    {idx + 1}. {task.trade} — {task.component}
                  </div>
                  {task.room_key && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      📍 {task.room_key.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    backgroundColor: s.bg,
                    color: s.color,
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {s.label}
                </span>
              </div>

              {/* Scope */}
              {task.scope && (
                <div style={{ fontSize: '13px', color: '#374151', marginBottom: '10px', lineHeight: '1.4' }}>
                  {task.scope}
                </div>
              )}

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {task.responsibility_bucket && (
                  <span style={{ fontSize: '11px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '6px' }}>
                    {task.responsibility_bucket}
                  </span>
                )}
                {task.estimated_cost && (
                  <span style={{ fontSize: '11px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '6px' }}>
                    Est: ${parseFloat(task.estimated_cost).toFixed(2)}
                  </span>
                )}
                {task.started_at && (
                  <span style={{ fontSize: '11px', color: '#f97316' }}>
                    Started {new Date(task.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {task.completed_at && (
                  <span style={{ fontSize: '11px', color: '#15803d' }}>
                    ✓ Done {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              {task.status === 'pending' && (
                <button
                  onClick={() => updateTask(task.id, { status: 'in_progress' })}
                  disabled={isUpdating}
                  style={{
                    width: '100%',
                    backgroundColor: isUpdating ? '#e2e8f0' : NAVY,
                    color: isUpdating ? '#94a3b8' : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdating ? 'Starting...' : '▶ Start Task'}
                </button>
              )}

              {task.status === 'in_progress' && (
                <button
                  onClick={() => updateTask(task.id, { status: 'complete' })}
                  disabled={isUpdating}
                  style={{
                    width: '100%',
                    backgroundColor: isUpdating ? '#e2e8f0' : TEAL,
                    color: isUpdating ? '#94a3b8' : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdating ? 'Completing...' : '✓ Mark Complete'}
                </button>
              )}

              {task.status === 'complete' && (
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#15803d', fontWeight: '600', padding: '6px 0' }}>
                  ✅ Task complete
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0' }}>
        {allComplete ? (
          <button
            onClick={onDone}
            style={{
              width: '100%',
              backgroundColor: TEAL,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            ✓ All Done — Back to Turns
          </button>
        ) : (
          <button
            onClick={onDone}
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: '#6b7280',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Back to Turns
          </button>
        )}
      </div>
    </div>
  );
}
