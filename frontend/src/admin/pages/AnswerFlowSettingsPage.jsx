import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminGetEvent, adminUpdateLiveSettings } from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import styles from '../admin.module.css';

function parseTimer(value) {
  return Math.max(0, parseInt(value, 10) || 0);
}

export default function AnswerFlowSettingsPage() {
  const { eventId, eventData, setEventData } = useAdmin();
  const [loading, setLoading] = useState(!eventData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoShowAnswers, setAutoShowAnswers] = useState(true);
  const [answerTimerSec, setAnswerTimerSec] = useState('0');
  const [savedAutoShowAnswers, setSavedAutoShowAnswers] = useState(true);
  const [savedAnswerTimerSec, setSavedAnswerTimerSec] = useState('0');

  useEffect(() => {
    loadSettings();
  }, [eventId]);

  async function loadSettings() {
    setError('');
    setSuccess('');

    try {
      const res = await adminGetEvent(eventId);
      const nextEventData = res.data;
      const meta = nextEventData?.meta || {};
      const nextAutoShowAnswers = meta.autoShowAnswers !== false;
      const nextAnswerTimerSec = String(
        Number.isFinite(Number(meta.answerTimerSec)) ? Number(meta.answerTimerSec) : 0
      );

      setEventData(nextEventData);
      setAutoShowAnswers(nextAutoShowAnswers);
      setAnswerTimerSec(nextAnswerTimerSec);
      setSavedAutoShowAnswers(nextAutoShowAnswers);
      setSavedAnswerTimerSec(nextAnswerTimerSec);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load answer flow settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const timer = parseTimer(answerTimerSec);
      await adminUpdateLiveSettings({
        eventId: eventId,
        autoShowAnswers: autoShowAnswers,
        answerTimerSec: timer,
      });

      setSavedAutoShowAnswers(autoShowAnswers);
      setSavedAnswerTimerSec(String(timer));
      await loadSettings();
      setSuccess('Answer flow settings saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save answer flow settings');
    } finally {
      setSaving(false);
    }
  }

  const normalizedTimer = String(parseTimer(answerTimerSec));
  const settingsDirty =
    autoShowAnswers !== savedAutoShowAnswers ||
    normalizedTimer !== savedAnswerTimerSec;
  const title = eventData?.meta?.title || 'Selected Event';
  const saveLabel = saving ? 'Saving...' : settingsDirty ? 'Save Settings' : 'Saved';

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Loading answer flow settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>Answer Flow Settings</h1>
          <p className={styles.hint}>
            {title} {' - '} Event ID: <strong>{eventId}</strong>
          </p>
        </div>
        <Link className={styles.link} to="/admin/live">
          Back to Live Control
        </Link>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subheading}>Presentation Flow</h2>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={autoShowAnswers}
            onChange={(e) => setAutoShowAnswers(e.target.checked)}
          />
          <span>Auto show answers when story starts</span>
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

        <div className={styles.timerPresetRow}>
          {[0, 30, 45, 60].map((sec) => (
            <button
              key={sec}
              type="button"
              className={styles.timerPresetBtn}
              onClick={() => setAnswerTimerSec(String(sec))}
            >
              {sec === 0 ? 'No timer' : `${sec}s`}
            </button>
          ))}
        </div>

        <p className={styles.hint}>
          When a timer is set, answers automatically close when it expires.
        </p>
        <p className={styles.hint}>
          These saved settings are used by Live Control when you open a story or manually open answers.
        </p>
        <p className={styles.hint}>
          {settingsDirty ? 'You have unsaved changes.' : 'Settings are saved.'}
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <div className={styles.btnGroup}>
          <button
            className={styles.btnPrimary}
            type="button"
            disabled={saving || !settingsDirty}
            onClick={handleSave}
          >
            {saveLabel}
          </button>
          <button
            className={styles.btnSecondary}
            type="button"
            disabled={saving || !settingsDirty}
            onClick={loadSettings}
          >
            Reset Changes
          </button>
        </div>
      </div>
    </div>
  );
}
