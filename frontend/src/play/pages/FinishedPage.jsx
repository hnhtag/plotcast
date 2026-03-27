import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../../services/api.js';
import { usePlay } from '../PlayContext.jsx';
import CharacterReveal from '../components/CharacterReveal.jsx';
import ScoreMeter from '../components/ScoreMeter.jsx';
import styles from '../play.module.css';

export default function FinishedPage() {
  const { eventId, userId, totalScore, nickname } = usePlay();
  const [character, setCharacter] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    try {
      const res = await getLeaderboard(eventId);
      const { leaderboard } = res.data;
      // Find my entry by matching nickname + score (backend doesn't expose userId)
      const myEntry = leaderboard.find(e => e.totalScore === totalScore && e.nickname === nickname);
      if (myEntry) {
        setCharacter(myEntry.character);
        setMyRank(myEntry.rank);
      }
    } catch {}
    finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.finishedPage}>
        <div className={styles.logo}>PlotCast</div>
        <h1 className={styles.heading}>Event Complete!</h1>
        <p className={styles.nickname}>{nickname}</p>
        <ScoreMeter current={totalScore} max={150} />
        {myRank && <p className={styles.rankBadge}>#{myRank}</p>}
        {loading ? (
          <p className={styles.hint}>Loading your result…</p>
        ) : (
          <CharacterReveal character={character} />
        )}
      </div>
    </div>
  );
}
