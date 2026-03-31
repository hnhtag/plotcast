import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminGetEvent,
  adminCreateCharacter,
  adminUpdateCharacter,
  adminDeleteCharacter,
} from "../../services/api.js";
import { useAdmin } from "../AdminContext.jsx";
import styles from "../admin.module.css";

const defaultForm = {
  name: "",
  description: "",
  encouragement: "",
  imageEmoji: "🎭",
  minScore: 0,
  maxScore: 100,
};

export default function CharactersPage() {
  const { eventId, eventData, setEventData } = useAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!eventData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventData) fetchEvent();
  }, []);

  async function fetchEvent() {
    try {
      const res = await adminGetEvent(eventId);
      setEventData(res.data);
    } catch {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(char) {
    setEditingId(char.characterId);
    setForm({
      name: char.name,
      description: char.description,
      encouragement: char.encouragement || "",
      imageEmoji: char.imageEmoji,
      minScore: char.minScore,
      maxScore: char.maxScore,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(false);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        minScore: parseInt(form.minScore, 10) || 0,
        maxScore: parseInt(form.maxScore, 10) || 0,
      };

      if (editingId) {
        await adminUpdateCharacter({
          eventId,
          characterId: editingId,
          ...payload,
        });
      } else {
        await adminCreateCharacter({ eventId, ...payload });
      }
      await fetchEvent();
      cancelForm();
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(characterId) {
    if (!confirm("Delete this character?")) return;
    try {
      await adminDeleteCharacter({ eventId, characterId });
      await fetchEvent();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  }

  if (loading)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Loading…</p>
      </div>
    );

  const characters = [...(eventData?.characters || [])].sort((a, b) => {
    const minDiff = (a.minScore || 0) - (b.minScore || 0);
    if (minDiff !== 0) return minDiff;

    const maxDiff = (a.maxScore || 0) - (b.maxScore || 0);
    if (maxDiff !== 0) return maxDiff;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>Result Characters</h1>
        <div className={styles.btnGroup}>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowForm(true)}
          >
            + Add Character
          </button>
          <button
            className={styles.btnSecondary}
            onClick={() => navigate("/admin/live")}
          >
            Live Control →
          </button>
        </div>
      </div>

      <p className={styles.hint}>
        Characters are assigned to participants based on their total score at
        event end. List is sorted by score range (min, then max).
      </p>

      {showForm && (
        <form onSubmit={handleSave} className={`${styles.form} ${styles.card}`}>
          <h2 className={styles.subheading}>
            {editingId ? "Edit Character" : "New Character"}
          </h2>
          <div className={styles.row}>
            <div style={{ flex: "0 0 4rem" }}>
              <label className={styles.label}>Emoji</label>
              <input
                className={styles.input}
                value={form.imageEmoji}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageEmoji: e.target.value }))
                }
                maxLength={2}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className={styles.label}>Name</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Visionary Leader"
                required
              />
            </div>
          </div>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Short character description…"
            required
          />
          <label className={styles.label}>Encouragement</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.encouragement}
            onChange={(e) =>
              setForm((f) => ({ ...f, encouragement: e.target.value }))
            }
            placeholder="Optional motivational line for this score band…"
          />
          <div className={styles.row}>
            <div style={{ flex: 1 }}>
              <label className={styles.label}>Min Score</label>
              <input
                type="text"
                inputMode="text"
                pattern="-?[0-9]*"
                className={styles.input}
                value={form.minScore}
                placeholder="e.g. -20"
                onChange={(e) =>
                  setForm((f) => ({ ...f, minScore: e.target.value }))
                }
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setForm((f) => ({ ...f, minScore: isNaN(n) ? 0 : n }));
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className={styles.label}>Max Score</label>
              <input
                type="text"
                inputMode="text"
                pattern="-?[0-9]*"
                className={styles.input}
                value={form.maxScore}
                placeholder="e.g. 50"
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxScore: e.target.value }))
                }
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setForm((f) => ({ ...f, maxScore: isNaN(n) ? 0 : n }));
                }}
              />
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.btnGroup}>
            <button
              className={styles.btnPrimary}
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={cancelForm}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {characters.length === 0 && !showForm ? (
        <div className={styles.emptyState}>
          <p>
            No characters yet. Add characters to show result profiles after the
            event.
          </p>
        </div>
      ) : (
        <div className={styles.storyList}>
          {characters.map((char) => (
            <div key={char.SK} className={styles.storyCard}>
              <div className={styles.storyCardHeader}>
                <span style={{ fontSize: "2rem" }}>{char.imageEmoji}</span>
                <div>
                  <h3 className={styles.storyTitle}>{char.name}</h3>
                  <span className={styles.hint}>
                    Score: {char.minScore} – {char.maxScore}
                  </span>
                </div>
              </div>
              <p className={styles.storyExcerpt}>{char.description}</p>
              {char.encouragement ? (
                <p className={styles.hint}>{char.encouragement}</p>
              ) : null}
              <div className={styles.btnGroup}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => startEdit(char)}
                >
                  Edit
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={() => handleDelete(char.characterId)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
