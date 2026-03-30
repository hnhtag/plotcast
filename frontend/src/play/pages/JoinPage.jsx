import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinEvent, getPlayerState } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import styles from '../play.module.css';

export default function JoinPage() {
  const {
    userId,
    eventId: savedEventId,
    nickname: savedNickname,
    joinSuccess,
    restoreSession,
  } = usePlay();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryEventId = searchParams.get('event') || '';
  const [form, setForm] = useState({ eventId: queryEventId || savedEventId || '', nickname: savedNickname || '' });
  const [autoResuming, setAutoResuming] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function tryAutoResume() {
      const targetEventId = (queryEventId || savedEventId || '').trim();
      const targetNickname = (savedNickname || '').trim();

      if (!targetEventId || !targetNickname) {
        if (!cancelled) setAutoResuming(false);
        return;
      }

      try {
        const res = await getPlayerState(targetEventId, userId);
        const session = res.data;

        if (!session.joined) {
          if (!cancelled) setAutoResuming(false);
          return;
        }

        if (cancelled) return;

        restoreSession({
          eventId: targetEventId,
          nickname: session.nickname || targetNickname,
          totalScore: session.totalScore || 0,
          currentStoryIndex: session.currentStoryIndex,
          hasVotedCurrentStory: session.hasVotedCurrentStory,
        });

        if (session.status === 'finished') navigate('/play/finished', { replace: true });
        else if (session.status === 'active' && session.currentStoryIndex >= 0) {
          navigate(session.hasVotedCurrentStory ? '/play/wait-next' : '/play/story', { replace: true });
        } else {
          navigate('/play/waiting', { replace: true });
        }
      } catch {
        if (!cancelled) setAutoResuming(false);
      }
    }

    tryAutoResume();
    return () => { cancelled = true; };
  }, [queryEventId, savedEventId, savedNickname, userId, navigate, restoreSession]);

  async function routeFromSession(eventId, fallbackNickname = '') {
    const sessionRes = await getPlayerState(eventId, userId);
    const session = sessionRes.data;

    restoreSession({
      eventId,
      nickname: session.nickname || fallbackNickname,
      totalScore: session.totalScore || 0,
      currentStoryIndex: session.currentStoryIndex,
      hasVotedCurrentStory: session.hasVotedCurrentStory,
    });

    if (session.status === 'finished') navigate('/play/finished');
    else if (session.status === 'active' && session.currentStoryIndex >= 0) {
      navigate(session.hasVotedCurrentStory ? '/play/wait-next' : '/play/story');
    } else {
      navigate('/play/waiting');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await joinEvent({ eventId: form.eventId, nickname: form.nickname, userId });
      joinSuccess(form.eventId, form.nickname);
      await routeFromSession(form.eventId, form.nickname);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join event');
    } finally {
      setLoading(false);
    }
  }

  if (autoResuming) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>PlotCast</div>
          <h1 className={styles.heading}>Restoring your session…</h1>
          <p className={styles.hint}>Please wait while we reconnect you to the event.</p>
        </div>
      </div>
    );
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
