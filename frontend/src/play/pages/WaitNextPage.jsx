import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventState } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import ScoreMeter from '../components/ScoreMeter.jsx';
import styles from '../play.module.css';

export default function WaitNextPage() {
  const { eventId, totalScore, nickname, currentStoryIndex, onStoryChanged } = usePlay();
  const navigate = useNavigate();

  const poll = useCallback(async () => {
    try {
      const res = await getEventState(eventId);
      const { status, currentStoryIndex: newIdx } = res.data;
      if (status === 'finished') { navigate('/play/finished'); return; }
      if (newIdx !== currentStoryIndex) {
        onStoryChanged(newIdx);
        navigate('/play/story');
      }
    } catch {}
  }, [eventId, currentStoryIndex, navigate, onStoryChanged]);

  useInterval(poll, 2000);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.nickname}>{nickname}</p>
        <ScoreMeter current={totalScore} max={150} />
        <div className={styles.waitingDot} />
        <h2 className={styles.heading}>Answer submitted!</h2>
        <p className={styles.hint}>Waiting for the host to advance to the next story…</p>
      </div>
    </div>
  );
}
