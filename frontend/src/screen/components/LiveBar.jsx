import React from 'react';
import styles from '../screen.module.css';

export default function LiveBar({ optionText, count, totalVotes, color }) {
  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  return (
    <div className={styles.liveBarRow}>
      <div className={styles.liveBarLabel}>{optionText}</div>
      <div className={styles.liveBarTrack}>
        <div
          className={styles.liveBarFill}
          style={{ width: `${pct}%`, background: color || 'linear-gradient(90deg, #7c6fff, #a78bfa)' }}
        />
      </div>
      <div className={styles.liveBarStat}>
        <span className={styles.liveBarCount}>{count}</span>
        <span className={styles.liveBarPct}>{pct}%</span>
      </div>
    </div>
  );
}
