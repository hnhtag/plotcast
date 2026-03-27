import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventState } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import ScoreMeter from '../components/ScoreMeter.jsx';
import styles from '../play.module.css';

export default function KeyTakeawayPage() {
  const { eventId, totalScore, lastVoteResult, currentStoryIndex, onStoryChanged } = usePlay();
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

  const maxScore = 150; // rough

  return (
    <div className={styles.page}>
      <div className={styles.takeawayCard}>
        <div className={styles.scoreAward}>
          +{lastVoteResult?.scoreAwarded ?? 0} pts
        </div>
        <ScoreMeter current={totalScore} max={maxScore} />
        <h2 className={styles.heading}>Key Takeaway</h2>
        <p className={styles.takeawayText}>{lastVoteResult?.keyTakeaway || '—'}</p>
        <button className={styles.btnSecondary} onClick={() => navigate('/play/wait-next')}>
          Continue →
        </button>
      </div>
    </div>
  );
}
