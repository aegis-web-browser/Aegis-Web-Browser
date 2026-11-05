'use strict';
/** Aegis Hub: Focus timer, daily official-offers discovery, Arcade and P2P Chat. */
(function () {
  const root=document.createElement('div');
  root.id='aegis-hub';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Aegis Hub');
  root.innerHTML=[
    '<div class="hub-shell">',
    ' <header class="hub-header"><div class="hub-logo">✦</div><div><b>Aegis Hub</b><small id="hub-subtitle">Focus · Deals · Arcade · Chat</small></div><button type="button" class="hub-close" id="hub-close" aria-label="Close">×</button></header>',
    ' <nav class="hub-tabs" role="tablist">',
    ' <button type="button" data-hub-tab="focus" class="selected">⏱ Focus</button>',
    ' <button type="button" data-hub-tab="deals">✦ Deals / Bons plans</button>',
    ' <button type="button" data-hub-tab="arcade">✹ Arcade</button>',
    ' <button type="button" data-hub-tab="chat">◇ Chat P2P</button>',
    ' </nav>',
    ' <div class="hub-content">',
    ' <section data-hub-pane="focus" class="hub-pane selected"><div class="hub-section-head"><h2>Aegis Focus</h2><p id="hub-focus-description">Un minuteur local pour rester concentré. Aucune connexion nécessaire.</p></div>',
    '  <div class="hub-focus-card"><div id="hub-focus-ring"><strong id="hub-focus-clock">25:00</strong><small id="hub-focus-status">Prêt</small></div>',
    '  <label class="hub-label" for="hub-focus-duration" id="hub-focus-length-label">Durée de session</label>',
    '  <select id="hub-focus-duration"><option value="15">15 min</option><option value="25" selected>25 min</option><option value="45">45 min</option><option value="60">60 min</option></select>',
    '  <div class="hub-inline-buttons"><button type="button" id="hub-focus-play" class="hub-primary">Démarrer</button><button type="button" id="hub-focus-reset">Réinitialiser</button><button type="button" id="hub-focus-minimal">Interface Focus (F9)</button></div></div>',
    '  <p class="hub-info" id="hub-focus-note">Le minuteur fonctionne localement, même hors connexion, et conserve le temps restant sur cet appareil.</p>',
    ' </section>',
    ' <section data-hub-pane="deals" class="hub-pane"><div class="hub-section-head"><h2 id="hub-deal-heading">Le bon plan du jour</h2><p id="hub-deal-intro">Une piste différente chaque jour vers les offres officielles, sans publicité ni liens affiliés.</p></div>',
    '  <div class="hub-deal-card"><span class="hub-deal-date" id="hub-deal-date"></span><span class="hub-kicker" id="hub-deal-category"></span><h3 id="hub-deal-title"></h3><p id="hub-deal-description"></p><button id="hub-deal-open" type="button" class="hub-primary">Découvrir sur le site officiel</button></div>',
    '  <p class="hub-info" id="hub-deal-disclaimer">Les prix et disponibilités peuvent changer. Aegis ne garantit aucune offre spécifique : vérifie toujours sur le site officiel.</p>',
    ' </section>',
    ' <section data-hub-pane="arcade" class="hub-pane"><div class="hub-section-head"><h2>Aegis Arcade</h2><p id="hub-arcade-intro">Des jeux gratuits intégrés, jouables entièrement hors connexion.</p></div>',
    '  <div class="hub-arcade-grid"><article class="hub-arcade-card"><h3>🧠 Memory</h3><p id="hub-memory-description">Retrouve les 8 paires.</p><div class="hub-memory-meta" id="hub-memory-score">Coups : 0</div><div id="hub-memory-board" class="hub-memory-board"></div><button type="button" id="hub-memory-new">Nouvelle partie</button></article>',
    '   <article class="hub-arcade-card"><h3>⚡ Reflex</h3><p id="hub-reflex-description">Attends le vert, puis clique le plus vite possible.</p><div id="hub-reflex-best" class="hub-memory-meta">Record : —</div><button type="button" id="hub-reflex-button" class="hub-reflex-button">Démarrer</button><div id="hub-reflex-status" class="hub-arcade-message" role="status"></div></article></div>',
    '  <div class="hub-run-card"><div><h3>🤖 Aegis Run</h3><p id="hub-run-description">Le runner avec obstacles, drones, étoiles et meilleur score.</p></div><button type="button" id="hub-run-open">Jouer à Aegis Run</button></div><div id="hub-arcade-run"></div>',
    ' </section>',
    ' <section data-hub-pane="chat" class="hub-pane"><div class="hub-section-head"><h2>Aegis Chat — P2P</h2><p id="hub-chat-intro">Salons privés FR / EN sur invitation. Sans serveur de messages ni compte. Connexion manuelle entre participants.</p></div>',
    '  <div class="hub-warning" id="hub-chat-warning">🔒 Mode expérimental : la modération IA locale doit être installée. Tous les messages entrants et sortants sont bloqués si elle est indisponible. Aucune modération ne peut garantir une sécurité absolue.</div>',
    '  <div class="hub-chat-fields"><label>Salon<select id="hub-chat-room"><option value="general-fr">🇫🇷 Général</option><option value="general-en">🇬🇧 General</option><option value="gaming-fr">🇫🇷 Gaming</option><option value="gaming-en">🇬🇧 Gaming</option><option value="help-fr">🇫🇷 Entraide</option><option value="help-en">🇬🇧 Help</option></select></label><label>Pseudo / Nickname<input id="hub-chat-name" maxlength="24" autocomplete="off" spellcheck="false"/></label></div>',
    '  <label class="hub-chat-stun"><input type="checkbox" id="hub-chat-stun"/><span id="hub-chat-stun-label">Autoriser un serveur STUN externe pour les connexions Internet (peut exposer des métadonnées réseau/IP aux participants et au service STUN)</span></label>',
    '  <div class="hub-chat-invitations"><div><button type="button" id="hub-chat-make">1. Créer une invitation</button><textarea id="hub-chat-invite" rows="2" readonly placeholder="Invitation à copier"></textarea><button type="button" id="hub-chat-invite-copy">Copier invitation</button></div>',
    '  <div><label id="hub-chat-paste-label">2. Colle une invitation reçue OU une réponse</label><textarea id="hub-chat-paste" rows="2" spellcheck="false" maxlength="85000" placeholder="Coller ici le code reçu"></textarea><div class="hub-inline-buttons"><button type="button" id="hub-chat-join">Accepter invitation</button><button type="button" id="hub-chat-confirm">Confirmer réponse</button></div></div>',
    '  <div><label id="hub-chat-answer-label">3. Réponse à renvoyer au créateur du salon</label><textarea id="hub-chat-response" rows="2" readonly></textarea><button type="button" id="hub-chat-response-copy">Copier réponse</button></div></div>',
    '  <div class="hub-chat-connected"><span id="hub-chat-peers">Participants connectés : 0</span><button type="button" id="hub-chat-close-peers">Déconnecter tous</button></div><div id="hub-chat-peer-list"></div>',
    '  <div class="hub-chat-history" id="hub-chat-history" role="log" aria-live="polite"></div><div class="hub-chat-compose"><textarea id="hub-chat-input" maxlength="280" rows="2" placeholder="Message texte uniquement, sans lien ni fichier…"></textarea><button type="button" id="hub-chat-send" class="hub-primary">Envoyer</button></div>',
    '  <div class="hub-arcade-message" id="hub-chat-status" role="status"></div>',
    '  <p class="hub-info" id="hub-chat-disclaimer">Les salons ne sont PAS publics : chaque participant échange manuellement une invitation et une réponse. Maximum 5 pairs. Pas de fichiers, liens ou historique serveur. Pour des salons publics automatiques : signalisation, modération centrale et supervision restent indispensables.</p>',
    ' </section></div></div>'
  ].join('');
  document.body.appendChild(root);
  const $=id=>document.getElementById(id);
  const en=()=>!document.documentElement.lang.toLowerCase().startsWith('fr');
  const text=(fr,eng)=>en()?eng:fr;
  const button=document.createElement('button');
  button.id='aegis-hub-open';
  button.className='icon-btn aegis-hub-trigger';
  button.type='button';
  button.textContent='✦ Hub';
  button.title='Aegis Hub — Focus, deals, Arcade, Chat';
  document.querySelector('.tools-group')?.appendChild(button);
  let activePane='focus', runnerMounted=false;
  const runner=$('offline-run'), errorPanel=$('error-page'), errorActions=errorPanel?.querySelector('.browser-error-actions');
  function restoreRunner() {
    if (!runnerMounted || !runner || !errorPanel || !errorActions) return;
    window.AegisOfflineRun?.setVisible(false);
    runner.hidden=true;
    errorPanel.insertBefore(runner,errorActions);
    runnerMounted=false;
    if(errorPanel.classList.contains('show')&&errorPanel.classList.contains('offline-mode')){
      runner.hidden=false;
      window.AegisOfflineRun?.setVisible(true,{privateMode:Boolean(document.body.classList.contains('private-mode'))});
    }
  }
  function selectPane(next) {
    if(next!=='arcade')restoreRunner();
    activePane=next;
    root.querySelectorAll('[data-hub-pane]').forEach(el=>el.classList.toggle('selected',el.dataset.hubPane===next));
    root.querySelectorAll('[data-hub-tab]').forEach(el=>el.classList.toggle('selected',el.dataset.hubTab===next));
  }
  function open(){root.hidden=false;document.body.classList.add('hub-open');updateLanguage();selectPane(activePane);}
  function close(){restoreRunner();root.hidden=true;document.body.classList.remove('hub-open');}
  button.addEventListener('click',open);
  $('hub-close').addEventListener('click',close);
  root.querySelectorAll('[data-hub-tab]').forEach(el=>el.addEventListener('click',()=>selectPane(el.dataset.hubTab)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!root.hidden){event.stopPropagation();close();}});
  const focusKey='aegis-hub-focus-v1';
  const focus={remaining:1500,deadline:0,running:false};
  try { const saved=JSON.parse(localStorage.getItem(focusKey)||'{}');
    if(saved && [900,1500,2700,3600].includes(saved.remaining) && !saved.running)focus.remaining=saved.remaining;
    if(saved && saved.running && Number.isFinite(saved.deadline) && saved.deadline>Date.now()-3600000 && saved.deadline<Date.now()+3600000){
      focus.running=true; focus.deadline=saved.deadline;
      focus.remaining=Math.max(0,Math.ceil((focus.deadline-Date.now())/1000));
    }
  }catch {}
  function saveFocus(){
    try{localStorage.setItem(focusKey,JSON.stringify(focus));}catch {}
  }
  function focusRefresh(){
    if(focus.running){
      focus.remaining=Math.max(0,Math.ceil((focus.deadline-Date.now())/1000));
      if(!focus.remaining){focus.running=false;$('hub-focus-status').textContent=text('Session terminée !','Session complete!');saveFocus();}
    }
    const mm=String(Math.floor(focus.remaining/60)).padStart(2,'0'),ss=String(focus.remaining%60).padStart(2,'0');
    $('hub-focus-clock').textContent=mm+':'+ss;
    if(focus.remaining)$('hub-focus-status').textContent=focus.running?text('Concentration…','Focusing…'):text('Prêt / en pause','Ready / paused');
    $('hub-focus-play').textContent=focus.running?text('Pause','Pause'):text('Démarrer','Start');
  }
  $('hub-focus-duration').addEventListener('change',()=>{
    focus.running=false;focus.deadline=0;focus.remaining=Number($('hub-focus-duration').value)*60;saveFocus();focusRefresh();
  });
  $('hub-focus-play').addEventListener('click',()=>{
    if(focus.running)focus.running=false;
    else {if(!focus.remaining)focus.remaining=Number($('hub-focus-duration').value)*60;focus.running=true;focus.deadline=Date.now()+focus.remaining*1000;}
    saveFocus();focusRefresh();
  });
  $('hub-focus-reset').addEventListener('click',()=>{
    focus.running=false;focus.deadline=0;focus.remaining=Number($('hub-focus-duration').value)*60;saveFocus();focusRefresh();
  });
  $('hub-focus-minimal').addEventListener('click',()=>{close();if(typeof toggleFocusMode==='function')toggleFocusMode(true);});
  setInterval(focusRefresh,1000);
  focusRefresh();

  // Curated official destinations. This is NOT a verified real-time deal feed.
  const deals=[
    {category:'JEUX',title:'Jeux offerts sur Epic Games',description:'Explore les jeux gratuits proposés sur la boutique officielle. Leur disponibilité change régulièrement.',url:'https://store.epicgames.com/fr/free-games'},
    {category:'JEUX',title:'Free-to-play sur Steam',description:'Découvre des jeux jouables gratuitement sur Steam, et vérifie les éventuelles promotions actuelles.',url:'https://store.steampowered.com/genre/Free%20to%20Play/'},
    {category:'JEUX INDÉS',title:'Jeux gratuits sur itch.io',description:'Une sélection de créations indépendantes disponibles gratuitement.',url:'https://itch.io/games/free'},
    {category:'LOGICIELS',title:'Projets open source sur GitHub',description:'Découvre de nouveaux outils gratuits et vérifie leur licence avant installation.',url:'https://github.com/topics/open-source'},
    {category:'JEUX',title:'Jeux gratuits sur GOG',description:'Explore les jeux gratuits de la boutique GOG et vérifie les offres en cours.',url:'https://www.gog.com/partner/free_games'}
  ];
  const day=Math.floor(Date.now()/86400000);
  const selection=deals[((day%deals.length)+deals.length)%deals.length];
  $('hub-deal-title').textContent=selection.title;
  $('hub-deal-category').textContent=selection.category;
  $('hub-deal-description').textContent=selection.description;
  $('hub-deal-date').textContent=new Date().toLocaleDateString(en()?'en-GB':'fr-FR',{weekday:'long',day:'numeric',month:'long'});
  $('hub-deal-open').addEventListener('click',()=>{
    // This URL is a hardcoded, reviewed official destination; no peer/content URL is ever opened.
    if(typeof createTab==='function'){close();createTab(selection.url);}
  });

  const gameEmoji=['◆','★','✦','♟','☀','☂','♫','✿'];
  let cards=[],selected=[],moves=0,matches=0,memoryBusy=false, memoryTimeout=0;
  function memoryNew(){
    clearTimeout(memoryTimeout);memoryBusy=false;selected=[];moves=0;matches=0;
    const values=[...gameEmoji,...gameEmoji];
    for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
    cards=values.map((value,index)=>({value,index,up:false,matched:false}));
    memoryPaint();
  }
  function memoryPaint(){
    const board=$('hub-memory-board');board.replaceChildren();
    for(const card of cards){
      const tile=document.createElement('button');tile.type='button';
      tile.className='hub-memory-tile'+(card.up||card.matched?' revealed':'')+(card.matched?' matched':'');
      tile.textContent=card.up||card.matched?card.value:'?';
      tile.disabled=card.matched||memoryBusy;
      tile.setAttribute('aria-label',card.matched?'Matched card':'Memory card '+(card.index+1));
      tile.addEventListener('click',()=>memoryFlip(card.index));board.appendChild(tile);
    }
    $('hub-memory-score').textContent=text('Coups : ','Moves: ')+moves+(matches===8?text(' · Gagné !',' · You win!'):'');
  }
  function memoryFlip(index){
    const card=cards[index];
    if(memoryBusy||!card||card.up||card.matched||selected.length>=2)return;
    card.up=true;selected.push(card);memoryPaint();
    if(selected.length===2){
      moves++;
      if(selected[0].value===selected[1].value){
        selected.forEach(item=>item.matched=true);selected=[];matches++;memoryPaint();
      }else{
        memoryBusy=true;memoryPaint();
        memoryTimeout=setTimeout(()=>{selected.forEach(item=>item.up=false);selected=[];memoryBusy=false;memoryPaint();},850);
      }
    }
  }
  $('hub-memory-new').addEventListener('click',memoryNew);memoryNew();

  let reflexState='idle',reflexStart=0,reflexTimer=0;
  const bestKey='aegis-reflex-best-v1';
  function reflexBest(value) {
    const old=Number(localStorage.getItem(bestKey))||0;
    if(value&&(!old||value<old)){try{localStorage.setItem(bestKey,String(value));}catch{}}
    const current=Number(localStorage.getItem(bestKey))||0;
    $('hub-reflex-best').textContent=text('Record : ','Best: ')+(current?current+' ms':'—');
  }
  reflexBest(0);
  $('hub-reflex-button').addEventListener('click',()=>{
    const b=$('hub-reflex-button');
    if(reflexState==='idle'||reflexState==='done'){
      clearTimeout(reflexTimer);reflexState='waiting';b.className='hub-reflex-button waiting';b.textContent=text('Attends…','Wait…');$('hub-reflex-status').textContent=text('Ne clique pas avant le vert !','Wait for green!');
      reflexTimer=setTimeout(()=>{reflexState='ready';reflexStart=performance.now();b.className='hub-reflex-button ready';b.textContent=text('CLIQUE !','CLICK!');},1700+Math.random()*2700);
    }else if(reflexState==='waiting'){
      clearTimeout(reflexTimer);reflexState='done';b.className='hub-reflex-button';b.textContent=text('Réessayer','Try again');$('hub-reflex-status').textContent=text('Trop tôt !','Too early!');
    }else if(reflexState==='ready'){
      const time=Math.round(performance.now()-reflexStart);
      reflexState='done';b.className='hub-reflex-button';b.textContent=text('Rejouer','Play again');
      $('hub-reflex-status').textContent=time+' ms';reflexBest(time);
    }
  });
  $('hub-run-open').addEventListener('click',()=>{
    if(!runner||!errorActions)return;
    runnerMounted=true;$('hub-arcade-run').appendChild(runner);
    runner.hidden=false;
    window.AegisOfflineRun?.setVisible(true,{privateMode:Boolean(document.body.classList.contains('private-mode'))});
    $('hub-run-open').textContent=text('Jeu activé ci-dessous','Game activated below');
  });

  const staticText={
    'hub-focus-description':['Un minuteur local pour rester concentré. Aucune connexion nécessaire.','A local timer for focused work. Works offline.'],
    'hub-focus-length-label':['Durée de session','Session length'],
    'hub-focus-reset':['Réinitialiser','Reset'],
    'hub-focus-minimal':['Interface Focus (F9)','Focus interface (F9)'],
    'hub-focus-note':['Le minuteur reste local et conserve le temps restant sur cet appareil.','The timer is local and saves your remaining time on this device.'],
    'hub-deal-heading':['Le bon plan du jour','Daily deal discovery'],
    'hub-deal-intro':['Chaque jour, découvre une destination officielle pour des jeux ou outils gratuits.','Discover a new official destination for free games or tools each day.'],
    'hub-deal-open':['Découvrir sur le site officiel','View on official website'],
    'hub-deal-disclaimer':['Les prix et disponibilités peuvent changer. Aegis ne garantit aucune offre spécifique : vérifie sur le site officiel.','Prices and availability change. No specific offer is guaranteed: always check the official website.'],
    'hub-arcade-intro':['Des jeux gratuits intégrés, jouables entièrement hors connexion.','Built-in games, fully playable offline.'],
    'hub-memory-description':['Retrouve les 8 paires.','Match all 8 pairs.'],
    'hub-memory-new':['Nouvelle partie','New game'],
    'hub-reflex-description':['Attends le vert, puis clique le plus vite possible.','Wait for green, then click as fast as possible.'],
    'hub-run-description':['Le runner avec obstacles, drones, étoiles et meilleur score.','A runner with hazards, drones, stars and a high score.'],
    'hub-run-open':['Jouer à Aegis Run','Play Aegis Run'],
    'hub-chat-intro':['Salons FR / EN sur invitation. Sans serveur de messages ni compte.','FR / EN invite-only rooms. No message server or account.'],
    'hub-chat-warning':['🔒 Expérimental : une IA locale installée est obligatoire pour tous les messages. Messages bloqués si IA indisponible. Aucune modération ne garantit une protection absolue.','🔒 Experimental: installed local AI is required for every message. AI unavailable = messages blocked. No filter guarantees absolute safety.'],
    'hub-chat-stun-label':['Autoriser un serveur STUN externe (les informations de réseau/IP peuvent être révélées au service et aux pairs)','Allow external STUN server (may reveal network/IP metadata to service and peers)'],
    'hub-chat-paste-label':['2. Colle une invitation OU une réponse','2. Paste an invitation OR answer'],
    'hub-chat-answer-label':['3. Réponse à renvoyer au créateur du salon','3. Reply to send back to room creator'],
    'hub-chat-make':['1. Créer une invitation','1. Create invite'],
    'hub-chat-join':['Accepter invitation','Accept invite'],
    'hub-chat-confirm':['Confirmer réponse','Confirm reply'],
    'hub-chat-invite-copy':['Copier invitation','Copy invite'],
    'hub-chat-response-copy':['Copier réponse','Copy reply'],
    'hub-chat-close-peers':['Déconnecter tous','Disconnect all'],
    'hub-chat-send':['Envoyer','Send'],
    'hub-chat-disclaimer':['Salons privés seulement : échanges manuels des invitations/réponses, 5 pairs au maximum, sans liens, images ni fichiers. Des salons publics automatiques nécessiteraient une signalisation, modération centrale et supervision.','Private rooms only: manually exchange invite/reply tokens, 5 peers max, no links, images or files. Public rooms require signaling, server moderation and oversight.']
  };
  function updateLanguage() {
    for(const [id,values] of Object.entries(staticText)){const el=$(id);if(el)el.textContent=en()?values[1]:values[0];}
    focusRefresh();
  }
  window.AegisChat?.init();
  updateLanguage();
})();
