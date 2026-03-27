import React from 'react';
import styles from '../play.module.css';

export default function OptionCard({ option, groupId, selected, disabled, onSelect }) {
  return (
    <button
      className={`${styles.optionCard} ${selected ? styles.optionSelected : ''} ${disabled ? styles.optionDisabled : ''}`}
      onClick={() => !disabled && onSelect(groupId, option.id)}
      disabled={disabled}
    >
      {option.text}
    </button>
  );
}
