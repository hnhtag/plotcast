import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminCreateEvent } from '../../services/api.js';
import { saveEventToHistory } from '../../utils/eventHistory.js';
import styles from '../admin.module.css';

export default function SetupPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [autoShowAnswers, setAutoShowAnswers] = useState(true);
  const [answerTimerSec, setAnswerTimerSec] = useState('0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const parsedTimer = Math.max(0, parseInt(answerTimerSec, 10) || 0);
      const res = await adminCreateEvent({ title, autoShowAnswers, answerTimerSec: parsedTimer });
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

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={autoShowAnswers}
              onChange={(e) => setAutoShowAnswers(e.target.checked)}
            />
            <span>Auto show answers when story starts (default flow)</span>
          </label>

          <label className={styles.label}>Answer Timer (seconds)</label>
          <input
            type="number"
            min={0}
            className={styles.input}
            value={answerTimerSec}
            onChange={(e) => setAnswerTimerSec(e.target.value)}
            placeholder="0 = no auto-close"
          />
          <p className={styles.hint}>If timer is set, answers auto-close when time ends.</p>

          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
