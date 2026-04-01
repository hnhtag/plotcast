import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminGetEvent,
  getEventState,
  adminStart,
  adminNext,
  adminPrev,
  adminFinish,
  adminReopen,
  adminOpenAnswers,
  adminCloseAnswers,
} from "../../services/api.js";
import { useAdmin } from "../AdminContext.jsx";
import { useInterval } from "../../hooks/useInterval.js";
import LiveVoteBar from "../components/LiveVoteBar.jsx";
import styles from "../admin.module.css";

function formatRemaining(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return "00:00";
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveControlPage() {
  const { eventId, eventData, setEventData, liveState, setLiveState } =
    useAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!eventData);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/play?event=${eventId}`;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const status = liveState?.status || eventData?.meta?.status || "waiting";
  const isActive = status === "active";
  const isFinished = status === "finished";

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [eventRes, stateRes] = await Promise.all([
        adminGetEvent(eventId),
        getEventState(eventId),
      ]);
      setEventData(eventRes.data);
      setLiveState(stateRes.data);
    } catch {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  const fetchState = useCallback(async () => {
    try {
      const res = await getEventState(eventId);
      setLiveState(res.data);
    } catch {}
  }, [eventId]);

  useInterval(fetchState, isActive ? 2000 : null);

  async function doAction(actionFn, label) {
    setError("");
    setActionLoading(true);
    try {
      await actionFn(eventId);
      await fetchState();
    } catch (err) {
      setError(err.response?.data?.error || `${label} failed`);
    } finally {
      setActionLoading(false);
    }
  }

  async function openAnswers() {
    setError("");
    setActionLoading(true);
    try {
      await adminOpenAnswers(eventId);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Open answers failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function closeAnswers() {
    setError("");
    setActionLoading(true);
    try {
      await adminCloseAnswers(eventId);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Close answers failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Loading…</p>
      </div>
    );

  const meta = eventData?.meta || {};
  const currentIdx = liveState?.currentStoryIndex ?? -1;
  const totalStories = liveState?.totalStories ?? meta.totalStories ?? 0;
  const currentStory = liveState?.story;
  const voteCounts = liveState?.voteCounts || {};
  const totalVotes = liveState?.totalVotes || 0;
  const answersOpen = Boolean(liveState?.answersOpen);
  const answerRemainingSec = liveState?.answerRemainingSec;
  const autoShowAnswers = meta.autoShowAnswers !== false;
  const answerTimerSec = Number.isFinite(Number(meta.answerTimerSec))
    ? Number(meta.answerTimerSec)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>Live Control</h1>
          <p className={styles.hint}>
            {meta.title} · Event ID: <strong>{eventId}</strong>
          </p>
        </div>
        <div className={styles.statusBadge} data-status={status}>
          {status.toUpperCase()}
        </div>
      </div>

      {/* Share Link */}
      <div className={styles.shareSection}>
        <span className={styles.shareSectionLabel}>Public Join Link</span>
        <div className={styles.shareRow}>
          <span className={styles.shareUrl}>{shareUrl}</span>
          <button
            className={`${styles.btnCopy}${copied ? ` ${styles.btnCopied}` : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.controlBarCompact}>
        {status === "waiting" && (
          <>
            <div className={styles.controlGroupCompact}>
              <span className={styles.controlGroupLabel}>Event</span>
              <button
                className={`${styles.btnStart} ${styles.controlBtnCompact}`}
                disabled={actionLoading || totalStories === 0}
                onClick={() => doAction(adminStart, "Start")}
              >
                Start Event
              </button>
            </div>
            <span className={styles.controlHintCompact}>
              {totalStories === 0
                ? "Add at least one story before starting."
                : `${totalStories} stor${totalStories === 1 ? "y" : "ies"} ready.`}
            </span>
          </>
        )}

        {isActive && (
          <>
            <div className={styles.controlGroupCompact}>
              <span className={styles.controlGroupLabel}>Story</span>
              <button
                className={`${styles.btnControl} ${styles.controlBtnCompact}`}
                disabled={actionLoading || currentIdx <= 0}
                onClick={() => doAction(adminPrev, "Prev")}
              >
                Prev
              </button>
              <span className={styles.storyCounter}>
                {currentIdx + 1} / {totalStories}
              </span>
              <button
                className={`${styles.btnControl} ${styles.controlBtnCompact}`}
                disabled={actionLoading || currentIdx >= totalStories - 1}
                onClick={() => doAction(adminNext, "Next")}
              >
                Next
              </button>
            </div>

            <span className={styles.controlDividerCompact} />

            <div className={styles.controlGroupCompact}>
              <span className={styles.controlGroupLabel}>Answers</span>
              <button
                className={`${styles.btnPrimary} ${styles.controlBtnCompact}`}
                disabled={actionLoading || answersOpen || !currentStory}
                onClick={openAnswers}
              >
                Open
              </button>
              <button
                className={`${styles.btnSecondary} ${styles.controlBtnCompact}`}
                disabled={actionLoading || !answersOpen}
                onClick={closeAnswers}
              >
                Close
              </button>
              <button
                className={`${styles.btnSecondary} ${styles.controlBtnCompact}`}
                type="button"
                onClick={() => navigate("/admin/answer-flow")}
              >
                ⚙ Settings
              </button>
            </div>

            <div className={styles.controlMetaCompact}>
              <span className={styles.controlSummaryChip}>
                Auto: <strong>{autoShowAnswers ? "ON" : "OFF"}</strong>
              </span>
              <span className={styles.controlSummaryChip}>
                Timer:{" "}
                <strong>
                  {answerTimerSec > 0 ? `${answerTimerSec}s` : "No timer"}
                </strong>
              </span>
              <span
                className={styles.liveAnswerState}
                data-open={answersOpen ? "true" : "false"}
              >
                {answersOpen
                  ? `Open${Number.isFinite(answerRemainingSec) ? ` · ${formatRemaining(answerRemainingSec)} left` : ""}`
                  : "Closed"}
              </span>
            </div>

            <span className={styles.controlDividerCompact} />

            <div className={styles.controlGroupCompact}>
              <span className={styles.controlGroupLabel}>Danger</span>
              <button
                className={`${styles.btnDanger} ${styles.controlBtnCompact}`}
                disabled={actionLoading}
                onClick={() => {
                  if (confirm("Finish event?")) doAction(adminFinish, "Finish");
                }}
              >
                End Event
              </button>
            </div>
          </>
        )}

        {isFinished && (
          <div className={styles.controlGroupCompact}>
            <span className={styles.controlGroupLabel}>Finished</span>
            <button
              className={`${styles.btnSecondary} ${styles.controlBtnCompact}`}
              disabled={actionLoading}
              onClick={() => doAction(adminReopen, "Move to waiting")}
            >
              Move to Waiting
            </button>
            <span className={styles.controlHintCompact}>Event finished.</span>
          </div>
        )}
      </div>

      {/* Current Story Preview */}
      {currentStory && (
        <div className={styles.card}>
          <h2 className={styles.subheading}>
            Story {currentIdx + 1}: {currentStory.title}
          </h2>
          <p className={styles.storyBody}>{currentStory.story}</p>

          <div className={styles.voteSummary}>
            <span>
              {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </span>
          </div>

          <div className={styles.voteBars}>
            {(currentStory.optionGroups || []).map((group) => (
              <div key={group.id} className={styles.voteGroup}>
                <p className={styles.groupLabel}>{group.title}</p>
                {(group.options || []).map((opt) => (
                  <LiveVoteBar
                    key={opt.id}
                    optionText={opt.text}
                    count={voteCounts[opt.id] || 0}
                    totalVotes={totalVotes}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "waiting" && totalStories === 0 && (
        <div className={styles.emptyState}>
          <p>No stories added yet.</p>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate("/admin/stories")}
          >
            Add Stories
          </button>
        </div>
      )}

      {/* Nav links */}
      <div className={styles.navLinks}>
        <a className={styles.link} href="/admin/stories">
          Manage Stories
        </a>
        <a className={styles.link} href="/admin/characters">
          Manage Characters
        </a>
        <a className={styles.link} href="/admin/roles">
          Manage Roles
        </a>
        <a className={styles.link} href="/admin/report">
          View Report
        </a>
        {!isFinished && (
          <a
            className={styles.link}
            href={`/screen/${eventId}`}
            target="_blank"
          >
            Open Presentation Screen ↗
          </a>
        )}
      </div>
    </div>
  );
}
