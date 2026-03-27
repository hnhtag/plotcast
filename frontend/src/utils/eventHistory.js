const KEY = 'plotcast_admin_history';

export function getEventHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveEventToHistory(eventId, title) {
  const history = getEventHistory().filter(e => e.eventId !== eventId);
  history.unshift({ eventId, title: title || '', lastAccess: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(history.slice(0, 8)));
}

export function updateEventTitle(eventId, title) {
  const history = getEventHistory();
  const entry = history.find(e => e.eventId === eventId);
  if (entry && title && entry.title !== title) {
    entry.title = title;
    localStorage.setItem(KEY, JSON.stringify(history));
  }
}

export function removeEventFromHistory(eventId) {
  const history = getEventHistory().filter(e => e.eventId !== eventId);
  localStorage.setItem(KEY, JSON.stringify(history));
}
