import React, { useEffect, useState } from 'react';
import HallEntry from '../components/HallEntry.jsx';
import styles from '../screen.module.css';

export default function HallOfFateScreen({ leaderboard, title }) {
  const [visible, setVisible] = useState([]);

  // Staggered entrance animation — reveal entries one by one
  useEffect(() => {
    if (!leaderboard.length) return;
    leaderboard.forEach((_, i) => {
      setTimeout(() => setVisible(v => [...v, i]), i * 200);
    });
  }, [leaderboard]);

  const top3 = leaderboard.filter(e => e.rank <= 3);
  const bottom3 = leaderboard.filter(e => e.isMasked);
  const middle = leaderboard.filter(e => !e.isMasked && e.rank > 3);

  return (
    <div className={styles.screen}>
      <div className={styles.screenHeader}>
        <span className={styles.screenLogo}>PlotCast</span>
        <span className={styles.voteCount}>{title}</span>
      </div>

      <h1 className={styles.hallTitle}>Hall of Fate</h1>

      {/* Top 3 */}
      <div className={styles.top3Grid}>
        {top3.map((entry, i) => (
          <div
            key={entry.rank}
            className={styles.top3Entry}
            style={{
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <div className={styles.top3Rank}>
              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
            </div>
            <div className={styles.top3Emoji}>{entry.character?.imageEmoji || '🎭'}</div>
            <div className={styles.top3Nickname}>{entry.nickname}</div>
            {entry.character && <div className={styles.top3CharName}>{entry.character.name}</div>}
            <div className={styles.top3Score}>{entry.totalScore} pts</div>
          </div>
        ))}
      </div>

      {/* Middle */}
      {middle.length > 0 && (
        <div className={styles.middleList}>
          {middle.map((entry, i) => (
            <HallEntry
              key={entry.rank}
              entry={entry}
              style={{
                opacity: visible.includes(top3.length + i) ? 1 : 0,
                transform: visible.includes(top3.length + i) ? 'translateX(0)' : 'translateX(-20px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Bottom 3 (censored) */}
      {bottom3.length > 0 && (
        <div className={styles.bottomSection}>
          <p className={styles.bottomLabel}>…and the brave souls who made it interesting:</p>
          <div className={styles.bottomList}>
            {bottom3.map((entry, i) => (
              <HallEntry
                key={entry.rank}
                entry={entry}
                style={{
                  opacity: visible.includes(top3.length + middle.length + i) ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
