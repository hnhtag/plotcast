import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/Prod';

const api = axios.create({ baseURL: BASE_URL });

// Attach admin JWT from sessionStorage on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on admin auth failures so stale tokens don't trap the UI.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const isAdminRequest = requestUrl.startsWith('/admin/');
    const isLoginRequest = requestUrl.startsWith('/admin/login');

    if (status === 401 && isAdminRequest && !isLoginRequest) {
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminEventId');

      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        window.location.replace('/admin/login');
      }
    }

    return Promise.reject(error);
  },
);

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminCreateEvent = (data) => api.post('/admin/create-event', data);
export const adminCreateMockEventSetup = () => api.post('/admin/create-mock-event-setup');
export const adminLogin = (data) => api.post('/admin/login', data);
export const adminChangePassword = (data) => api.post('/admin/change-password', data);
export const adminListEvents = ({ limit = 20, cursor } = {}) =>
  api.get('/admin/events', { params: { limit, ...(cursor && { cursor }) } });
export const adminGetEvent = (eventId) => api.get(`/admin/event/${eventId}`);
export const adminUpdateEventTitle = (data) => api.put('/admin/update-event-title', data);

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
export const adminOpenAnswers = (eventId) => api.post('/admin/open-answers', { eventId });
export const adminCloseAnswers = (eventId) => api.post('/admin/close-answers', { eventId });
export const adminUpdateLiveSettings = (data) => api.put('/admin/update-live-settings', data);
export const adminReopen = (eventId) => api.post('/admin/reopen', { eventId });
export const adminDuplicateEventSetup = (data) => api.post('/admin/duplicate-event-setup', data);
export const adminDeleteEvent = (data) => api.delete('/admin/delete-event', { data });

// ─── Public ───────────────────────────────────────────────────────────────────
export const joinEvent = (data) => api.post('/join', data);
export const getEventState = (eventId) => api.get(`/event/${eventId}/state`);
export const getPlayerState = (eventId, userId) => api.get(`/event/${eventId}/player/${userId}/state`);
export const submitVote = (data) => api.post('/vote', data);
export const getLeaderboard = (eventId) => api.get(`/event/${eventId}/leaderboard`);
