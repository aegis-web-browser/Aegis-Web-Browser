'use strict';
/** Independent Aegis Focus timer; no Arcade or Chat dependency. */
(function(){
  const $=id=>document.getElementById(id);
  const en=()=>!document.documentElement.lang.toLowerCase().startsWith('fr');
  const tr=(fr,eng)=>en()?eng:fr;
  const panel=document.createElement('aside');
  panel.id='aegis-focus-view';
  panel.hidden=true;
  panel.innerHTML=[
    '<div class="aegis-focus-head"><div><small>AEGIS PRODUCTIVITY</small><h2>⏱ Aegis Focus</h2></div><button type="button" id="aegis-focus-close" aria-label="Close">×</button></div>',
    '<p id="aegis-focus-intro">Concentre-toi avec un minuteur local.</p>',
    '<div class="aegis-focus-circle"><strong id="aegis-focus-time">25:00</strong><span id="aegis-focus-state">Prêt</span></div>',
    '<label id="aegis-focus-length-label" for="aegis-focus-length">Durée<select id="aegis-focus-length"><option value="15">15 min</option><option value="25" selected>25 min</option><option value="45">45 min</option><option value="60">60 min</option></select></label>',
    '<div class="aegis-focus-actions"><button type="button" class="primary-btn" id="aegis-focus-toggle">Démarrer</button><button type="button" class="secondary-btn" id="aegis-focus-reset">Réinitialiser</button></div>',
    '<button type="button" class="secondary-btn" id="aegis-focus-minimal">Mode minimal Aegis (F9)</button>',
    '<p id="aegis-focus-help">Le minuteur fonctionne hors ligne et garde le temps restant sur ce PC. Il ne bloque pas les sites.</p>'
  ].join('');
  document.body.appendChild(panel);
  const state={remaining:1500,running:false,deadline:0};
  const key='aegis-focus-timer-v2';
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'{}');
    if(Number.isInteger(saved.remaining)&&saved.remaining>=0&&saved.remaining<=3600)state.remaining=saved.remaining;
    if(saved.running&&Number.isFinite(saved.deadline)&&saved.deadline>Date.now()-3600000&&saved.deadline<Date.now()+3600000){
      state.running=true;state.deadline=saved.deadline;
      state.remaining=Math.max(0,Math.ceil((saved.deadline-Date.now())/1000));
    }
  }catch{}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
  function paint(){
    if(state.running){
      state.remaining=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));
      if(!state.remaining){state.running=false;save();}
    }
    $('aegis-focus-time').textContent=String(Math.floor(state.remaining/60)).padStart(2,'0')+':'+String(state.remaining%60).padStart(2,'0');
    $('aegis-focus-state').textContent=state.running?tr('Concentration…','Focusing…'):state.remaining?tr('En pause / prêt','Paused / ready'):tr('Terminé !','Complete!');
    $('aegis-focus-toggle').textContent=state.running?'Pause':tr('Démarrer','Start');
  }
  function localize(){
    $('aegis-focus-intro').textContent=tr('Concentre-toi avec un minuteur local.','Focus with a simple local timer.');
    $('aegis-focus-length-label').firstChild.textContent=tr('Durée','Duration');
    $('aegis-focus-reset').textContent=tr('Réinitialiser','Reset');
    $('aegis-focus-minimal').textContent=tr('Mode minimal Aegis (F9)','Minimal Aegis mode (F9)');
    $('aegis-focus-help').textContent=tr('Fonctionne hors ligne et garde le temps restant sur cet ordinateur. Ne bloque pas les sites.','Works offline and saves the remaining time on this device. Does not block websites.');
    paint();
  }
  function open(){panel.hidden=false;localize();}
  function close(){panel.hidden=true;}
  $('aegis-focus-close').addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close();});
  document.querySelector('[data-start-action="focus"]')?.addEventListener('click',event=>{
    event.stopImmediatePropagation();event.preventDefault();open();
  },true);
  $('aegis-focus-toggle').addEventListener('click',()=>{
    if(state.running)state.running=false;
    else{
      if(!state.remaining)state.remaining=Number($('aegis-focus-length').value)*60;
      state.running=true;state.deadline=Date.now()+state.remaining*1000;
    }
    save();paint();
  });
  function reset(){state.running=false;state.remaining=Number($('aegis-focus-length').value)*60;state.deadline=0;save();paint();}
  $('aegis-focus-reset').addEventListener('click',reset);
  $('aegis-focus-length').addEventListener('change',reset);
  $('aegis-focus-minimal').addEventListener('click',()=>{close();if(typeof toggleFocusMode==='function')toggleFocusMode(true);});
  setInterval(paint,1000);
  localize();
  window.AegisFocusPanel={open,close};
})();
