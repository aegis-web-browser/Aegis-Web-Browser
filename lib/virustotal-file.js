'use strict';

// VirusTotal distinguishes a hash lookup (no file sent) from an explicit upload.
// Never upload downloaded files without informed, per-file consent.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');

const VT_API = 'https://www.virustotal.com/api/v3';
const VT_MAX_UPLOAD_BYTES = 650 * 1024 * 1024;
const VT_SMALL_UPLOAD_BYTES = 32 * 1024 * 1024;

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}
function vtFileReportUrl(sha256) {
  if (!isSha256(sha256)) throw new Error('Empreinte SHA-256 invalide.');
  return `https://www.virustotal.com/gui/file/${sha256.toLowerCase()}`;
}
function vtFileSearchUrl(sha256) {
  if (!isSha256(sha256)) throw new Error('Empreinte SHA-256 invalide.');
  return `https://www.virustotal.com/gui/search/${sha256.toLowerCase()}`;
}
function vtManualUploadUrl() {
  return 'https://www.virustotal.com/gui/home/upload';
}
function normaliseUploadUrl(value) {
  const parsed = new URL(String(value || ''));
  // VT sometimes documents upload endpoints using http. Never send file bytes or API keys over HTTP.
  if (parsed.protocol === 'http:') parsed.protocol = 'https:';
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:' || (host !== 'virustotal.com' && !host.endsWith('.virustotal.com')) || parsed.username || parsed.password || (parsed.port && parsed.port !== '443')) {
    throw new Error('Adresse de dépôt VirusTotal non sécurisée ou non reconnue.');
  }
  return parsed;
}
function vtErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) return 'Clé API VirusTotal absente, invalide ou non autorisée.';
  if (error?.status === 429) return 'Quota VirusTotal atteint. Réessayez plus tard.';
  return `VirusTotal : ${String(error?.message || 'erreur inconnue')}`;
}
async function inspectLocalFile(target) {
  const filePath = String(target || '');
  if (!filePath) throw new Error('Aucun fichier sélectionné.');
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile()) {
    throw new Error('VirusTotal analyse les fichiers, pas les dossiers. Choisissez un fichier ou créez une archive ZIP, sans données personnelles.');
  }
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath);
    input.on('data', chunk => hash.update(chunk));
    input.once('end', resolve);
    input.once('error', reject);
  });
  return { filePath, size: stat.size, sha256: hash.digest('hex') };
}
function reportStats(attributes) {
  const raw = attributes?.last_analysis_stats || {};
  return {
    malicious: Number(raw.malicious || 0),
    suspicious: Number(raw.suspicious || 0),
    harmless: Number(raw.harmless || 0),
    undetected: Number(raw.undetected || 0)
  };
}
async function checkVirusTotalFile(target, apiKey, apiRequest) {
  const info = await inspectLocalFile(target);
  const common = {
    sha256: info.sha256,
    size: info.size,
    filename: path.basename(info.filePath),
    manualUploadUrl: vtManualUploadUrl(),
    searchUrl: vtFileSearchUrl(info.sha256)
  };
  // A hash is not evidence of a VirusTotal report. Do not open a guessed report link.
  if (!String(apiKey || '').trim()) {
    return {
      ok: true, mode: 'needs-key', ...common,
      message: 'Aucune clé API VirusTotal : impossible de savoir si un rapport existe. Ouvrez VirusTotal pour importer ce fichier manuellement, ou ajoutez une clé API dans les paramètres.'
    };
  }
  try {
    const result = await apiRequest(`${VT_API}/files/${info.sha256}`, { method: 'GET' }, apiKey);
    if (!result?.data?.attributes) throw new Error('Réponse VirusTotal incomplète.');
    return {
      ok: true, mode: 'known', ...common,
      reportUrl: vtFileReportUrl(info.sha256),
      stats: reportStats(result.data.attributes)
    };
  } catch (error) {
    if (error?.status === 404) {
      return {
        ok: true, mode: 'unknown', ...common,
        message: 'Fichier inconnu de VirusTotal. Aucun verdict disponible. Vous pouvez décider de l’envoyer pour une nouvelle analyse.'
      };
    }
    return { ok: false, ...common, error: vtErrorMessage(error) };
  }
}
function makeUploadPrelude(boundary, filename) {
  const asciiFilename = String(filename || 'fichier').replace(/[^\x20-\x7E]/g, '_').replace(/["\\\r\n]/g, '_').slice(0, 160);
  return Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${asciiFilename}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
}
function postFileMultipart(uploadUrl, file, apiKey) {
  const url = normaliseUploadUrl(uploadUrl);
  const boundary = '----AegisWebVirusTotal' + crypto.randomBytes(12).toString('hex');
  const prelude = makeUploadPrelude(boundary, path.basename(file.filePath));
  const ending = Buffer.from(`\r\n--${boundary}--\r\n`);
  return new Promise((resolve, reject) => {
    let finished = false;
    let responseBytes = 0;
    let parts = [];
    let stream;
    const settle = (error, value) => {
      if (finished) return;
      finished = true;
      if (error) reject(error);
      else resolve(value);
    };
    const req = https.request(url, {
      method: 'POST',
      timeout: 300000,
      headers: {
        'accept': 'application/json',
        'x-apikey': apiKey,
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': prelude.length + file.size + ending.length
      }
    }, res => {
      res.on('data', chunk => {
        responseBytes += chunk.length;
        if (responseBytes > 2 * 1024 * 1024) {
          req.destroy(new Error('Réponse VirusTotal trop volumineuse.'));
          return;
        }
        parts.push(chunk);
      });
      res.on('end', () => {
        const statusCode = Number(res.statusCode || 0);
        let body;
        try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { body = {}; }
        if (statusCode < 200 || statusCode >= 300) {
          const error = new Error(body?.error?.message || `HTTP ${statusCode}`);
          error.status = statusCode;
          settle(error);
        } else {
          settle(null, body);
        }
      });
      res.on('error', settle);
    });
    req.on('timeout', () => req.destroy(new Error('Délai de dépôt VirusTotal dépassé.')));
    req.on('error', error => { stream?.destroy(); settle(error); });
    stream = fs.createReadStream(file.filePath);
    stream.once('error', error => { req.destroy(error); settle(error); });
    req.write(prelude);
    stream.pipe(req, { end: false });
    stream.once('end', () => req.end(ending));
  });
}
async function uploadVirusTotalFile(target, expectedSha256, apiKey, apiRequest) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('Configurez une clé API VirusTotal avant tout envoi.');
  const file = await inspectLocalFile(target);
  if (!isSha256(expectedSha256) || file.sha256 !== expectedSha256.toLowerCase()) {
    throw new Error('Le fichier a changé depuis la vérification initiale. Recommencez avant de l’envoyer.');
  }
  if (file.size > VT_MAX_UPLOAD_BYTES) {
    throw new Error('Fichier supérieur à 650 Mo : dépôt impossible via l’API VirusTotal.');
  }
  let uploadUrl = `${VT_API}/files`;
  if (file.size > VT_SMALL_UPLOAD_BYTES) {
    const response = await apiRequest(`${VT_API}/files/upload_url`, { method: 'GET' }, key);
    uploadUrl = response?.data;
    if (!uploadUrl) throw new Error('VirusTotal n’a pas fourni de lien de dépôt.');
  }
  const result = await postFileMultipart(uploadUrl, file, key);
  const analysisId = result?.data?.id;
  if (!analysisId) throw new Error('Fichier envoyé, mais identifiant d’analyse absent. Vérifiez VirusTotal avant de réessayer.');
  return { ok: true, mode: 'submitted', sha256: file.sha256, analysisId, message: 'Fichier envoyé à VirusTotal. L’analyse peut prendre plusieurs minutes. Relancez la vérification plus tard pour ouvrir le rapport.' };
}
module.exports = {
  VT_MAX_UPLOAD_BYTES, VT_SMALL_UPLOAD_BYTES, isSha256, vtFileReportUrl, vtFileSearchUrl,
  vtManualUploadUrl, normaliseUploadUrl, vtErrorMessage, inspectLocalFile, checkVirusTotalFile,
  makeUploadPrelude, uploadVirusTotalFile
};
