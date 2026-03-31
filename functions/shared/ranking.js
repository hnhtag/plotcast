function toMillis(value) {
  const ms = Number(value);
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms) : 0;
}

function getResponseTimeForRanking(user) {
  const answeredCount = Number(user?.answeredCount || 0);
  if (answeredCount <= 0) return Number.MAX_SAFE_INTEGER;
  return toMillis(user?.totalResponseTimeMs);
}

function sortUsersForRanking(users) {
  return [...users].sort((a, b) => {
    const scoreDiff = (b.totalScore || 0) - (a.totalScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const responseDiff = getResponseTimeForRanking(a) - getResponseTimeForRanking(b);
    if (responseDiff !== 0) return responseDiff;

    const at = new Date(a.joinedAt || 0).getTime();
    const bt = new Date(b.joinedAt || 0).getTime();
    if (at !== bt) return at - bt;

    const an = String(a.nickname || '').toLowerCase();
    const bn = String(b.nickname || '').toLowerCase();
    const nameDiff = an.localeCompare(bn);
    if (nameDiff !== 0) return nameDiff;

    return String(a.userId || a.SK).localeCompare(String(b.userId || b.SK));
  });
}

function getRankKey(user) {
  return `${Number(user?.totalScore || 0)}|${getResponseTimeForRanking(user)}`;
}

module.exports = {
  getResponseTimeForRanking,
  sortUsersForRanking,
  getRankKey,
};
