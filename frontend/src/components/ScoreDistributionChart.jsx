import React from 'react';
import styles from './ScoreDistributionChart.module.css';

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function getStats(scores) {
  if (!scores.length) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

function buildHistogram(scores, binCount) {
  if (!scores.length) {
    return { bins: [], min: 0, max: 0, maxCount: 0 };
  }

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const safeBinCount = Math.max(4, binCount);
  const width = max === min ? 1 : (max - min) / safeBinCount;
  const bins = Array.from({ length: safeBinCount }, (_, i) => ({
    from: min + i * width,
    to: i === safeBinCount - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));

  scores.forEach((score) => {
    const raw = (score - min) / width;
    const idx = Math.min(safeBinCount - 1, Math.max(0, Math.floor(raw)));
    bins[idx].count += 1;
  });

  const maxCount = Math.max(1, ...bins.map(b => b.count));
  return { bins, min, max, maxCount };
}

function formatNumber(value) {
  return Number(value.toFixed(2));
}

export default function ScoreDistributionChart({ points = [], compact = false }) {
  if (!points.length) {
    return <p className={styles.empty}>No score data yet.</p>;
  }

  const scores = points.map(p => p.totalScore || 0);
  const stats = getStats(scores);
  const histogram = buildHistogram(scores, compact ? 7 : 9);

  const width = 720;
  const height = compact ? 220 : 260;
  const pad = { left: 42, right: 24, top: 20, bottom: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yAt = count => pad.top + plotH - (count / histogram.maxCount) * plotH;
  const xAt = index => pad.left + (index / histogram.bins.length) * plotW;
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = Math.round((histogram.maxCount / 4) * i);
    return { value, y: yAt(value) };
  });

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label="Score distribution histogram">
        <rect x={pad.left} y={pad.top} width={plotW} height={plotH} className={styles.plotBg} />

        {yTicks.map(t => (
          <g key={t.y}>
            <line x1={pad.left} x2={pad.left + plotW} y1={t.y} y2={t.y} className={styles.gridLine} />
            <text x={pad.left - 8} y={t.y + 4} textAnchor="end" className={styles.axisText}>{t.value}</text>
          </g>
        ))}

        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + plotH} className={styles.axisLine} />
        <line x1={pad.left} x2={pad.left + plotW} y1={pad.top + plotH} y2={pad.top + plotH} className={styles.axisLine} />

        {histogram.bins.map((bin, i) => {
          const barX = xAt(i) + 2;
          const nextX = xAt(i + 1);
          const barW = Math.max(4, nextX - barX - 2);
          const barY = yAt(bin.count);
          const barH = pad.top + plotH - barY;
          const mid = (bin.from + bin.to) / 2;
          const cls = mid > 0 ? styles.barPositive : mid < 0 ? styles.barNegative : styles.barNeutral;

          return (
            <g key={`${bin.from}-${bin.to}`}>
              <rect x={barX} y={barY} width={barW} height={barH} className={cls}>
                <title>{`${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${bin.count} participant(s)`}</title>
              </rect>
            </g>
          );
        })}

        <text x={pad.left + plotW / 2} y={height - 8} textAnchor="middle" className={styles.axisLabel}>Score bins</text>
        <text
          x={12}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${pad.top + plotH / 2})`}
          className={styles.axisLabel}
        >
          Participant count
        </text>
      </svg>

      <div className={styles.summaryRow}>
        <span><strong>Min:</strong> {formatNumber(stats.min)}</span>
        <span><strong>Q1:</strong> {formatNumber(stats.q1)}</span>
        <span><strong>Median:</strong> {formatNumber(stats.median)}</span>
        <span><strong>Q3:</strong> {formatNumber(stats.q3)}</span>
        <span><strong>Max:</strong> {formatNumber(stats.max)}</span>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}><i className={styles.legendDotPositive} /> Positive-score bins</span>
        <span className={styles.legendItem}><i className={styles.legendDotNegative} /> Negative-score bins</span>
        <span className={styles.legendTrend}><i className={styles.legendDotNeutral} /> Neutral bin</span>
      </div>
    </div>
  );
}