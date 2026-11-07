'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { clipboardPermissionAllowed, isSecureWebOrigin } = require('../lib/clipboard-permissions');

function guest(url = 'https://example.org/'){
  return { getType: ()=>'webview', getURL:()=>url, isDestroyed:()=>false };
}
const shell = {getType:()=> 'window', getURL:()=> 'file:///app/index.html', isDestroyed:()=>false};

test('Copy buttons are permitted for HTTPS webpages in an Aegis webview',()=>{
  assert.equal(clipboardPermissionAllowed(guest(),'clipboard-sanitized-write','https://example.org/'),true);
  assert.equal(clipboardPermissionAllowed(guest('https://docs.example.org/'),'clipboard-sanitized-write',null),true);
  assert.equal(clipboardPermissionAllowed(guest('https://example.org/'),'clipboard-sanitized-write','https://cdn.example.org/iframe'),true);
});
test('No website gets clipboard-read or unsanitized clipboard-write permission',()=>{
  for(const permission of ['clipboard-read','clipboard-write','clipboard-unsanitized-write','media','geolocation','notifications']){
    assert.equal(clipboardPermissionAllowed(guest(),permission,'https://example.org/'),false,permission);
  }
});
test('Only isolated guest webviews can be granted copy permission',()=>{
  assert.equal(clipboardPermissionAllowed(shell,'clipboard-sanitized-write','https://example.org/'),false);
  assert.equal(clipboardPermissionAllowed(null,'clipboard-sanitized-write','https://example.org/'),false);
  assert.equal(clipboardPermissionAllowed({getType:()=> 'webview',isDestroyed:()=>true},'clipboard-sanitized-write','https://example.org/'),false);
});
test('Insecure document and frame origins are rejected even if embedding page is HTTPS',()=>{
  for(const origin of ['http://example.org/','file:///etc/passwd','data:text/html,hello','javascript:alert(1)','blob:https://example.org/x','',null]){
    assert.equal(isSecureWebOrigin(origin),false,String(origin));
  }
  assert.equal(clipboardPermissionAllowed(guest(),'clipboard-sanitized-write','http://insecure.example.org/'),false);
  assert.equal(clipboardPermissionAllowed(guest(),'clipboard-sanitized-write','file:///test'),false);
});
test('Local development loopback retains standard Chromium secure-context behavior',()=>{
  for(const host of ['localhost:3000','127.0.0.1:8123','[::1]:9000']){
    assert.equal(isSecureWebOrigin('http://'+host+'/'),true,host);
  }
});
test('Electron main process wires both permission handlers and never auto grants read',()=>{
  const main=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
  assert.match(main,/setPermissionCheckHandler\(\(contents, permission, requestingOrigin, details\)/);
  assert.match(main,/setPermissionRequestHandler\(\(contents, permission, callback, details\)/);
  assert.match(main,/clipboardPermissionAllowed\(contents, permission, requestingOrigin, details\)/);
  assert.match(main,/clipboardPermissionAllowed\(contents, permission, details\?\.requestingUrl, details\)/);
  assert.doesNotMatch(main,/app\.commandLine\.appendSwitch\('deny-permission-prompts'\)/);
  assert.match(main,/configureSilentPermissions\(mainWindow\.webContents\.session\)/);
});
