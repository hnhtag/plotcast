import React from 'react';
import styles from '../screen.module.css';

export default function WaitingScreen({ title }) {
  return (
    <div className={styles.screen}>
      <div className={styles.waitingContent}>
        <div className={styles.logo}>PlotCast</div>
        <h1 className={styles.eventTitle}>{title}</h1>
        <div className={styles.waitingDots}>
          <span /><span /><span />
        </div>
        <p className={styles.waitingLabel}>Waiting for host to start…</p>
      </div>
    </div>
  );
}
