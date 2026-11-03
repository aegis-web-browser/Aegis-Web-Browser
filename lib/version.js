'use strict';

/** Compare GitHub release tags, including historic four-part versions and preview builds. */
function compareVersions(a, b) {
  function parse(input) {
    const raw = String(input ?? '0').trim().replace(/^v/i, '');
    const [numbers, prerelease] = raw.split('-', 2);
    return {
      numbers: numbers.split('.').map(value => Number.parseInt(value, 10) || 0),
      prerelease: prerelease ? prerelease.split('.') : []
    };
  }
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < Math.max(x.numbers.length, y.numbers.length); i++) {
    const lhs = x.numbers[i] || 0;
    const rhs = y.numbers[i] || 0;
    if (lhs !== rhs) return lhs > rhs ? 1 : -1;
  }
  if (!x.prerelease.length && !y.prerelease.length) return 0;
  if (!x.prerelease.length) return 1;
  if (!y.prerelease.length) return -1;
  for (let i = 0; i < Math.max(x.prerelease.length, y.prerelease.length); i++) {
    if (i >= x.prerelease.length) return -1;
    if (i >= y.prerelease.length) return 1;
    const l = x.prerelease[i], r = y.prerelease[i];
    const ln = /^\d+$/.test(l), rn = /^\d+$/.test(r);
    if (ln && rn && Number(l) !== Number(r)) return Number(l) > Number(r) ? 1 : -1;
    if (ln !== rn) return ln ? -1 : 1;
    if (l !== r) return l > r ? 1 : -1;
  }
  return 0;
}
module.exports = { compareVersions };
