const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { adminAuth } = require('./shared/auth');

// Public handlers
const join = require('./user/join');
const getState = require('./event/state');
const getPlayerState = require('./event/playerState');
const vote = require('./vote/vote');
const leaderboard = require('./leaderboard/leaderboard');

// Admin — no auth
const createEvent = require('./admin/createEvent');
const createMockEventSetup = require('./admin/createMockEventSetup');
const login = require('./admin/login');
const listEvents = require('./admin/listEvents');

// Admin — auth required
const changePassword = require('./admin/changePassword');
const createStory = require('./admin/createStory');
const updateStory = require('./admin/updateStory');
const deleteStory = require('./admin/deleteStory');
const createCharacter = require('./admin/createCharacter');
const updateCharacter = require('./admin/updateCharacter');
const deleteCharacter = require('./admin/deleteCharacter');
const getEvent = require('./admin/getEvent');
const updateEventTitle = require('./admin/updateEventTitle');
const start = require('./admin/start');
const next = require('./admin/next');
const prev = require('./admin/prev');
const finish = require('./admin/finish');
const openAnswers = require('./admin/openAnswers');
const closeAnswers = require('./admin/closeAnswers');
const reopenEvent = require('./admin/reopenEvent');
const duplicateEventSetup = require('./admin/duplicateEventSetup');
const deleteEvent = require('./admin/deleteEvent');
const updateLiveSettings = require('./admin/updateLiveSettings');

const app = new Hono();

// CORS for all routes (handles OPTIONS preflight too)
app.use('*', cors());

// Global error handler — catches thrown { statusCode, message } objects
app.onError((err, c) => {
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  return c.json({ error: err.message || 'Internal server error' }, status);
});

// ── Public ──────────────────────────────────────────────────────────────────
app.post('/join', join);
app.get('/event/:eventId/state', getState);
app.get('/event/:eventId/player/:userId/state', getPlayerState);
app.post('/vote', vote);
app.get('/event/:eventId/leaderboard', leaderboard);

// ── Admin — no auth ─────────────────────────────────────────────────────────
app.post('/admin/create-event', createEvent);
app.post('/admin/create-mock-event-setup', adminAuth, createMockEventSetup);
app.post('/admin/login', login);

// ── Admin — auth required ───────────────────────────────────────────────────
app.post('/admin/change-password', adminAuth, changePassword);
app.post('/admin/create-story', adminAuth, createStory);
app.put('/admin/update-story', adminAuth, updateStory);
app.delete('/admin/delete-story', adminAuth, deleteStory);
app.post('/admin/create-character', adminAuth, createCharacter);
app.put('/admin/update-character', adminAuth, updateCharacter);
app.delete('/admin/delete-character', adminAuth, deleteCharacter);
app.get('/admin/events', adminAuth, listEvents);
app.get('/admin/event/:eventId', adminAuth, getEvent);
app.put('/admin/update-event-title', adminAuth, updateEventTitle);
app.post('/admin/start', adminAuth, start);
app.post('/admin/next', adminAuth, next);
app.post('/admin/prev', adminAuth, prev);
app.post('/admin/finish', adminAuth, finish);
app.post('/admin/open-answers', adminAuth, openAnswers);
app.post('/admin/close-answers', adminAuth, closeAnswers);
app.put('/admin/update-live-settings', adminAuth, updateLiveSettings);
app.post('/admin/reopen', adminAuth, reopenEvent);
app.post('/admin/duplicate-event-setup', adminAuth, duplicateEventSetup);
app.delete('/admin/delete-event', adminAuth, deleteEvent);

module.exports = app;
