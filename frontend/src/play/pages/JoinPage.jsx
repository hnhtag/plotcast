import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinEvent } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import styles from '../play.module.css';

export default function JoinPage() {
  const { userId, eventId: savedEventId, nickname: savedNickname, joinSuccess } = usePlay();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryEventId = searchParams.get('event') || '';
  const [form, setForm] = useState({ eventId: queryEventId || savedEventId || '', nickname: savedNickname || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await joinEvent({ eventId: form.eventId, nickname: form.nickname, userId });
      joinSuccess(form.eventId, form.nickname);
      const { status, currentStoryIndex } = res.data;
      if (status === 'finished') navigate('/play/finished');
      else if (status === 'active' && currentStoryIndex >= 0) navigate('/play/story');
      else navigate('/play/waiting');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlotCast</div>
        <h1 className={styles.heading}>Join Event</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {queryEventId ? (
            <div className={styles.eventIdLocked}>
              <span className={styles.eventIdLockedLabel}>Event</span>
              <span className={styles.eventIdLockedValue}>{form.eventId}</span>
            </div>
          ) : (
            <input
              className={styles.input}
              value={form.eventId}
              onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))}
              placeholder="Event ID"
              required
            />
          )}
          <input
            className={styles.input}
            value={form.nickname}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            placeholder="Your nickname"
            maxLength={30}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Joining…' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  );
}
