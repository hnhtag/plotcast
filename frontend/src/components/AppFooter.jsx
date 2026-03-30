import React from 'react';
import styles from './AppFooter.module.css';

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} aria-label="Application footer">
      <p className={styles.text}>
        © {year} PlotCast. Made with care by{' '}
        <a
          className={styles.link}
          href="https://sites.google.com/kbzbank.com/software/members/full-stack-development-team-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          F21 Dev Team 1
        </a>
        .
      </p>
    </footer>
  );
}