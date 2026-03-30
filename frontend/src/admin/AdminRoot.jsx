import React from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { AdminProvider, useAdmin } from './AdminContext.jsx';
import SetupPage from './pages/SetupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import ManageStoriesPage from './pages/ManageStoriesPage.jsx';
import StoryEditorPage from './pages/StoryEditorPage.jsx';
import CharactersPage from './pages/CharactersPage.jsx';
import LiveControlPage from './pages/LiveControlPage.jsx';
import AnswerFlowSettingsPage from './pages/AnswerFlowSettingsPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import AppFooter from '../components/AppFooter.jsx';
import styles from './admin.module.css';

function AdminNav() {
  const { token, eventId, logout } = useAdmin();
  const navigate = useNavigate();
  if (!token) return null;

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <nav className={styles.topNav}>
      <div className={styles.topNavLeft}>
        <Link className={styles.topNavLink} to="/admin/events">Events</Link>
        {eventId && <Link className={styles.topNavLink} to="/admin/live">Live Control</Link>}
        {eventId && <Link className={styles.topNavLink} to="/admin/report">Report</Link>}
        {eventId && <Link className={styles.topNavLink} to="/admin/stories">Stories</Link>}
        {eventId && <Link className={styles.topNavLink} to="/admin/characters">Characters</Link>}
      </div>
      <div className={styles.topNavRight}>
        {eventId && <span className={styles.topNavEventId}>{eventId}</span>}
        <button className={styles.btnLogout} onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

function AdminRoutes() {
  const { token, eventId } = useAdmin();

  if (!token) {
    return (
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <AdminNav />
      <Routes>
        <Route path="login" element={<Navigate to="/admin/events" replace />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="stories" element={eventId ? <ManageStoriesPage /> : <Navigate to="/admin/events" replace />} />
        <Route path="stories/new" element={eventId ? <StoryEditorPage /> : <Navigate to="/admin/events" replace />} />
        <Route path="stories/edit/:storyIndex" element={eventId ? <StoryEditorPage /> : <Navigate to="/admin/events" replace />} />
        <Route path="characters" element={eventId ? <CharactersPage /> : <Navigate to="/admin/events" replace />} />
        <Route path="live" element={eventId ? <LiveControlPage /> : <Navigate to="/admin/events" replace />} />
        <Route path="answer-flow" element={eventId ? <AnswerFlowSettingsPage /> : <Navigate to="/admin/events" replace />} />
        <Route path="report" element={eventId ? <ReportPage /> : <Navigate to="/admin/events" replace />} />
        <Route path="*" element={<Navigate to="/admin/events" replace />} />
      </Routes>
      <AppFooter />
    </>
  );
}

export default function AdminRoot() {
  return (
    <AdminProvider>
      <AdminRoutes />
    </AdminProvider>
  );
}
