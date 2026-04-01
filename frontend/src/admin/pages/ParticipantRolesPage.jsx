import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminGetEvent, adminUpdateParticipantRoles } from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import styles from '../admin.module.css';

function toTextareaValue(roles) {
  return Array.isArray(roles) ? roles.join('\n') : '';
}

function parseRoles(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((role) => role.trim())
    .filter(Boolean);
}

export default function ParticipantRolesPage() {
  const { eventId, eventData, setEventData } = useAdmin();
  const [loading, setLoading] = useState(!eventData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rolesText, setRolesText] = useState('');
  const [savedRolesText, setSavedRolesText] = useState('');

  useEffect(() => {
    loadRoles();
  }, [eventId]);

  async function loadRoles() {
    setError('');
    setSuccess('');
    try {
      const res = await adminGetEvent(eventId);
      const nextEventData = res.data;
      const nextRolesText = toTextareaValue(nextEventData?.meta?.roles || []);
      setEventData(nextEventData);
      setRolesText(nextRolesText);
      setSavedRolesText(nextRolesText);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load participant roles');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const roles = parseRoles(rolesText);
      const res = await adminUpdateParticipantRoles({ eventId, roles });
      const nextRolesText = toTextareaValue(res.data?.roles || []);
      setSavedRolesText(nextRolesText);
      setRolesText(nextRolesText);
      setEventData((prev) => ({
        ...(prev || {}),
        meta: {
          ...(prev?.meta || {}),
          roles: res.data?.roles || [],
        },
      }));
      setSuccess('Participant roles saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save participant roles');
    } finally {
      setSaving(false);
    }
  }

  const roles = useMemo(() => parseRoles(rolesText), [rolesText]);
  const settingsDirty = rolesText !== savedRolesText;
  const title = eventData?.meta?.title || 'Event';

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Loading participant roles...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>Participant Roles</h1>
          <p className={styles.hint}>
            {title} {' - '} Event ID: <strong>{eventId}</strong>
          </p>
        </div>
        <Link className={styles.link} to="/admin/live">
          Back to Live Control
        </Link>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subheading}>Join Form Roles</h2>
        <p className={styles.hint}>
          Add one role per line. When roles are configured, participants must pick one on the join screen.
        </p>

        <label className={styles.label}>Roles</label>
        <textarea
          className={styles.textarea}
          rows={8}
          value={rolesText}
          onChange={(e) => setRolesText(e.target.value)}
          placeholder={['Individual Contributor', 'Team Lead', 'Manager'].join('\n')}
        />

        <p className={styles.hint}>
          {roles.length > 0
            ? `${roles.length} role${roles.length === 1 ? '' : 's'} configured.`
            : 'No roles configured. Join form will only ask for nickname.'}
        </p>
        <p className={styles.hint}>
          {settingsDirty ? 'You have unsaved changes.' : 'Roles are saved.'}
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
            {saving ? 'Saving…' : 'Save Roles'}
          </button>
          <button
            className={styles.btnSecondary}
            type="button"
            disabled={saving || !settingsDirty}
            onClick={() => setRolesText(savedRolesText)}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}