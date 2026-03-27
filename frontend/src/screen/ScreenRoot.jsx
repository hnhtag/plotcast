import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getEventState, getLeaderboard } from '../services/api.js';
import { useInterval } from '../hooks/useInterval.js';
import WaitingScreen from './pages/WaitingScreen.jsx';
import StoryScreen from './pages/StoryScreen.jsx';
import HallOfFateScreen from './pages/HallOfFateScreen.jsx';

export default function ScreenRoot() {
  const { eventId } = useParams();
  const [liveState, setLiveState] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await getEventState(eventId);
      setLiveState(res.data);
      if (res.data.status === 'finished' && !leaderboard) {
        const lb = await getLeaderboard(eventId);
        setLeaderboard(lb.data);
      }
    } catch {}
  }, [eventId, leaderboard]);

  useEffect(() => { fetchState(); }, []);
  useInterval(fetchState, 1500);

  if (!liveState) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#666' }}>
        Loading…
      </div>
    );
  }

  if (liveState.status === 'finished') {
    return <HallOfFateScreen leaderboard={leaderboard?.leaderboard || []} title={liveState.title} />;
  }

  if (liveState.status === 'active' && liveState.story) {
    return <StoryScreen liveState={liveState} />;
  }

  return <WaitingScreen title={liveState.title} />;
}
