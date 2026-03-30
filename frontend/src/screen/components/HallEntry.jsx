import React from 'react';
import styles from '../screen.module.css';

const RANK_COLORS = ['#f0b429', '#c0c0d0', '#cd7f32'];

export default function HallEntry({ entry, style }) {
  const color = RANK_COLORS[entry.rank - 1] || '#666';
  const isTop = entry.rank <= 3;

  return (
    <div className={`${styles.hallEntry} ${isTop ? styles.hallEntryTop : styles.hallEntryBottom}`} style={style}>
      <div className={styles.hallRank} style={{ color }}>{entry.isMasked ? '?' : `#${entry.rank}`}</div>
      <div className={styles.hallEmoji}>{entry.character?.imageEmoji || '🎭'}</div>
      <div className={styles.hallInfo}>
        <div className={styles.hallNickname} style={{ color: isTop ? color : '#555' }}>
          {entry.nickname}
        </div>
        {isTop && entry.character && (
          <div className={styles.hallCharName}>{entry.character.name}</div>
        )}
      </div>
      <div className={styles.hallScore} style={{ color: isTop ? color : '#444' }}>
        {`${entry.totalScore} pts`}
      </div>
    </div>
  );
}
