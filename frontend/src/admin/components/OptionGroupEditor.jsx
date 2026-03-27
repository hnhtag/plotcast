import React from 'react';
import { nanoid } from '../../utils/nanoid.js';
import styles from '../admin.module.css';

export default function OptionGroupEditor({ groups, onChange }) {
  function addGroup() {
    onChange([...groups, { id: nanoid(), title: '', options: [{ id: nanoid(), text: '', score: 0 }] }]);
  }

  function removeGroup(groupId) {
    onChange(groups.filter(g => g.id !== groupId));
  }

  function updateGroup(groupId, field, value) {
    onChange(groups.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  }

  function addOption(groupId) {
    onChange(groups.map(g => g.id === groupId
      ? { ...g, options: [...g.options, { id: nanoid(), text: '', score: 0 }] }
      : g
    ));
  }

  function removeOption(groupId, optionId) {
    onChange(groups.map(g => g.id === groupId
      ? { ...g, options: g.options.filter(o => o.id !== optionId) }
      : g
    ));
  }

  function updateOption(groupId, optionId, field, value) {
    onChange(groups.map(g => g.id === groupId
      ? { ...g, options: g.options.map(o => o.id === optionId ? { ...o, [field]: value } : o) }
      : g
    ));
  }

  return (
    <div className={styles.groupEditor}>
      {groups.map((group, gi) => (
        <div key={group.id} className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupNum}>Group {gi + 1}</span>
            <button type="button" className={styles.btnDanger} onClick={() => removeGroup(group.id)}>✕</button>
          </div>
          <input
            className={styles.input}
            placeholder="Group title / perspective (e.g. As a leader…)"
            value={group.title}
            onChange={e => updateGroup(group.id, 'title', e.target.value)}
            required
          />
          <div className={styles.optionList}>
            {group.options.map((opt, oi) => (
              <div key={opt.id} className={styles.optionRow}>
                <span className={styles.optionNum}>{oi + 1}</span>
                <input
                  className={styles.inputFlex}
                  placeholder="Option text"
                  value={opt.text}
                  onChange={e => updateOption(group.id, opt.id, 'text', e.target.value)}
                  required
                />
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.inputScore}
                  placeholder="Score"
                  value={opt.score}
                  onChange={e => updateOption(group.id, opt.id, 'score', e.target.value)}
                  onBlur={e => {
                    const n = parseInt(e.target.value, 10);
                    updateOption(group.id, opt.id, 'score', isNaN(n) ? 0 : n);
                  }}
                />
                {group.options.length > 1 && (
                  <button type="button" className={styles.btnIcon} onClick={() => removeOption(group.id, opt.id)}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className={styles.btnGhost} onClick={() => addOption(group.id)}>+ Add Option</button>
        </div>
      ))}
      <button type="button" className={styles.btnGhost} onClick={addGroup}>+ Add Group</button>
    </div>
  );
}
