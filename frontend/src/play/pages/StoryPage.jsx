import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventState, getPlayerState, submitVote } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import AnswerPhaseChip from '../../components/AnswerPhaseChip.jsx';
import OptionCard from '../components/OptionCard.jsx';
import ScoreMeter from '../components/ScoreMeter.jsx';
import styles from '../play.module.css';

export default function StoryPage() {
  const {
    userId,
    eventId,
    totalScore,
    hasVoted,
    currentStoryIndex,
    onStoryChanged,
    voteSuccess,
    setHasVoted,
    setTotalScore,
  } = usePlay();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null); // { groupId, optionId }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timerLeftSec, setTimerLeftSec] = useState(null);

  useEffect(() => { fetchState(); }, []);

  async function fetchState() {
    try {
      const [eventRes, playerRes] = await Promise.all([
        getEventState(eventId),
        getPlayerState(eventId, userId),
      ]);

      const eventState = eventRes.data;
      const playerState = playerRes.data;

      setState(eventState);
      setTotalScore(playerState.totalScore || 0);
      setHasVoted(Boolean(playerState.hasVotedCurrentStory));
      onStoryChanged(playerState.currentStoryIndex);

      if (playerState.status === 'finished') {
        navigate('/play/finished');
        return;
      }

      if (playerState.hasVotedCurrentStory) {
        navigate('/play/wait-next');
      }
    } catch {}
  }

  const poll = useCallback(async () => {
    try {
      const [eventRes, playerRes] = await Promise.all([
        getEventState(eventId),
        getPlayerState(eventId, userId),
      ]);

      const eventState = eventRes.data;
      const playerState = playerRes.data;

      if (playerState.status === 'finished') { navigate('/play/finished'); return; }

      if (playerState.currentStoryIndex !== currentStoryIndex) {
        onStoryChanged(playerState.currentStoryIndex);
        setSelectedOption(null);
        setError('');
      }

      setState(eventState);
      setTotalScore(playerState.totalScore || 0);
      setHasVoted(Boolean(playerState.hasVotedCurrentStory));

      if (playerState.hasVotedCurrentStory) {
        navigate('/play/wait-next');
      }
    } catch {}
  }, [eventId, userId, currentStoryIndex, navigate, onStoryChanged, setHasVoted, setTotalScore]);

  useInterval(poll, !hasVoted ? 3000 : null);

  useInterval(() => {
    setTimerLeftSec((prev) => {
      if (!Number.isFinite(prev)) return prev;
      return Math.max(0, prev - 1);
    });
  }, Number.isFinite(timerLeftSec) && timerLeftSec > 0 ? 1000 : null);

  useEffect(() => {
    const remaining = state?.answerRemainingSec;
    if (Number.isFinite(remaining)) {
      setTimerLeftSec(Math.max(0, Math.floor(remaining)));
    } else {
      setTimerLeftSec(null);
    }
  }, [state?.answerRemainingSec]);

  async function handleVote() {
    if (!selectedOption || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await submitVote({
        eventId,
        userId,
        storyIndex: state.currentStoryIndex,
        groupId: selectedOption.groupId,
        selectedOptionId: selectedOption.optionId,
      });
      voteSuccess(res.data);
      const hasTakeaway = Boolean(res.data?.keyTakeaway && String(res.data.keyTakeaway).trim());
      navigate(hasTakeaway ? '/play/takeaway' : '/play/wait-next');
    } catch (err) {
      if (err.response?.status === 409) {
        // Already voted — mark as voted and show wait page
        navigate('/play/wait-next');
      } else {
        setError(err.response?.data?.error || 'Vote failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!state?.story) return <div className={styles.page}><p className={styles.hint}>Loading story…</p></div>;

  const story = state.story;
  const answersOpenByState = Boolean(state.answersOpen);
  const timedOpen = Number.isFinite(timerLeftSec) ? timerLeftSec > 0 : true;
  const answersOpen = answersOpenByState && timedOpen;
  const configuredTimerSec = Number.isFinite(state.answerTimerSec) ? state.answerTimerSec : 0;
  // Simple max score: just show current score since we may not have all stories loaded
  const maxScore = state.totalStories * 30; // rough estimate; fine for MVP

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.storyCounter}>{state.currentStoryIndex + 1} / {state.totalStories}</span>
        <ScoreMeter current={totalScore} max={maxScore} />
      </div>

      <h2 className={styles.storyTitle}>{story.title}</h2>
      <p className={styles.storyBody}>{story.story}</p>

      <div className={styles.answerStateRow}>
        <AnswerPhaseChip
          isOpen={answersOpenByState}
          remainingSec={timerLeftSec}
          totalSec={configuredTimerSec}
          variant="play"
        />
      </div>

      {answersOpen ? (story.optionGroups || []).map(group => (
        <div key={group.id} className={styles.optionGroup}>
          <p className={styles.groupLabel}>{group.title}</p>
          <div className={styles.optionGrid}>
            {(group.options || []).map(opt => (
              <OptionCard
                key={opt.id}
                option={opt}
                groupId={group.id}
                selected={selectedOption?.groupId === group.id && selectedOption?.optionId === opt.id}
                disabled={hasVoted || submitting}
                onSelect={(gId, oId) => setSelectedOption({ groupId: gId, optionId: oId })}
              />
            ))}
          </div>
        </div>
      )) : (
        <p className={styles.hint}>Host is presenting the story. Answers will appear when opened.</p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {!hasVoted && (
        <button
          className={styles.btnPrimary}
          disabled={!selectedOption || submitting || !answersOpen}
          onClick={handleVote}
        >
          {submitting ? 'Submitting…' : answersOpen ? 'Submit Answer' : 'Waiting for answer phase'}
        </button>
      )}
    </div>
  );
}
