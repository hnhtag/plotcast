import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext.jsx';
import { adminListEvents, adminReopen, adminDuplicateEventSetup, adminDeleteEvent, adminUpdateEventTitle } from '../../services/api.js';
import { removeEventFromHistory, updateEventTitle as saveEventTitleToHistory } from '../../utils/eventHistory.js';
import styles from '../admin.module.css';

const PAGE_SIZE = 10;

export default function EventsPage() {
  const { token, eventId: activeEventId, selectEvent, clearSelectedEvent, setEventData } = useAdmin();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionEventId, setActionEventId] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const res = await adminListEvents({ limit: PAGE_SIZE });
      setEvents(res.data.events);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchEvents();
  }, [token, fetchEvents]);

  async function handleLoadMore() {
    setSuccess('');
    setLoadingMore(true);
    try {
      const res = await adminListEvents({ limit: PAGE_SIZE, cursor: nextCursor });
      setEvents(prev => [...prev, ...res.data.events]);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load more events');
    } finally {
      setLoadingMore(false);
    }
  }

  function handleManage(id) {
    selectEvent(id);
    navigate('/admin/live');
  }

  function askPassword(actionLabel) {
    const password = window.prompt(`Enter admin password to ${actionLabel}:`);
    if (password === null) return null;
    if (!password.trim()) {
      setError('Password is required');
      return null;
    }
    return password;
  }

  async function handleReopen(eventId) {
    setActionEventId(eventId);
    setSuccess('');
    setError('');
    try {
      await adminReopen(eventId);
      setEvents(prev => prev.map(e => (
        e.eventId === eventId ? { ...e, status: 'waiting' } : e
      )));
      setSuccess(`Event ${eventId} moved to waiting`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change event status');
    } finally {
      setActionEventId('');
    }
  }

  async function handleDuplicate(eventId) {
    const password = askPassword('duplicate this event setup');
    if (!password) return;

    setActionEventId(eventId);
    setSuccess('');
    setError('');
    try {
      const res = await adminDuplicateEventSetup({ eventId, password });
      await fetchEvents();
      setSuccess(`Duplicated setup to new event ${res.data.eventId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to duplicate event setup');
    } finally {
      setActionEventId('');
    }
  }

  async function handleRename(eventId, currentTitle = '') {
    const title = window.prompt('Enter new event title:', currentTitle || '');
    if (title === null) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }

    setActionEventId(eventId);
    setSuccess('');
    setError('');
    try {
      await adminUpdateEventTitle({ eventId, title: trimmed });
      setEvents(prev => prev.map(e => (
        e.eventId === eventId ? { ...e, title: trimmed } : e
      )));

      saveEventTitleToHistory(eventId, trimmed);

      if (activeEventId === eventId) {
        setEventData(prev => {
          if (!prev?.meta) return prev;
          return { ...prev, meta: { ...prev.meta, title: trimmed } };
        });
      }

      setSuccess(`Renamed event ${eventId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rename event');
    } finally {
      setActionEventId('');
    }
  }

  async function handleDelete(eventId) {
    if (!window.confirm(`Delete event ${eventId}? This removes setup, users, and answers permanently.`)) {
      return;
    }

    const password = askPassword('delete this event');
    if (!password) return;

    setActionEventId(eventId);
    setSuccess('');
    setError('');
    try {
      await adminDeleteEvent({ eventId, password });
      removeEventFromHistory(eventId);
      setEvents(prev => prev.filter(e => e.eventId !== eventId));
      if (activeEventId === eventId) clearSelectedEvent();
      setSuccess(`Deleted event ${eventId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete event');
    } finally {
      setActionEventId('');
    }
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
      {success && <p className={styles.success}>{success}</p>}

      {!loading && !error && events.length === 0 && (
        <div className={styles.emptyState}>
          <p>No events yet. Create your first event to get started.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/admin/setup')}>Create Event</button>
        </div>
      )}

      {events.length > 0 && (
        <>
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
                      disabled={actionEventId === e.eventId}
                    >
                      Manage →
                    </button>
                    {e.status === 'finished' && (
                      <button
                        className={styles.btnSecondary}
                        onClick={() => handleReopen(e.eventId)}
                        disabled={actionEventId === e.eventId}
                      >
                        Move to Waiting
                      </button>
                    )}
                    <button
                      className={styles.btnSecondary}
                      onClick={() => handleRename(e.eventId, e.title || '')}
                      disabled={actionEventId === e.eventId}
                    >
                      Rename
                    </button>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => handleDuplicate(e.eventId)}
                      disabled={actionEventId === e.eventId}
                    >
                      Duplicate Setup
                    </button>
                    <button
                      className={styles.btnDanger}
                      onClick={() => handleDelete(e.eventId)}
                      disabled={actionEventId === e.eventId}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {nextCursor && (
            <div className={styles.loadMoreRow}>
              <button className={styles.btnSecondary} onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
