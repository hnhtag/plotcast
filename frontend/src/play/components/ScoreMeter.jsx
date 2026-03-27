import React from 'react';
import styles from '../play.module.css';

export default function ScoreMeter({ current, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
  return (
    <div className={styles.scoreMeter}>
      <div className={styles.scoreMeterTrack}>
        <div className={styles.scoreMeterFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.scoreMeterLabel}>
        <span>{current} pts</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}
