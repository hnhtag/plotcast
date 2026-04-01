import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard, getPlayerState } from "../../services/api.js";
import { usePlay } from "../PlayContext.jsx";
import { useInterval } from "../../hooks/useInterval.js";
import styles from "../play.module.css";

export default function WaitingPage() {
  const {
    eventId,
    userId,
    nickname,
    onStoryChanged,
    setHasVoted,
    setTotalScore,
  } = usePlay();
  const navigate = useNavigate();
  const [possibleCharacters, setPossibleCharacters] = useState([]);

  const loadEventOverview = useCallback(async () => {
    try {
      const res = await getLeaderboard(eventId);
      setPossibleCharacters(res.data?.sortedCharacters || []);
    } catch {
      setPossibleCharacters([]);
    }
  }, [eventId]);

  useEffect(() => {
    loadEventOverview();
  }, [loadEventOverview]);

  const poll = useCallback(async () => {
    try {
      const res = await getPlayerState(eventId, userId);
      const { status, currentStoryIndex, hasVotedCurrentStory, totalScore } =
        res.data;
      setTotalScore(totalScore || 0);
      setHasVoted(Boolean(hasVotedCurrentStory));

      if (status === "finished") {
        navigate("/play/finished");
      } else if (status === "active" && currentStoryIndex >= 0) {
        onStoryChanged(currentStoryIndex);
        navigate(hasVotedCurrentStory ? "/play/wait-next" : "/play/story");
      }
    } catch {}
  }, [eventId, userId, navigate, onStoryChanged, setHasVoted, setTotalScore]);

  useInterval(poll, 3000);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>PlotCast</div>
        <p className={styles.nickname}>Hi, {nickname}!</p>
        <div className={styles.waitingDot} />
        <h2 className={styles.heading}>Waiting for host to start…</h2>
        <p className={styles.hint}>
          Stay on this screen — you'll be taken to the story automatically.
        </p>
      </div>

      <div className={styles.card}>
        <h3 className={styles.storyTitle}>How Marking Works</h3>
        <ul className={styles.infoList}>
          <li>
            Each answer option adds or subtracts points from your total score.
          </li>
          <li>Final rank is based on total score first.</li>
          <li>If scores are tied, faster total answer time ranks higher.</li>
        </ul>
      </div>

      <div className={styles.card}>
        <h3 className={styles.storyTitle}>Possible Characters</h3>
        {possibleCharacters.length === 0 ? (
          <p className={styles.hint}>No characters configured yet.</p>
        ) : (
          <>
            <p className={styles.characterJourneyIntro}>
              Aim for the highest outcome at the top. Each character below shows
              the next step down the ladder.
            </p>
            <div className={styles.characterPreviewList}>
              {[...possibleCharacters]
                .reverse()
                .map((char, idx, characters) => {
                  const isTop = idx === 0;
                  const isBottom = idx === characters.length - 1;
                  const stageNumber = idx + 1;

                  return (
                    <div
                      key={`${char.name}-${char.minScore}-${char.maxScore}`}
                      className={`${styles.characterPreviewItem} ${isTop ? styles.characterPreviewItemPeak : ""}`}
                    >
                      <div className={styles.characterPreviewRail}>
                        <div className={styles.characterPreviewStep}>
                          {stageNumber}
                        </div>
                        {!isBottom ? (
                          <div className={styles.characterPreviewConnector} />
                        ) : null}
                      </div>
                      <div className={styles.characterPreviewHero}>
                        <span className={styles.characterPreviewEmoji}>
                          {char.imageEmoji || "🎭"}
                        </span>
                      </div>
                      <div className={styles.characterPreviewMeta}>
                        <p className={styles.characterPreviewName}>
                          {char.name}
                        </p>
                        {char.description ? (
                          <p className={styles.characterPreviewDescription}>
                            {char.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
