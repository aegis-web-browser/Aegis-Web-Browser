'use strict';
/**
 * Auto offline runner + optional "play while page loads" overlay.
 * Does not cancel navigation; no external assets, no tracking.
 */
(function(){
  const game=document.getElementById('offline-run');
  if(!game)return;
  const oldParent=game.parentNode;
  const oldSibling=game.nextSibling;
  const root=document.createElement('section');
  root.id='aegis-network-game';
  root.hidden=true;
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Aegis Run');
  root.innerHTML=[
    '<div class="aegis-network-game-box">',
    '<header class="aegis-network-game-header"><div><span class="aegis-game-tag">AEGIS RUN</span>',
    '<h2 id="aegis-game-overlay-title">Un jeu pendant la coupure</h2>',
    '<p id="aegis-game-overlay-subtitle">Pas de connexion · le jeu fonctionne hors ligne.</p></div>',
    '<button type="button" class="aegis-game-overlay-close" id="aegis-game-overlay-close" title="Fermer le mini-jeu" aria-label="Fermer">×</button>',
    '</header><div id="aegis-game-slot"></div>',
    '<div class="aegis-network-game-footer"><span id="aegis-game-overlay-hint">Espace / ↑ : sauter · ↓ : glisser · P : pause</span>',
    '<button type="button" id="aegis-game-overlay-continue">Revenir au navigateur</button></div>',
    '</div>'
  ].join('');
  document.body.appendChild(root);
  const $=id=>document.getElementById(id);
  let mode=null,offline=false,dismissedForOutage=false,wasOffline=false,probing=false,consecutiveFailed=0,slowNoticeTimer=0;
  const notice=document.createElement('aside');
  notice.id='aegis-slow-game-notice';
  notice.hidden=true;
  notice.innerHTML='<div><strong>La page met du temps à charger…</strong><span>Tu peux jouer à Aegis Run pendant le chargement.</span></div><button type="button" id="aegis-slow-game-play">Jouer en attendant</button><button type="button" id="aegis-slow-game-dismiss" aria-label="Fermer">×</button>';
  document.body.appendChild(notice);
  const en=()=>!document.documentElement.lang.toLowerCase().startsWith('fr');
  const tr=(fr,english)=>en()?english:fr;
  function updateTitles(){
    if(mode==='slow'){
      $('aegis-game-overlay-title').textContent=tr('Aegis Run · En attendant la page','Aegis Run · While you wait');
      $('aegis-game-overlay-subtitle').textContent=tr('Le chargement continue en arrière-plan.','Your page continues loading in the background.');
    } else {
      $('aegis-game-overlay-title').textContent=tr('Aegis Run · Sans connexion','Aegis Run · Offline');
      $('aegis-game-overlay-subtitle').textContent=offline?
        tr('Aucun accès Internet détecté. Tu peux jouer ici.','No Internet connection detected. You can play here.'):
        tr('Connexion rétablie · tu peux revenir à la page.','Connection restored · you can return to browsing.');
    }
    $('aegis-game-overlay-hint').textContent=tr('Espace / ↑ : sauter · ↓ : glisser · P : pause','Space / ↑: jump · ↓: duck · P: pause');
    $('aegis-game-overlay-continue').textContent=tr('Revenir au navigateur','Back to browser');
    notice.querySelector('strong').textContent=tr('La page met du temps à charger…','This page is taking a while…');
    notice.querySelector('span').textContent=tr('Tu peux jouer à Aegis Run pendant le chargement.','You can play Aegis Run while it loads.');
    $('aegis-slow-game-play').textContent=tr('Jouer en attendant','Play while waiting');
  }
  function show(nextMode){
    if(!root.hidden&&mode===nextMode)return;
    mode=nextMode;
    notice.hidden=true;
    game.hidden=false;
    $('aegis-game-slot').appendChild(game);
    root.hidden=false;
    document.body.classList.add('aegis-game-open');
    window.AegisOfflineRun?.setVisible(true,{privateMode:false});
    updateTitles();
    const canvas=document.getElementById('offline-run-canvas');
    canvas?.setAttribute('tabindex','0');
    requestAnimationFrame(()=>canvas?.focus({preventScroll:true}));
  }
  function hide(){
    if(root.hidden)return;
    if(mode==='offline'&&offline)dismissedForOutage=true;
    root.hidden=true;
    mode=null;
    document.body.classList.remove('aegis-game-open');
    window.AegisOfflineRun?.setVisible(false);
    game.hidden=true;
    if(oldSibling&&oldSibling.parentNode===oldParent)oldParent.insertBefore(game,oldSibling);
    else oldParent.appendChild(game);
  }
  function onOffline(){
    if(!wasOffline){dismissedForOutage=false;wasOffline=true;}
    offline=true;
    updateTitles();
    if(!dismissedForOutage)show('offline');
  }
  function onOnline(){
    wasOffline=false;offline=false;dismissedForOutage=false;consecutiveFailed=0;
    if(mode==='offline'&&!root.hidden)updateTitles();
  }
  async function checkNetwork(){
    if(probing||document.hidden)return;
    probing=true;
    try{
      if(navigator.onLine===false){onOffline();return;}
      const result=await window.api.networkProbe();
      if(result?.online===false){
        consecutiveFailed++;
        // Require two consecutive HTTPS probe failures to avoid a false offline state
        // if a single connectivity-test endpoint is temporarily unavailable.
        if(result.source==='link'||consecutiveFailed>=2)onOffline();
      } else if(result?.online===true) onOnline();
    }catch{ /* Unknown state: a failed probe call does not prove disconnected. */ }
    finally{probing=false;}
  }
  function offerSlow(){
    if(!root.hidden||offline)return;
    notice.hidden=false;updateTitles();
  }
  function cancelSlow(){
    clearTimeout(slowNoticeTimer);slowNoticeTimer=0;notice.hidden=true;
    if(mode==='slow'&&!root.hidden){
      $('aegis-game-overlay-subtitle').textContent=tr('La page est prête. Tu peux poursuivre la partie ou revenir.','The page is ready. Keep playing or return.');
    }
  }
  function scheduleSlow(){
    clearTimeout(slowNoticeTimer);notice.hidden=true;
    // A slow page remains loading. Never cancel or replace it.
    slowNoticeTimer=setTimeout(offerSlow,12000);
  }
  $('aegis-game-overlay-close').addEventListener('click',hide);
  $('aegis-game-overlay-continue').addEventListener('click',hide);
  $('aegis-slow-game-play').addEventListener('click',()=>show('slow'));
  $('aegis-slow-game-dismiss').addEventListener('click',()=>{notice.hidden=true;});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();hide();}});
  window.addEventListener('offline',onOffline);
  window.addEventListener('online',()=>{void checkNetwork();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkNetwork();});
  setInterval(()=>{void checkNetwork();},25000);
  // Delay until app is initialized: prevents showing over first-run onboarding.
  setTimeout(()=>{void checkNetwork();},2500);
  window.AegisRunOverlay={
    isOpen:()=>!root.hidden,
    mode:()=>mode,
    show,hide,checkNetwork,
    onLoadingStarted:scheduleSlow,onLoadingStopped:cancelSlow,
    onConnectionLost:onOffline,onConnectionRestored:onOnline
  };
  updateTitles();
})();
