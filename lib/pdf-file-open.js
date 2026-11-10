'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_PDF_BYTES = 65 * 1024 * 1024;

// The OS gives us a filesystem path, never a URL or arbitrary shell command.
function resolvePdfPath(value, cwd = process.cwd()) {
  if (typeof value !== 'string' || !value || value.startsWith('-')) return null;
  if (path.extname(value).toLowerCase() !== '.pdf') return null;
  try {
    const absolute = path.resolve(cwd, value);
    const stat = fs.statSync(absolute);
    return stat.isFile() && stat.size >= 5 && stat.size <= MAX_PDF_BYTES ? absolute : null;
  } catch { return null; }
}

function pdfPathsFromArguments(args, { cwd = process.cwd(), skipFirst = 0 } = {}) {
  if (!Array.isArray(args)) return [];
  return [...new Set(args.slice(skipFirst).map(value => resolvePdfPath(value, cwd)).filter(Boolean))];
}

async function readPdfFile(value) {
  const absolute = resolvePdfPath(value);
  if (!absolute) throw new Error('PDF introuvable, vide ou supérieur à 65 Mo.');
  const bytes = await fs.promises.readFile(absolute);
  if (bytes.length > MAX_PDF_BYTES || bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('Le fichier sélectionné n’est pas un PDF valide.');
  }
  return { name: path.basename(absolute), data: bytes.toString('base64') };
}

module.exports = { MAX_PDF_BYTES, resolvePdfPath, pdfPathsFromArguments, readPdfFile };
