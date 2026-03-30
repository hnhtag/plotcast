import React, { useEffect, useState } from 'react';
import { getEventState, getLeaderboard } from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import ScoreDistributionChart from '../../components/ScoreDistributionChart.jsx';
import styles from '../admin.module.css';

export default function ReportPage() {
  const { eventId } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventState, setEventState] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    loadReport();
  }, [eventId]);

  async function loadReport() {
    setLoading(true);
    setError('');
    try {
      const [stateRes, reportRes] = await Promise.all([
        getEventState(eventId),
        getLeaderboard(eventId),
      ]);
      setEventState(stateRes.data);
      setReport(reportRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className={styles.page}><p className={styles.hint}>Loading report…</p></div>;
  }

  const leaderboard = report?.leaderboard || [];
  const top3 = leaderboard.filter(e => e.rank <= 3);
  const bottom3 = leaderboard.filter(e => e.isMasked).sort((a, b) => b.rank - a.rank);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>Event Report</h1>
          <p className={styles.hint}>{eventState?.title || 'Untitled event'} · {eventId}</p>
        </div>
        <div className={styles.statusBadge} data-status={eventState?.status || 'waiting'}>
          {(eventState?.status || 'waiting').toUpperCase()}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.reportGrid}>
        <section className={styles.card}>
          <p className={styles.reportLabel}>Organization average score</p>
          <p className={styles.reportAvgValue}>{report?.averageScore ?? 0}</p>
          <div className={styles.reportCharRow}>
            <span className={styles.reportCharEmoji}>{report?.averageCharacter?.imageEmoji || '🎭'}</span>
            <div>
              <p className={styles.reportCharName}>{report?.averageCharacter?.name || 'No matching character'}</p>
              {report?.averageCharacter?.description && (
                <p className={styles.reportCharDesc}>{report.averageCharacter.description}</p>
              )}
            </div>
          </div>

          {report?.scoreStats && (
            <div className={styles.reportStatsGrid}>
              <div className={styles.reportStatChip}><span>Median</span><strong>{report.scoreStats.median}</strong></div>
              <div className={styles.reportStatChip}><span>Std Dev</span><strong>{report.scoreStats.stdDev}</strong></div>
              <div className={styles.reportStatChip}><span>Q1 / Q3</span><strong>{report.scoreStats.q1} / {report.scoreStats.q3}</strong></div>
              <div className={styles.reportStatChip}><span>Range</span><strong>{report.scoreStats.min} to {report.scoreStats.max}</strong></div>
              <div className={styles.reportStatChip}><span>+ / - / 0</span><strong>{report.scoreStats.positiveCount} / {report.scoreStats.negativeCount} / {report.scoreStats.neutralCount}</strong></div>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <p className={styles.reportLabel}>Top 3</p>
          <div className={styles.reportList}>
            {top3.map((entry, i) => (
              <div key={`top-${entry.rank}-${entry.nickname}-${entry.totalScore}-${i}`} className={styles.reportRow}>
                <span className={styles.reportRank}>#{entry.rank}</span>
                <span className={styles.reportName}>{entry.nickname}</span>
                <span className={styles.reportScore}>{entry.totalScore} pts</span>
              </div>
            ))}
            {top3.length === 0 && <p className={styles.hint}>No participants yet.</p>}
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <p className={styles.reportLabel}>Bottom 3 (censored)</p>
        <div className={styles.reportList}>
          {bottom3.map((entry, i) => (
            <div key={`bot-${entry.rank}-${entry.nickname}-${entry.totalScore}-${i}`} className={styles.reportRowMuted}>
              <span className={styles.reportRank}>#{entry.rank}</span>
              <span className={styles.reportName}>{entry.nickname}</span>
              <span className={styles.reportScoreMuted}>???</span>
            </div>
          ))}
          {bottom3.length === 0 && <p className={styles.hint}>Not enough participants to show bottom 3.</p>}
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.reportLabel}>Score Distribution</p>
        <p className={styles.hint}>Histogram distribution with quartiles and median for stronger analysis.</p>
        <ScoreDistributionChart points={report?.scorePoints || []} compact />
      </section>
    </div>
  );
}
