'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  checkVirusTotalFile, inspectLocalFile, normaliseUploadUrl,
  vtFileReportUrl, vtFileSearchUrl, vtManualUploadUrl, makeUploadPrelude,
  uploadVirusTotalFile
} = require('../lib/virustotal-file');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-vt-test-'));
const file = path.join(dir, 'download-test.txt');
const bytes = Buffer.from('Aegis Web sample file for VT unit tests');
fs.writeFileSync(file, bytes);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('a local file is hashed correctly without uploading any bytes', async () => {
  const info = await inspectLocalFile(file);
  assert.equal(info.sha256, sha256);
  assert.equal(info.size, bytes.length);
});

test('without API key Aegis never invents a file report or uploads', async () => {
  let called = false;
  const result = await checkVirusTotalFile(file, '', async () => { called = true; });
  assert.equal(called, false);
  assert.equal(result.mode, 'needs-key');
  assert.equal(result.reportUrl, undefined);
  assert.equal(result.manualUploadUrl, vtManualUploadUrl());
  assert.equal(result.searchUrl, vtFileSearchUrl(sha256));
});

test('an existing VT report is opened only after a successful file lookup', async () => {
  const requested = [];
  const result = await checkVirusTotalFile(file, 'sample-key', async (url, options) => {
    requested.push([url, options.method]);
    return { data: { attributes: { last_analysis_stats: { malicious: 2, harmless: 47 } } } };
  });
  assert.equal(result.mode, 'known');
  assert.deepEqual(requested, [[`https://www.virustotal.com/api/v3/files/${sha256}`, 'GET']]);
  assert.equal(result.reportUrl, vtFileReportUrl(sha256));
  assert.equal(result.stats.malicious, 2);
  assert.equal(result.stats.harmless, 47);
});

test('VT HTTP 404 becomes unknown, never an Item not found page', async () => {
  const result = await checkVirusTotalFile(file, 'key', async () => {
    const error = new Error('NotFoundError'); error.status = 404; throw error;
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'unknown');
  assert.equal(result.reportUrl, undefined);
  assert.match(result.message, /inconnu/);
});

test('VT API authentication and quota errors are explained', async () => {
  for (const [status, regex] of [[401, /Clé API/], [429, /Quota VirusTotal/]]) {
    const result = await checkVirusTotalFile(file, 'key', async () => {
      const error = new Error('denied'); error.status = status; throw error;
    });
    assert.equal(result.ok, false);
    assert.match(result.error, regex);
  }
});

test('VT does not silently scan folders', async () => {
  await assert.rejects(() => inspectLocalFile(dir), /pas les dossiers/);
  await assert.rejects(() => inspectLocalFile(path.join(dir, 'missing.exe')), /ENOENT/);
});

test('VT upload URLs are restricted to HTTPS on VirusTotal domains', () => {
  assert.equal(normaliseUploadUrl('https://www.virustotal.com/api/v3/files').hostname, 'www.virustotal.com');
  assert.equal(normaliseUploadUrl('http://www.virustotal.com/_ah/upload/id').protocol, 'https:');
  for (const target of ['https://virustotal.com.evil.com/upload', 'https://127.0.0.1/upload', 'file:///etc/passwd', 'https://attacker@virustotal.com/upload']) {
    assert.throws(() => normaliseUploadUrl(target));
  }
});

test('multipart header cannot inject extra headers using downloaded filenames', () => {
  const value = makeUploadPrelude('boundary', 'danger"\r\nX-Header: bad');
  assert.match(value.toString('utf8'), /filename="danger__X-Header: bad"/);
  assert.equal(value.toString('utf8').includes('\r\nX-Header: bad'), false);
});

test('upload refuses a stale file hash without sending anything', async () => {
  await assert.rejects(() => uploadVirusTotalFile(file, 'a'.repeat(64), 'key', async () => {
    throw new Error('Should not contact VirusTotal');
  }), /fichier a changé/);
});
