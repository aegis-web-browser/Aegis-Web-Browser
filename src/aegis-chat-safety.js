'use strict';
/** Strict local pre-filter for Aegis Chat. Defence-in-depth; not an AI classifier. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AegisChatSafety = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const ROOMS = Object.freeze(['general-fr','general-en','gaming-fr','gaming-en','help-fr','help-en']);
  const MAX_TEXT = 280, MAX_NAME = 24, MAX_PACKET = 1800, MAX_SIGNAL = 85000;
  const forbidden = [
    /https?:|www\.|(?:discord\.gg|t\.me|bit\.ly|tinyurl\.)/i,
    /[<>{}\u0000-\u001f\u007f]/u,
    /(?:\b(?:javascript|vbscript|data|file):|onerror\s*=|onload\s*=|eval\s*\(|function\s*\(|(?:sudo|powershell|cmd\.exe)\b)/i,
    /(?:\*\*|__|\x60{3}|&#x?[a-f0-9]+;)/i
  ];
  const abusive = [
    // Deliberately conservative FR/EN examples; the list is not exhaustive.
    /\b(?:fuck|fucking|motherfuck\w*|bitch(?:es)?|asshole|dickhead|shithead|cunt|pussy|porn(?:ography|ographic)?|hentai|xxx|nudes?|sexting|rape|rapist|nazi(?:s)?|kill\s+yourself)\b/i,
    /\b(?:pute(?:s)?|putain|connard(?:s)?|connasse(?:s)?|salope(?:s)?|encule(?:s)?|enfoir(?:e|es|e?s)?|fdp|ntm|nique|bordel|merde|porno(?:graphie|graphique)?|sexe\s+explicite|viol(?:er|eur|ence\s+sexuelle)?|suicide-toi)\b/i,
    /\b(?:idiot|stupid|moron|dumbass|imbecile|debile|abruti|cretin)\b/i
  ];
  function normalize(text) {
    return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[013457@!$]/g, c => ({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','!':'i','$':'s'})[c] || c)
      .replace(/[\u200b-\u200f\u2060\ufeff]/g, '').replace(/(.)\1{3,}/g,'$1$1');
  }
  function validateText(text) {
    if (typeof text !== 'string') return {allowed:false, reason:'invalid-type'};
    const raw = text.trim();
    if (!raw || raw.length > MAX_TEXT) return {allowed:false, reason:'length'};
    if (forbidden.some(re => re.test(raw))) return {allowed:false, reason:'links-code-markup'};
    const words = normalize(raw);
    if (abusive.some(re => re.test(words))) return {allowed:false, reason:'abusive-content'};
    if (/\S{70,}/.test(raw) || /[\u200b-\u200f\u2060\ufeff]/.test(raw)) return {allowed:false, reason:'obfuscated'};
    return {allowed:true, text:raw};
  }
  function validateName(value) {
    if (typeof value !== 'string') return null;
    const name = value.trim();
    if (!name || name.length > MAX_NAME || /[<>{}\u0000-\u001f]/.test(name) || forbidden.some(re=>re.test(name)) || abusive.some(re=>re.test(normalize(name)))) return null;
    return name;
  }
  function validatePacket(raw, room) {
    if (typeof raw !== 'string' || raw.length > MAX_PACKET) return null;
    let packet;
    try { packet = JSON.parse(raw); } catch { return null; }
    if (!packet || typeof packet !== 'object' || Array.isArray(packet) || Object.keys(packet).length !== 5) return null;
    if (packet.v !== 1 || packet.kind !== 'text' || packet.room !== room || !ROOMS.includes(room)) return null;
    const name = validateName(packet.name);
    const content = validateText(packet.text);
    if (!name || !content.allowed) return null;
    return {name, text:content.text, room};
  }
  function signalValid(token, kind) {
    if (typeof token !== 'string' || token.length > MAX_SIGNAL) return null;
    let data; try { data = JSON.parse(token.trim()); } catch { return null; }
    if (!data || data.v !== 1 || data.kind !== kind || !ROOMS.includes(data.room) || !/^[a-f0-9-]{16,64}$/i.test(data.id || '')) return null;
    const description = data.description;
    if (!description || description.type !== kind || typeof description.sdp !== 'string' || description.sdp.length < 32 || description.sdp.length > 70000 || !description.sdp.startsWith('v=0')) return null;
    return {v:1,kind,room:data.room,id:data.id,description:{type:kind,sdp:description.sdp}};
  }
  return {ROOMS,MAX_TEXT,MAX_PACKET,validateText,validateName,validatePacket,signalValid,normalize};
});
