import React, { useEffect, useRef, useState } from 'react';
import styles from './answerPhaseChip.module.css';

function getTimerColor(progressPct) {
  if (progressPct > 40) return '#4ade80';
  if (progressPct > 20) return '#facc15';
  return '#ff6b6b';
}

export default function AnswerPhaseChip({
  isOpen,
  remainingSec,
  totalSec,
  openLabel = 'Answer Open',
  closedLabel = 'Answer Closed',
  variant = 'play',
  className = '',
}) {
  const chipRef = useRef(null);
  const [chipSize, setChipSize] = useState({ width: 0, height: 0 });

  const normalizedRemaining = Number.isFinite(remainingSec)
    ? Math.max(0, Math.floor(remainingSec))
    : null;
  const hasCountdown = Number.isFinite(totalSec) && totalSec > 0 && Number.isFinite(normalizedRemaining);
  const displayOpen = Boolean(isOpen) && (!Number.isFinite(normalizedRemaining) || normalizedRemaining > 0);
  const timerProgressPct = hasCountdown
    ? Math.max(0, Math.min(100, (normalizedRemaining / totalSec) * 100))
    : 100;
  const timerColor = getTimerColor(timerProgressPct);
  const timerDashOffset = 100 - timerProgressPct;
  const ringWidth = Math.max(0, chipSize.width - 2);
  const ringHeight = Math.max(0, chipSize.height - 2);
  const ringRadius = Math.max(0, (ringHeight - 2) / 2);
  const ringPath = ringWidth > 0 && ringHeight > 0
    ? `M ${ringRadius + 1} 1 H ${ringWidth - ringRadius - 1} A ${ringRadius} ${ringRadius} 0 0 1 ${ringWidth - 1} ${ringRadius + 1} V ${ringHeight - ringRadius - 1} A ${ringRadius} ${ringRadius} 0 0 1 ${ringWidth - ringRadius - 1} ${ringHeight - 1} H ${ringRadius + 1} A ${ringRadius} ${ringRadius} 0 0 1 1 ${ringHeight - ringRadius - 1} V ${ringRadius + 1} A ${ringRadius} ${ringRadius} 0 0 1 ${ringRadius + 1} 1`
    : '';
  const labelText = displayOpen
    ? `${openLabel}${hasCountdown ? `: ${normalizedRemaining}s left` : ''}`
    : closedLabel;
  const variantClass = variant === 'screen' ? styles.chipScreen : styles.chipPlay;
  const chipClassName = [styles.chip, variantClass, className].filter(Boolean).join(' ');

  useEffect(() => {
    if (!chipRef.current) return undefined;

    const element = chipRef.current;
    const updateChipSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setChipSize({
        width: Math.max(0, Math.round(width)),
        height: Math.max(0, Math.round(height)),
      });
    };

    updateChipSize();

    const observer = new ResizeObserver(updateChipSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [labelText, variant]);

  return (
    <span
      ref={chipRef}
      className={chipClassName}
      data-open={displayOpen ? 'true' : 'false'}
      style={displayOpen ? { '--timer-color': timerColor } : undefined}
    >
      {displayOpen && ringPath ? (
        <svg
          className={styles.ring}
          viewBox={`0 0 ${ringWidth} ${ringHeight}`}
          aria-hidden="true"
        >
          <path
            className={styles.ringTrack}
            d={ringPath}
            pathLength="100"
          />
          <path
            className={styles.ringProgress}
            d={ringPath}
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={timerDashOffset}
          />
        </svg>
      ) : null}
      <span className={styles.label}>{labelText}</span>
    </span>
  );
}
