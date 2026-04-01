import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { adminGetEventExportData, getEventState, getLeaderboard } from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import ScoreDistributionChart from '../../components/ScoreDistributionChart.jsx';
import styles from '../admin.module.css';

function formatResponseSeconds(ms) {
  if (!Number.isFinite(Number(ms)) || Number(ms) < 0 || Number(ms) === Number.MAX_SAFE_INTEGER) return '';
  return Number((Number(ms) / 1000).toFixed(2));
}

function sanitizeSheetName(name, fallback) {
  const clean = String(name || fallback || 'Sheet').replace(/[\\/?*\[\]:]/g, ' ').trim();
  return (clean || fallback || 'Sheet').slice(0, 31);
}

function downloadWorkbook(exportData) {
  const workbook = XLSX.utils.book_new();

  const storySetupRows = (exportData?.storySetup || []).map((story) => ({
    'Story #': Number(story.storyIndex || 0) + 1,
    'Story Title': story.storyTitle,
    'Story Body': story.storyBody,
    'Key Takeaway': story.keyTakeaway,
    'Option Group': story.groupTitle,
    'Option Text': story.optionText,
    'Option Score': story.optionScore,
  }));

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(storySetupRows.length > 0 ? storySetupRows : [{ Info: 'No story setup found' }]),
    'Story Setup',
  );

  const playerRows = (exportData?.players || []).map((player) => ({
    Rank: player.rank,
    Nickname: player.nickname,
    Role: player.role,
    'Total Score': player.totalScore,
    Character: player.characterName,
    'Total Answer Time (s)': formatResponseSeconds(player.totalResponseTimeMs),
    'Answered Count': player.answeredCount,
    'User ID': player.userId,
  }));

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(playerRows.length > 0 ? playerRows : [{ Info: 'No players found' }]),
    'Players',
  );

  (exportData?.storyVotes || []).forEach((story, idx) => {
    const storyRows = (story.votes || []).map((vote) => ({
      Rank: vote.rank,
      Nickname: vote.nickname,
      Role: vote.role,
      Character: vote.characterName,
      'Did Vote': vote.didVote ? 'Yes' : 'No',
      'Selected Option': vote.selectedOptionText || '',
      'Option Group': vote.groupTitle || '',
      'Option Score': vote.optionScore,
      'Answer Time (s)': formatResponseSeconds(vote.responseTimeMs),
      'Submitted At': vote.submittedAt || '',
      'Total Score': vote.totalScore,
      'User ID': vote.userId,
    }));

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(storyRows.length > 0 ? storyRows : [{ Info: 'No votes recorded' }]),
      sanitizeSheetName(`S${Number(story.storyIndex || idx) + 1} ${story.storyTitle || `Story ${idx + 1}`}`, `Story ${idx + 1}`),
    );
  });

  const fileSafeTitle = String(exportData?.title || exportData?.eventId || 'plotcast-report')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'plotcast-report';

  XLSX.writeFile(workbook, `${fileSafeTitle}-report.xlsx`);
}

export default function ReportPage() {
  const { eventId } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventState, setEventState] = useState(null);
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  async function handleExportExcel() {
    setExporting(true);
    setError('');
    try {
      const res = await adminGetEventExportData(eventId);
      downloadWorkbook(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export Excel report');
    } finally {
      setExporting(false);
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
        <div className={styles.btnGroup} style={{ marginTop: 0 }}>
          <button className={styles.btnSecondary} type="button" onClick={handleExportExcel} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
          <div className={styles.statusBadge} data-status={eventState?.status || 'waiting'}>
            {(eventState?.status || 'waiting').toUpperCase()}
          </div>
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
