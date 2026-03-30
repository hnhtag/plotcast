import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerState } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import CharacterReveal from '../components/CharacterReveal.jsx';
import ScoreMeter from '../components/ScoreMeter.jsx';
import styles from '../play.module.css';

export default function WaitNextPage() {
  const {
    eventId,
    userId,
    totalScore,
    nickname,
    currentStoryIndex,
    onStoryChanged,
    setHasVoted,
    setTotalScore,
  } = usePlay();
  const navigate = useNavigate();
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [motivation, setMotivation] = useState('Your story is still unfolding. Keep pushing forward.');

  const poll = useCallback(async () => {
    try {
      const res = await getPlayerState(eventId, userId);
      const {
        status,
        currentStoryIndex: newIdx,
        hasVotedCurrentStory,
        totalScore: newTotalScore,
        currentCharacter: newCharacter,
        motivation: newMotivation,
      } = res.data;

      setTotalScore(newTotalScore || 0);
      setHasVoted(Boolean(hasVotedCurrentStory));
      setCurrentCharacter(newCharacter || null);
      setMotivation(newMotivation || 'Your story is still unfolding. Keep pushing forward.');

      if (status === 'finished') { navigate('/play/finished'); return; }
      if (newIdx !== currentStoryIndex) {
        onStoryChanged(newIdx);
        navigate(hasVotedCurrentStory ? '/play/wait-next' : '/play/story');
      }
    } catch {}
  }, [eventId, userId, currentStoryIndex, navigate, onStoryChanged, setHasVoted, setTotalScore]);

  useInterval(poll, 3000);
  useEffect(() => { poll(); }, [poll]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.nickname}>{nickname}</p>
        <ScoreMeter current={totalScore} max={150} />
        <CharacterReveal character={currentCharacter} />
        <p className={styles.motivationText}>{motivation}</p>
        <div className={styles.waitingDot} />
        <h2 className={styles.heading}>Answer submitted!</h2>
        <p className={styles.hint}>Waiting for the host to advance to the next story…</p>
      </div>
    </div>
  );
}
