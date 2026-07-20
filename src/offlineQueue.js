// Offline queue manager — replays queued actions when connectivity returns
import axios from 'axios';
import { getAllQueued, dequeue } from './db';

const API = 'https://servfixy-production.up.railway.app/api';

let _replaying = false;

export async function replayQueue(token) {
  if (_replaying) return;
  _replaying = true;
  // Always pull freshest token from localStorage
  const authToken = token || localStorage.getItem('techToken');
  try {
    const items = await getAllQueued();
    if (!items || items.length === 0) return;
    console.log(`[offline] replaying ${items.length} queued action(s)`);
    for (const item of items) {
      try {
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
        if (item.method === 'POST') {
          await axios.post(`${API}${item.url}`, item.payload, { headers });
        } else if (item.method === 'PATCH') {
          await axios.patch(`${API}${item.url}`, item.payload, { headers });
        } else if (item.method === 'PUT') {
          await axios.put(`${API}${item.url}`, item.payload, { headers });
        }
        await dequeue(item.id);
        console.log(`[offline] replayed and cleared queue item ${item.id} (${item.type})`);
      } catch (err) {
        console.warn(`[offline] failed to replay item ${item.id}:`, err.message);
        // Leave it in queue — will retry next time online
      }
    }
  } finally {
    _replaying = false;
  }
}

export function listenForOnline(token) {
  window.addEventListener('online', () => {
    console.log('[offline] back online — replaying queue');
    replayQueue(token);
  });
}
