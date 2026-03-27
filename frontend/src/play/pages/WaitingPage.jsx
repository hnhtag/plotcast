import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventState } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import styles from '../play.module.css';

export default function WaitingPage() {
  const { eventId, nickname, onStoryChanged } = usePlay();
  const navigate = useNavigate();

  const poll = useCallback(async () => {
    try {
      const res = await getEventState(eventId);
      const { status, currentStoryIndex } = res.data;
      if (status === 'finished') {
        navigate('/play/finished');
      } else if (status === 'active' && currentStoryIndex >= 0) {
        onStoryChanged(currentStoryIndex);
        navigate('/play/story');
      }
    } catch {}
  }, [eventId, navigate]);

  useInterval(poll, 2000);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlotCast</div>
        <p className={styles.nickname}>Hi, {nickname}!</p>
        <div className={styles.waitingDot} />
        <h2 className={styles.heading}>Waiting for host to start…</h2>
        <p className={styles.hint}>Stay on this screen — you'll be taken to the story automatically.</p>
      </div>
    </div>
  );
}
