import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext.jsx';
import { getEventHistory, removeEventFromHistory } from '../../utils/eventHistory.js';
import styles from '../admin.module.css';

export default function EventsPage() {
  const { eventId: activeEventId, selectEvent } = useAdmin();
  const navigate = useNavigate();
  const [history, setHistory] = useState(() => getEventHistory());

  function handleRemove(id) {
    removeEventFromHistory(id);
    setHistory(getEventHistory());
  }

  function handleManage(id) {
    selectEvent(id);
    navigate('/admin/live');
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.heading}>My Events</h1>
        <button className={styles.btnPrimary} onClick={() => navigate('/admin/setup')}>+ New Event</button>
      </div>

      {history.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No events yet. Create your first event to get started.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/admin/setup')}>Create Event</button>
        </div>
      ) : (
        <div className={styles.eventList}>
          {history.map(e => {
            const isActive = e.eventId === activeEventId;
            return (
              <div key={e.eventId} className={`${styles.eventCard} ${isActive ? styles.eventCardActive : ''}`}>
                <div className={styles.eventCardBody}>
                  <span className={styles.eventCardId}>{e.eventId}</span>
                  {e.title && <span className={styles.eventCardTitle}>{e.title}</span>}
                  {isActive && <span className={styles.activeBadge}>Selected</span>}
                </div>
                <div className={styles.eventCardActions}>
                  <button className={isActive ? styles.btnPrimary : styles.btnSecondary} onClick={() => handleManage(e.eventId)}>
                    Manage →
                  </button>
                  <button className={styles.btnIcon} title="Remove" onClick={() => handleRemove(e.eventId)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
