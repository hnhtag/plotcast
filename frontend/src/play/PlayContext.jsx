import React, { createContext, useCallback, useContext, useState } from 'react';
import { nanoid } from '../utils/nanoid.js';

const PlayContext = createContext(null);

function getOrCreateUserId() {
  let id = localStorage.getItem('plotcast_userId');
  if (!id) {
    id = nanoid(16);
    localStorage.setItem('plotcast_userId', id);
  }
  return id;
}

export function PlayProvider({ children }) {
  const [userId] = useState(getOrCreateUserId);
  const [nickname, setNickname] = useState(() => localStorage.getItem('plotcast_nickname') || '');
  const [eventId, setEventId] = useState(() => localStorage.getItem('plotcast_eventId') || '');
  const [totalScore, setTotalScore] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [lastVoteResult, setLastVoteResult] = useState(null); // { keyTakeaway, scoreAwarded }
  const [currentStoryIndex, setCurrentStoryIndex] = useState(-1);

  function joinSuccess(newEventId, newNickname) {
    localStorage.setItem('plotcast_eventId', newEventId);
    localStorage.setItem('plotcast_nickname', newNickname);
    setEventId(newEventId);
    setNickname(newNickname);
  }

  function voteSuccess(result) {
    setTotalScore(result.totalScore);
    setHasVoted(true);
    setLastVoteResult({ keyTakeaway: result.keyTakeaway, scoreAwarded: result.scoreAwarded });
  }

  const onStoryChanged = useCallback((newIndex) => {
    if (newIndex !== currentStoryIndex) {
      setCurrentStoryIndex(newIndex);
      setHasVoted(false);
      setLastVoteResult(null);
    }
  }, [currentStoryIndex]);

  return (
    <PlayContext.Provider value={{
      userId, nickname, eventId, totalScore, hasVoted, lastVoteResult, currentStoryIndex,
      setTotalScore, joinSuccess, voteSuccess, onStoryChanged, setHasVoted,
    }}>
      {children}
    </PlayContext.Provider>
  );
}

export function usePlay() {
  return useContext(PlayContext);
}
