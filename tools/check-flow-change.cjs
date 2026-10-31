// Offline review guard. Reads exported definition.json files; never calls an API.
const fs = require('node:fs');
const crypto = require('node:crypto');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const hash = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const escape = key => key.replaceAll('~', '~0').replaceAll('/', '~1');
function changes(before, after, path = '') {
  if (JSON.stringify(canonical(before)) === JSON.stringify(canonical(after))) return [];
  if (before && after && !Array.isArray(before) && !Array.isArray(after) && typeof before === 'object' && typeof after === 'object') {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key => {
      const next = path + '/' + escape(key);
      if (!(key in before)) return [{path: next, kind: 'add', afterHash: hash(after[key])}];
      if (!(key in after)) return [{path: next, kind: 'remove', beforeHash: hash(before[key])}];
      return changes(before[key], after[key], next);
    });
  }
  return [{path, kind: 'replace', beforeHash: hash(before), afterHash: hash(after)}];
}
function inspect(before, after, approved = []) {
  // Deliberately include connection references and metadata. Platform-only drift
  // must be reviewed explicitly rather than silently hiding a changed setting.
  if (!before?.properties?.definition?.actions || !after?.properties?.definition?.actions) throw new Error('Expected complete exported flow definitions');
  if (!Array.isArray(approved)) throw new Error('Expected an array of exact change fingerprints');
  const actual = changes(before, after);
  const key = x => JSON.stringify(canonical(x));
  if (new Set(approved.map(key)).size !== approved.length) throw new Error('Duplicate approved change');
  return {
    result: actual.every(x => approved.some(a => key(a) === key(x))) && approved.every(a => actual.some(x => key(x) === key(a))) ? 'PASS' : 'FAIL',
    beforeHash: hash(before), afterHash: hash(after), changes: actual,
    unexpected: actual.filter(x => !approved.some(a => key(a) === key(x))),
    unusedApprovals: approved.filter(a => !actual.some(x => key(x) === key(a)))
  };
}
module.exports = {inspect, changes, hash};
if (require.main === module) {
  try {
    const [before, after, policy] = process.argv.slice(2);
    if (!before || !after) throw new Error('Usage: node tools/check-flow-change.cjs before.json after.json [exact-changes.json]');
    const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
    const report = inspect(read(before), read(after), policy ? read(policy) : []);
    // Paths and hashes only: no expressions, recipients, tokens or signed URLs.
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.result === 'PASS' ? 0 : 1;
  } catch {
    console.error('Flow verification failed. Check arguments and complete JSON exports; source content is not logged.');
    process.exitCode = 2;
  }
}
