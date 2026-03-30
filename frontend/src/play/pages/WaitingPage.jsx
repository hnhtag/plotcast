import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerState } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import styles from '../play.module.css';

export default function WaitingPage() {
  const { eventId, userId, nickname, onStoryChanged, setHasVoted, setTotalScore } = usePlay();
  const navigate = useNavigate();

  const poll = useCallback(async () => {
    try {
      const res = await getPlayerState(eventId, userId);
      const { status, currentStoryIndex, hasVotedCurrentStory, totalScore } = res.data;
      setTotalScore(totalScore || 0);
      setHasVoted(Boolean(hasVotedCurrentStory));

      if (status === 'finished') {
        navigate('/play/finished');
      } else if (status === 'active' && currentStoryIndex >= 0) {
        onStoryChanged(currentStoryIndex);
        navigate(hasVotedCurrentStory ? '/play/wait-next' : '/play/story');
      }
    } catch {}
  }, [eventId, userId, navigate, onStoryChanged, setHasVoted, setTotalScore]);

  useInterval(poll, 3000);

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
