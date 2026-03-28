import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext.jsx';
import { adminListEvents } from '../../services/api.js';
import styles from '../admin.module.css';

export default function EventsPage() {
  const { token, eventId: activeEventId, selectEvent } = useAdmin();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    adminListEvents()
      .then(res => setEvents(res.data.events))
      .catch(err => setError(err.response?.data?.error || 'Failed to load events'))
      .finally(() => setLoading(false));
  }, [token]);

  function handleManage(id) {
    selectEvent(id);
    navigate('/admin/live');
  }

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <p>You need to log in to manage events.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/admin/login')}>Log In</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>Events</h1>
        <button className={styles.btnPrimary} onClick={() => navigate('/admin/setup')}>+ New Event</button>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && events.length === 0 && (
        <div className={styles.emptyState}>
          <p>No events yet. Create your first event to get started.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/admin/setup')}>Create Event</button>
        </div>
      )}

      {events.length > 0 && (
        <div className={styles.eventList}>
          {events.map(e => {
            const isActive = e.eventId === activeEventId;
            return (
              <div key={e.eventId} className={`${styles.eventCard} ${isActive ? styles.eventCardActive : ''}`}>
                <div className={styles.eventCardBody}>
                  <span className={styles.eventCardId}>{e.eventId}</span>
                  {e.title && <span className={styles.eventCardTitle}>{e.title}</span>}
                  {e.status && <span className={styles.badge}>{e.status}</span>}
                  {isActive && <span className={styles.activeBadge}>Selected</span>}
                </div>
                <div className={styles.eventCardActions}>
                  <button
                    className={isActive ? styles.btnPrimary : styles.btnSecondary}
                    onClick={() => handleManage(e.eventId)}
                  >
                    Manage →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
