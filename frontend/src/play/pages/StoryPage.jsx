import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEventState, submitVote } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import OptionCard from '../components/OptionCard.jsx';
import ScoreMeter from '../components/ScoreMeter.jsx';
import styles from '../play.module.css';

export default function StoryPage() {
  const { userId, eventId, totalScore, hasVoted, currentStoryIndex, onStoryChanged, voteSuccess } = usePlay();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null); // { groupId, optionId }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchState(); }, []);

  async function fetchState() {
    try {
      const res = await getEventState(eventId);
      setState(res.data);
      onStoryChanged(res.data.currentStoryIndex);
      if (res.data.status === 'finished') navigate('/play/finished');
    } catch {}
  }

  const poll = useCallback(async () => {
    try {
      const res = await getEventState(eventId);
      const { status, currentStoryIndex: newIdx } = res.data;
      if (status === 'finished') { navigate('/play/finished'); return; }
      if (newIdx !== currentStoryIndex) {
        onStoryChanged(newIdx);
        setState(res.data);
        setSelectedOption(null);
        setError('');
      }
    } catch {}
  }, [eventId, currentStoryIndex, navigate, onStoryChanged]);

  useInterval(poll, !hasVoted ? 2000 : null);

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
      navigate('/play/takeaway');
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

      {(story.optionGroups || []).map(group => (
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
      ))}

      {error && <p className={styles.error}>{error}</p>}

      {!hasVoted && (
        <button
          className={styles.btnPrimary}
          disabled={!selectedOption || submitting}
          onClick={handleVote}
        >
          {submitting ? 'Submitting…' : 'Submit Answer'}
        </button>
      )}
    </div>
  );
}
