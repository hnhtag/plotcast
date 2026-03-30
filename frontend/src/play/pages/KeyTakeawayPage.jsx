import React, { useCallback, useEffect } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerState } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import ScoreMeter from '../components/ScoreMeter.jsx';
import styles from '../play.module.css';

export default function KeyTakeawayPage() {
  const {
    eventId,
    userId,
    totalScore,
    lastVoteResult,
    currentStoryIndex,
    onStoryChanged,
    setHasVoted,
    setTotalScore,
  } = usePlay();
  const navigate = useNavigate();
  const [motivation, setMotivation] = useState('The next story is another chance to shape your path.');

  useEffect(() => {
    const hasTakeaway = Boolean(lastVoteResult?.keyTakeaway && String(lastVoteResult.keyTakeaway).trim());
    if (!hasTakeaway) {
      navigate('/play/wait-next', { replace: true });
    }
  }, [lastVoteResult, navigate]);

  const poll = useCallback(async () => {
    try {
      const res = await getPlayerState(eventId, userId);
      const {
        status,
        currentStoryIndex: newIdx,
        hasVotedCurrentStory,
        totalScore: newTotalScore,
        motivation: newMotivation,
      } = res.data;

      setTotalScore(newTotalScore || 0);
      setHasVoted(Boolean(hasVotedCurrentStory));
      setMotivation(newMotivation || 'The next story is another chance to shape your path.');

      if (status === 'finished') { navigate('/play/finished'); return; }
      if (newIdx !== currentStoryIndex) {
        onStoryChanged(newIdx);
        navigate(hasVotedCurrentStory ? '/play/wait-next' : '/play/story');
      }
    } catch {}
  }, [eventId, userId, currentStoryIndex, navigate, onStoryChanged, setHasVoted, setTotalScore]);

  useInterval(poll, 3000);
  useEffect(() => { poll(); }, [poll]);

  const maxScore = 150; // rough

  return (
    <div className={styles.page}>
      <div className={styles.takeawayCard}>
        <div className={styles.scoreAward}>
          {lastVoteResult?.scoreAwarded ?? 0} pts
        </div>
        <ScoreMeter current={totalScore} max={maxScore} />
        <p className={styles.motivationText}>{motivation}</p>
        <h2 className={styles.heading}>Key Takeaway</h2>
        <p className={styles.takeawayText}>{lastVoteResult?.keyTakeaway || '—'}</p>
        <button className={styles.btnSecondary} onClick={() => navigate('/play/wait-next')}>
          Continue →
        </button>
      </div>
    </div>
  );
}
