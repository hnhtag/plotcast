import React from "react";
import AnswerPhaseChip from "../../components/AnswerPhaseChip.jsx";
import LiveBar from "../components/LiveBar.jsx";
import styles from "../screen.module.css";

const GROUP_COLORS = [
  "linear-gradient(90deg, #7c6fff, #a78bfa)",
  "linear-gradient(90deg, #06b6d4, #67e8f9)",
  "linear-gradient(90deg, #f59e0b, #fcd34d)",
  "linear-gradient(90deg, #10b981, #6ee7b7)",
  "linear-gradient(90deg, #f43f5e, #fda4af)",
];

export default function StoryScreen({ liveState }) {
  const {
    story,
    voteCounts = {},
    totalVotes = 0,
    currentStoryIndex,
    totalStories,
    answersOpen,
    answerTimerSec,
    answerRemainingSec,
  } = liveState;
  const groups = story?.optionGroups || [];

  return (
    <div className={styles.screen}>
      <div className={styles.screenHeader}>
        <span className={styles.screenLogo}>PlotCast</span>
        <span className={styles.storyCounter}>
          {currentStoryIndex + 1} / {totalStories}
        </span>
        <span className={styles.voteCount}>{totalVotes} votes</span>
      </div>

      <section className={styles.storyIntro}>
        <h1 className={styles.storyTitle}>{story?.title}</h1>
        <p className={styles.storyBody}>{story?.story}</p>
        <div className={styles.answerStateRow}>
          <AnswerPhaseChip
            isOpen={answersOpen}
            remainingSec={answerRemainingSec}
            totalSec={answerTimerSec}
            variant="screen"
          />
        </div>
      </section>

      {
        <div className={styles.barsContainer}>
          {groups.map((group, gi) => (
            <div key={group.id} className={styles.barGroup}>
              <p className={styles.barGroupLabel}>{group.title}</p>
              {(group.options || []).map((opt) => (
                <LiveBar
                  key={opt.id}
                  optionText={opt.text}
                  count={voteCounts[opt.id] || 0}
                  totalVotes={totalVotes}
                  color={GROUP_COLORS[gi % GROUP_COLORS.length]}
                />
              ))}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
