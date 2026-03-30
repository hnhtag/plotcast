function normalizeTimerSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function deriveAnswerWindow(meta) {
  const autoShowAnswers = meta?.autoShowAnswers !== false;
  const answerTimerSec = normalizeTimerSeconds(meta?.answerTimerSec);

  let answersOpen = typeof meta?.answersOpen === 'boolean' ? meta.answersOpen : autoShowAnswers;
  const answersOpenedAt = meta?.answersOpenedAt || null;

  let answerEndsAt = null;
  let answerRemainingSec = null;

  if (answersOpen && answerTimerSec > 0 && answersOpenedAt) {
    const endsTs = new Date(answersOpenedAt).getTime() + answerTimerSec * 1000;
    if (Number.isFinite(endsTs)) {
      const nowTs = Date.now();
      const msLeft = endsTs - nowTs;
      answerRemainingSec = Math.max(0, Math.ceil(msLeft / 1000));
      answerEndsAt = new Date(endsTs).toISOString();
      if (msLeft <= 0) {
        answersOpen = false;
      }
    }
  }

  return {
    autoShowAnswers,
    answerTimerSec,
    answersOpen,
    answersOpenedAt,
    answerEndsAt,
    answerRemainingSec,
  };
}

module.exports = {
  deriveAnswerWindow,
  normalizeTimerSeconds,
};
