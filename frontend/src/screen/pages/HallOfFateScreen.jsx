import React, { useEffect, useState } from "react";
import HallEntry from "../components/HallEntry.jsx";
import ScoreDistributionChart from "../../components/ScoreDistributionChart.jsx";
import styles from "../screen.module.css";

export default function HallOfFateScreen({
  leaderboard,
  title,
  averageScore = 0,
  averageCharacter = null,
  sortedCharacters = [],
  scorePoints = [],
  scoreStats = null,
}) {
  const [visible, setVisible] = useState([]);

  // Staggered entrance animation — reveal entries one by one
  useEffect(() => {
    if (!leaderboard.length) return;
    leaderboard.forEach((_, i) => {
      setTimeout(() => setVisible((v) => [...v, i]), i * 200);
    });
  }, [leaderboard]);

  const top3 = leaderboard.filter((e) => e.rank <= 3);
  const bottom3 = leaderboard
    .filter((e) => e.isMasked)
    .sort((a, b) => b.rank - a.rank);
  const middle = leaderboard.filter((e) => !e.isMasked && e.rank > 3);

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
            key={`top-${entry.rank}-${entry.nickname}-${entry.totalScore}-${i}`}
            className={styles.top3Entry}
            style={{
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i)
                ? "translateY(0)"
                : "translateY(20px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            {/* <div className={styles.top3Rank}>
              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
            </div> */}
            <div className={styles.top3Emoji}>
              {entry.character?.imageEmoji || "🎭"}
            </div>
            <div className={styles.top3Nickname}>{entry.nickname}</div>
            {entry.character && (
              <div className={styles.top3CharName}>{entry.character.name}</div>
            )}
            <div className={styles.top3Score}>{entry.totalScore} pts</div>
          </div>
        ))}
      </div>

      {/* Middle */}
      {middle.length > 0 && (
        <div className={styles.middleList}>
          {middle.map((entry, i) => (
            <HallEntry
              key={`mid-${entry.rank}-${entry.nickname}-${entry.totalScore}-${i}`}
              entry={entry}
              style={{
                opacity: visible.includes(top3.length + i) ? 1 : 0,
                transform: visible.includes(top3.length + i)
                  ? "translateX(0)"
                  : "translateX(-20px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Bottom 3 (censored) */}
      {bottom3.length > 0 && (
        <div className={styles.bottomSection}>
          <p className={styles.bottomLabel}>Bottom 3 (names censored)</p>
          <div className={styles.bottomList}>
            {bottom3.map((entry, i) => (
              <HallEntry
                key={`bot-${entry.rank}-${entry.nickname}-${entry.totalScore}-${i}`}
                entry={entry}
                style={{
                  opacity: visible.includes(top3.length + middle.length + i)
                    ? 1
                    : 0,
                  transition: "opacity 0.4s ease",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {bottom3.length === 0 && (
        <div className={styles.bottomSection}>
          <p className={styles.bottomLabel}>
            Bottom 3 appears when there are at least 4 participants. With{" "}
            {leaderboard.length}, all participants are in the top section.
          </p>
        </div>
      )}

      <section className={styles.reportSection}>
        <div className={styles.avgCard}>
          <div className={styles.avgHero}>
            <p className={styles.avgLabel}>Organization average score</p>
            <div className={styles.avgValueRow}>
              <p className={styles.avgValue}>{averageScore}</p>
              <span className={styles.avgUnit}>pts</span>
            </div>
          </div>
          <div className={styles.avgCharacterPill}>
            <span className={styles.avgEmoji}>
              {averageCharacter?.imageEmoji || "🎭"}
            </span>
            <div>
              <p className={styles.avgCharacterName}>
                {averageCharacter?.name || "No matching character"}
              </p>
              {averageCharacter?.description && (
                <p className={styles.avgCharacterDesc}>
                  {averageCharacter.description}
                </p>
              )}
            </div>
          </div>

          {/* {scoreStats && (
            <div>
              <div className={styles.statList}>
                <div className={styles.statItem}>
                  <span className={styles.statKey}>Median</span>
                  <strong className={styles.statVal}>{scoreStats.median}</strong>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statKey}>Std dev</span>
                  <strong className={styles.statVal}>{scoreStats.stdDev}</strong>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statKey}>Range</span>
                  <strong className={styles.statVal}>{scoreStats.min} to {scoreStats.max}</strong>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statKey}>+ / - / 0</span>
                  <strong className={styles.statVal}>
                    {scoreStats.positiveCount} / {scoreStats.negativeCount} / {scoreStats.neutralCount}
                  </strong>
                </div>
              </div>
            </div>
          )} */}
        </div>

        <div className={styles.scatterCard}>
          <h2 className={styles.scatterTitle}>Score Distribution</h2>
          <p className={styles.scatterHint}>
            Histogram-based score distribution with five-number summary for
            stronger single-metric analysis.
          </p>
          <ScoreDistributionChart points={scorePoints} />
        </div>
      </section>

      <section className={styles.characterBandSection}>
        <h2 className={styles.characterBandTitle}>Character Score Bands</h2>
        <p className={styles.characterBandExplain}>
          Characters are sorted by score range from lowest to highest. A
          participant is mapped to the first inclusive range that matches: min ≤
          score ≤ max.
        </p>
        <div className={styles.characterBandList}>
          {sortedCharacters.map((char) => (
            <div
              key={`${char.name}-${char.minScore}-${char.maxScore}`}
              className={styles.characterBandCard}
            >
              <div className={styles.characterBandHead}>
                <span className={styles.characterBandEmoji}>
                  {char.imageEmoji || "🎭"}
                </span>
                <div>
                  <p className={styles.characterBandName}>{char.name}</p>
                  <p className={styles.characterBandRange}>
                    {char.minScore} to {char.maxScore}
                  </p>
                </div>
              </div>
              {char.description && (
                <p className={styles.characterBandDesc}>{char.description}</p>
              )}
            </div>
          ))}
          {sortedCharacters.length === 0 && (
            <p className={styles.characterBandExplain}>
              No character bands configured for this event.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
