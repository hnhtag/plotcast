import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/Prod';

const api = axios.create({ baseURL: BASE_URL });

// Attach admin JWT from sessionStorage on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminCreateEvent = (data) => api.post('/admin/create-event', data);
export const adminLogin = (data) => api.post('/admin/login', data);
export const adminChangePassword = (data) => api.post('/admin/change-password', data);
export const adminListEvents = () => api.get('/admin/events');
export const adminGetEvent = (eventId) => api.get(`/admin/event/${eventId}`);

export const adminCreateStory = (data) => api.post('/admin/create-story', data);
export const adminUpdateStory = (data) => api.put('/admin/update-story', data);
export const adminDeleteStory = (data) => api.delete('/admin/delete-story', { data });

export const adminCreateCharacter = (data) => api.post('/admin/create-character', data);
export const adminUpdateCharacter = (data) => api.put('/admin/update-character', data);
export const adminDeleteCharacter = (data) => api.delete('/admin/delete-character', { data });

export const adminStart = (eventId) => api.post('/admin/start', { eventId });
export const adminNext = (eventId) => api.post('/admin/next', { eventId });
export const adminPrev = (eventId) => api.post('/admin/prev', { eventId });
export const adminFinish = (eventId) => api.post('/admin/finish', { eventId });

// ─── Public ───────────────────────────────────────────────────────────────────
export const joinEvent = (data) => api.post('/join', data);
export const getEventState = (eventId) => api.get(`/event/${eventId}/state`);
export const submitVote = (data) => api.post('/vote', data);
export const getLeaderboard = (eventId) => api.get(`/event/${eventId}/leaderboard`);
