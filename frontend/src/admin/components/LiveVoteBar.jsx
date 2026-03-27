import React from 'react';
import styles from '../admin.module.css';

export default function LiveVoteBar({ optionText, count, totalVotes }) {
  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  return (
    <div className={styles.voteBarRow}>
      <div className={styles.voteBarLabel}>{optionText}</div>
      <div className={styles.voteBarTrack}>
        <div className={styles.voteBarFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.voteBarStat}>{count} <span>({pct}%)</span></div>
    </div>
  );
}
