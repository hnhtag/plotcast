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
  const [role, setRole] = useState(() => localStorage.getItem('plotcast_role') || '');
  const [eventId, setEventId] = useState(() => localStorage.getItem('plotcast_eventId') || '');
  const [totalScore, setTotalScore] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [lastVoteResult, setLastVoteResult] = useState(null); // { keyTakeaway, scoreAwarded }
  const [currentStoryIndex, setCurrentStoryIndex] = useState(-1);

  function joinSuccess(newEventId, newNickname, newRole = '') {
    localStorage.setItem('plotcast_eventId', newEventId);
    localStorage.setItem('plotcast_nickname', newNickname);
    localStorage.setItem('plotcast_role', newRole);
    setEventId(newEventId);
    setNickname(newNickname);
    setRole(newRole);
  }

  function voteSuccess(result) {
    setTotalScore(result.totalScore);
    setHasVoted(true);
    setLastVoteResult({ keyTakeaway: result.keyTakeaway, scoreAwarded: result.scoreAwarded });
  }

  function restoreSession(session) {
    const safeEventId = session?.eventId || '';
    const safeNickname = session?.nickname || '';
    const safeRole = session?.role || '';

    if (safeEventId) localStorage.setItem('plotcast_eventId', safeEventId);
    if (safeNickname) localStorage.setItem('plotcast_nickname', safeNickname);
    localStorage.setItem('plotcast_role', safeRole);

    setEventId(safeEventId);
    setNickname(safeNickname);
    setRole(safeRole);
    setTotalScore(session?.totalScore || 0);
    setCurrentStoryIndex(
      Number.isInteger(session?.currentStoryIndex) ? session.currentStoryIndex : -1
    );
    setHasVoted(Boolean(session?.hasVotedCurrentStory));
    setLastVoteResult(null);
  }

  const onStoryChanged = useCallback((newIndex) => {
    if (newIndex !== currentStoryIndex) {
      setCurrentStoryIndex(newIndex);
      setLastVoteResult(null);
    }
  }, [currentStoryIndex]);

  return (
    <PlayContext.Provider value={{
      userId, nickname, role, eventId, totalScore, hasVoted, lastVoteResult, currentStoryIndex,
      setTotalScore, joinSuccess, voteSuccess, onStoryChanged, setHasVoted, restoreSession,
    }}>
      {children}
    </PlayContext.Provider>
  );
}

export function usePlay() {
  return useContext(PlayContext);
}
