'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('Aegis Start remains hidden unless the renderer marks it with .show',()=>{
  const responsive=fs.readFileSync(path.join(__dirname,'../src/aegis-features.css'),'utf8');
  const baseline=fs.readFileSync(path.join(__dirname,'../src/style.css'),'utf8');
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer.js'),'utf8');

  // Baseline contract: .start-page is display:none by default; .show opens it.
  assert.match(baseline,/\.start-page,\.browser-error\s*\{[^}]*display:none/);
  assert.match(baseline,/\.start-page\.show,\.browser-error\.show\s*\{[^}]*display:grid/);
  assert.match(responsive,/\.start-page:not\(\.show\)\s*\{\s*display:none\s*!important\s*;\s*pointer-events:none\s*!important\s*;/);
  assert.match(responsive,/\.start-page\.show\s*\{\s*display:block\s*!important\s*;/);
  assert.doesNotMatch(responsive,/\.start-page\s*\{\s*display:\s*(?:block|grid|flex)\s*!important\s*;/);
  assert.match(renderer,/start\?\.classList\.toggle\('show', showStart\)/);
});
