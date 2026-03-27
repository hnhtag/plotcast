import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminGetEvent, adminDeleteStory } from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import styles from '../admin.module.css';

export default function ManageStoriesPage() {
  const { eventId, eventData, setEventData } = useAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!eventData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventData) fetchEvent();
  }, []);

  async function fetchEvent() {
    try {
      const res = await adminGetEvent(eventId);
      setEventData(res.data);
    } catch {
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(storyIndex) {
    if (!confirm('Delete this story?')) return;
    try {
      await adminDeleteStory({ eventId, storyIndex });
      await fetchEvent();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  }

  if (loading) return <div className={styles.page}><p className={styles.hint}>Loading…</p></div>;

  const stories = eventData?.stories || [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>Stories</h1>
        <div className={styles.btnGroup}>
          <button className={styles.btnPrimary} onClick={() => navigate('/admin/stories/new')}>+ Add Story</button>
          <button className={styles.btnSecondary} onClick={() => navigate('/admin/live')}>Live Control →</button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {stories.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No stories yet. Add your first story to get started.</p>
        </div>
      ) : (
        <div className={styles.storyList}>
          {stories.map((story, i) => (
            <div key={story.SK} className={styles.storyCard}>
              <div className={styles.storyCardHeader}>
                <span className={styles.storyNum}>#{i + 1}</span>
                <h3 className={styles.storyTitle}>{story.title}</h3>
              </div>
              <p className={styles.storyExcerpt}>{story.story?.slice(0, 100)}…</p>
              <div className={styles.storyMeta}>
                <span>{story.optionGroups?.length || 0} group(s)</span>
                <span>{story.optionGroups?.reduce((n, g) => n + (g.options?.length || 0), 0) || 0} options</span>
              </div>
              <div className={styles.btnGroup}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => navigate(`/admin/stories/edit/${story.storyIndex}`)}
                >Edit</button>
                <button
                  className={styles.btnDanger}
                  onClick={() => handleDelete(story.storyIndex)}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.navLinks}>
        <a className={styles.link} href="/admin/characters">Setup Characters →</a>
      </div>
    </div>
  );
}
