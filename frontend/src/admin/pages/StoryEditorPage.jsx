import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminCreateStory, adminUpdateStory, adminGetEvent } from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import OptionGroupEditor from '../components/OptionGroupEditor.jsx';
import { nanoid } from '../../utils/nanoid.js';
import styles from '../admin.module.css';

const emptyGroup = () => ({ id: nanoid(), title: '', options: [{ id: nanoid(), text: '', score: 0 }] });

const defaultForm = {
  title: '',
  story: '',
  keyTakeaway: '',
  optionGroups: [emptyGroup()],
};

export default function StoryEditorPage() {
  const { eventId, setEventData } = useAdmin();
  const navigate = useNavigate();
  const { storyIndex } = useParams();
  const isEdit = storyIndex !== undefined;

  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) loadStory();
  }, [storyIndex]);

  async function loadStory() {
    try {
      const res = await adminGetEvent(eventId);
      setEventData(res.data);
      const story = res.data.stories.find(s => s.storyIndex === parseInt(storyIndex, 10));
      if (story) {
        setForm({
          title: story.title,
          story: story.story,
          keyTakeaway: story.keyTakeaway,
          optionGroups: story.optionGroups,
        });
      }
    } catch {
      setError('Failed to load story');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const sanitizedGroups = form.optionGroups.map(g => ({
        ...g,
        options: g.options.map(o => ({ ...o, score: parseInt(o.score, 10) || 0 })),
      }));
      const payload = { ...form, optionGroups: sanitizedGroups };
      if (isEdit) {
        await adminUpdateStory({ eventId, storyIndex: parseInt(storyIndex, 10), ...payload });
      } else {
        await adminCreateStory({ eventId, ...payload });
      }
      // Refresh event data
      const res = await adminGetEvent(eventId);
      setEventData(res.data);
      navigate('/admin/stories');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>{isEdit ? 'Edit Story' : 'New Story'}</h1>
        <button className={styles.btnGhost} onClick={() => navigate('/admin/stories')}>← Back</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>Story Title</label>
        <input
          className={styles.input}
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. The Crossroads Decision"
          required
        />

        <label className={styles.label}>Story Body</label>
        <textarea
          className={styles.textarea}
          value={form.story}
          onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
          placeholder="The narrative shown to participants…"
          rows={5}
          required
        />

        <label className={styles.label}>Key Takeaway <span className={styles.hint}>(revealed after vote)</span></label>
        <textarea
          className={styles.textarea}
          value={form.keyTakeaway}
          onChange={e => setForm(f => ({ ...f, keyTakeaway: e.target.value }))}
          placeholder="The insight or lesson participants will discover…"
          rows={3}
          required
        />

        <label className={styles.label}>Option Groups</label>
        <OptionGroupEditor
          groups={form.optionGroups}
          onChange={groups => setForm(f => ({ ...f, optionGroups: groups }))}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.btnGroup}>
          <button className={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Update Story' : 'Add Story'}
          </button>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/admin/stories')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
