import React from 'react';
import styles from '../play.module.css';

export default function CharacterReveal({ character }) {
  if (!character) {
    return (
      <div className={styles.characterCard}>
        <div className={styles.characterEmoji}>🎭</div>
        <h3 className={styles.characterName}>Event Complete</h3>
        <p className={styles.characterDesc}>Thanks for participating!</p>
      </div>
    );
  }
  return (
    <div className={styles.characterCard}>
      <div className={styles.characterEmoji}>{character.imageEmoji}</div>
      <h3 className={styles.characterName}>{character.name}</h3>
      <p className={styles.characterDesc}>{character.description}</p>
      {character.encouragement ? (
        <p className={styles.motivationText}>{character.encouragement}</p>
      ) : null}
    </div>
  );
}
