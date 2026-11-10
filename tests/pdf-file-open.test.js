'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MAX_PDF_BYTES, resolvePdfPath, pdfPathsFromArguments, readPdfFile } = require('../lib/pdf-file-open');

test('OS-supplied PDF paths are validated without changing the system default viewer', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-pdf-test-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const pdf = path.join(temp, 'document de test.PDF');
  const text = path.join(temp, 'document.txt');
  fs.writeFileSync(pdf, '%PDF-1.4\n%%EOF\n');
  fs.writeFileSync(text, 'not a PDF');
  assert.equal(resolvePdfPath(pdf), pdf);
  assert.equal(resolvePdfPath(path.basename(pdf), temp), pdf);
  assert.equal(resolvePdfPath(text), null);
  assert.equal(resolvePdfPath('https://example.com/test.pdf'), null);
  assert.equal(resolvePdfPath('--debug.pdf'), null);
  assert.equal(resolvePdfPath(path.join(temp, 'missing.pdf')), null);
  assert.deepEqual(pdfPathsFromArguments(['Aegis Web.exe', '--flag', pdf, pdf, text]), [pdf]);
  assert.equal((await readPdfFile(pdf)).name, path.basename(pdf));
});

test('PDF content and file-size checks prevent arbitrary and oversized files', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-pdf-test-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const badPdf = path.join(temp, 'bad.pdf');
  fs.writeFileSync(badPdf, 'NOT A PDF');
  await assert.rejects(readPdfFile(badPdf), /PDF valide/);
  const hugePdf = path.join(temp, 'huge.pdf');
  fs.writeFileSync(hugePdf, '%PDF-');
  fs.truncateSync(hugePdf, MAX_PDF_BYTES + 1);
  assert.equal(resolvePdfPath(hugePdf), null);
  await assert.rejects(readPdfFile(hugePdf), /supérieur à 65 Mo/);
});
