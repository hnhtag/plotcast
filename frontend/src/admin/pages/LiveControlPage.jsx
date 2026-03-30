import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminGetEvent,
  getEventState,
  adminStart,
  adminNext,
  adminPrev,
  adminFinish,
  adminReopen,
  adminOpenAnswers,
  adminUpdateLiveSettings,
} from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import { useInterval } from '../../hooks/useInterval.js';
import LiveVoteBar from '../components/LiveVoteBar.jsx';
import styles from '../admin.module.css';

function formatRemaining(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '00:00';
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LiveControlPage() {
  const { eventId, eventData, setEventData, liveState, setLiveState } = useAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!eventData);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoShowAnswers, setAutoShowAnswers] = useState(true);
  const [answerTimerSec, setAnswerTimerSec] = useState('0');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const shareUrl = `${window.location.origin}/play?event=${eventId}`;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const status = liveState?.status || eventData?.meta?.status || 'waiting';
  const isActive = status === 'active';
  const isFinished = status === 'finished';

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
      const meta = eventRes.data?.meta || {};
      setAutoShowAnswers(meta.autoShowAnswers !== false);
      setAnswerTimerSec(String(Number.isFinite(Number(meta.answerTimerSec)) ? Number(meta.answerTimerSec) : 0));
    } catch {
      setError('Failed to load event');
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
    setError('');
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

  async function saveLiveSettings() {
    setError('');
    setSettingsSaving(true);
    try {
      const timer = Math.max(0, parseInt(answerTimerSec, 10) || 0);
      await adminUpdateLiveSettings({ eventId, autoShowAnswers, answerTimerSec: timer });
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Save settings failed');
    } finally {
      setSettingsSaving(false);
    }
  }

  if (loading) return <div className={styles.page}><p className={styles.hint}>Loading…</p></div>;

  const meta = eventData?.meta || {};
  const currentIdx = liveState?.currentStoryIndex ?? -1;
  const totalStories = liveState?.totalStories ?? meta.totalStories ?? 0;
  const currentStory = liveState?.story;
  const voteCounts = liveState?.voteCounts || {};
  const totalVotes = liveState?.totalVotes || 0;
  const answersOpen = Boolean(liveState?.answersOpen);
  const answerRemainingSec = liveState?.answerRemainingSec;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>Live Control</h1>
          <p className={styles.hint}>{meta.title} · Event ID: <strong>{eventId}</strong></p>
        </div>
        <div className={styles.statusBadge} data-status={status}>{status.toUpperCase()}</div>
      </div>

      {/* Share Link */}
      <div className={styles.shareSection}>
        <span className={styles.shareSectionLabel}>Public Join Link</span>
        <div className={styles.shareRow}>
          <span className={styles.shareUrl}>{shareUrl}</span>
          <button
            className={`${styles.btnCopy}${copied ? ` ${styles.btnCopied}` : ''}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        <h2 className={styles.subheading}>Answer Flow Settings</h2>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={autoShowAnswers}
            onChange={(e) => setAutoShowAnswers(e.target.checked)}
          />
          <span>Auto show answers when story starts (default flow)</span>
        </label>
        <label className={styles.label}>Answer Timer (seconds)</label>
        <input
          type="number"
          min={0}
          className={styles.input}
          value={answerTimerSec}
          onChange={(e) => setAnswerTimerSec(e.target.value)}
          placeholder="0 = no auto-close"
        />
        <p className={styles.hint}>When set, answers automatically close after the timer ends.</p>
        <div className={styles.btnGroup}>
          <button className={styles.btnPrimary} disabled={settingsSaving} onClick={saveLiveSettings}>
            {settingsSaving ? 'Saving…' : 'Save Answer Settings'}
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className={styles.controlBar}>
        {status === 'waiting' && (
          <button className={styles.btnStart} disabled={actionLoading || totalStories === 0} onClick={() => doAction(adminStart, 'Start')}>
            ▶ Start Event
          </button>
        )}
        {isActive && (
          <>
            <button className={styles.btnControl} disabled={actionLoading || currentIdx <= 0} onClick={() => doAction(adminPrev, 'Prev')}>← Prev</button>
            <span className={styles.storyCounter}>{currentIdx + 1} / {totalStories}</span>
            <button className={styles.btnControl} disabled={actionLoading || currentIdx >= totalStories - 1} onClick={() => doAction(adminNext, 'Next')}>Next →</button>
            <button
              className={styles.btnSecondary}
              disabled={actionLoading || answersOpen || !currentStory}
              onClick={() => doAction(adminOpenAnswers, 'Open answers')}
            >
              Open Answers
            </button>
            <span className={styles.hint}>
              {answersOpen
                ? `Answers Open${Number.isFinite(answerRemainingSec) ? ` · ${formatRemaining(answerRemainingSec)} left` : ''}`
                : 'Answers Closed'}
            </span>
            <button className={styles.btnDanger} disabled={actionLoading} onClick={() => { if (confirm('Finish event?')) doAction(adminFinish, 'Finish'); }}>
              ■ Finish
            </button>
          </>
        )}
        {isFinished && (
          <>
            <button className={styles.btnSecondary} disabled={actionLoading} onClick={() => doAction(adminReopen, 'Move to waiting')}>
              Move to Waiting
            </button>
            <span className={styles.hint}>Event finished.</span>
          </>
        )}
      </div>

      {/* Current Story Preview */}
      {currentStory && (
        <div className={styles.card}>
          <h2 className={styles.subheading}>Story {currentIdx + 1}: {currentStory.title}</h2>
          <p className={styles.storyBody}>{currentStory.story}</p>

          <div className={styles.voteSummary}>
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          </div>

          <div className={styles.voteBars}>
            {(currentStory.optionGroups || []).map(group => (
              <div key={group.id} className={styles.voteGroup}>
                <p className={styles.groupLabel}>{group.title}</p>
                {(group.options || []).map(opt => (
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

      {status === 'waiting' && totalStories === 0 && (
        <div className={styles.emptyState}>
          <p>No stories added yet.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/admin/stories')}>Add Stories</button>
        </div>
      )}

      {/* Nav links */}
      <div className={styles.navLinks}>
        <a className={styles.link} href="/admin/stories">Manage Stories</a>
        <a className={styles.link} href="/admin/characters">Manage Characters</a>
        <a className={styles.link} href="/admin/report">View Report</a>
        {!isFinished && <a className={styles.link} href={`/screen/${eventId}`} target="_blank">Open Presentation Screen ↗</a>}
      </div>
    </div>
  );
}
