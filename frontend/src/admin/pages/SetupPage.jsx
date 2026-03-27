import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminCreateEvent } from '../../services/api.js';
import { saveEventToHistory } from '../../utils/eventHistory.js';
import styles from '../admin.module.css';

export default function SetupPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminCreateEvent({ title });
      const { eventId } = res.data;
      saveEventToHistory(eventId, title);
      navigate('/admin/events');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <button className={styles.btnGhost} style={{ marginBottom: '1rem' }} onClick={() => navigate('/admin/events')}>
          ← Back to Events
        </button>
        <h1 className={styles.heading}>Create New Event</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>Event Title</label>
          <input
            className={styles.input}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Leadership Workshop 2026"
            autoFocus
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
