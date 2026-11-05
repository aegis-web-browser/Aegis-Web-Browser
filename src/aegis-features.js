'use strict';
/* Independent Aegis features: Start deals, Focus timer, Arcade games, Chat rooms. */
(function(){
  const $=id=>document.getElementById(id);
  const en=()=>!document.documentElement.lang.startsWith('fr');
  const tr=(fr,eng)=>en()?eng:fr;
  const focus=document.createElement('aside');
  focus.id='aegis-focus-view';focus.className='aegis-feature-view aegis-feature-drawer';focus.hidden=true;
  focus.innerHTML=[
    '<div class="aegis-feature-head"><div><small>AEGIS PRODUCTIVITY</small><h2>⏱ Aegis Focus</h2></div><button id="aegis-focus-close" aria-label="Close">×</button></div>',
    '<p id="aegis-focus-desc">Un espace pour te concentrer, avec un minuteur local et un mode minimal.</p>',
    '<div class="aegis-timer"><div class="aegis-timer-circle"><strong id="aegis-timer-clock">25:00</strong><span id="aegis-timer-state">Prêt</span></div></div>',
    '<label class="aegis-feature-label" for="aegis-timer-length" id="aegis-timer-caption">Durée de concentration</label>',
    '<select id="aegis-timer-length"><option value="15">15 min</option><option value="25" selected>25 min</option><option value="45">45 min</option><option value="60">60 min</option></select>',
    '<div class="aegis-feature-actions"><button id="aegis-timer-toggle" class="primary">Démarrer</button><button id="aegis-timer-reset">Réinitialiser</button></div>',
    '<button id="aegis-focus-minimal" class="aegis-feature-wide">Activer le mode Focus du navigateur (F9)</button>',
    '<p id="aegis-focus-footnote">Le minuteur fonctionne hors connexion. Il ne bloque pas les sites ni les notifications.</p>'
  ].join('');
  const arcade=document.createElement('section');
  arcade.id='aegis-arcade-view';arcade.className='aegis-feature-view aegis-feature-full';arcade.hidden=true;
  arcade.innerHTML=[
    '<header class="aegis-feature-head"><div><small>PLAY OFFLINE</small><h2>✦ Aegis Arcade</h2><p id="aegis-arcade-desc">Des jeux indépendants et gratuits, jouables sans connexion.</p></div><button id="aegis-arcade-close" aria-label="Close">×</button></header>',
    '<div class="aegis-arcade-grid">',
    '<article class="aegis-game-card"><div class="aegis-game-icon">◇</div><h3>Memory</h3><p id="aegis-memory-help">Retrouve les 8 paires.</p><small id="aegis-memory-counter">Coups : 0</small><div id="aegis-memory-board" class="aegis-memory-board"></div><button id="aegis-memory-reset">Nouvelle partie</button></article>',
    '<article class="aegis-game-card"><div class="aegis-game-icon">⚡</div><h3>Reflex</h3><p id="aegis-reflex-help">Attends le vert avant de cliquer !</p><small id="aegis-reflex-record">Record : —</small><button id="aegis-reflex-play" class="aegis-reflex-btn">Démarrer</button><p id="aegis-reflex-result"></p></article>',
    '<article class="aegis-game-card aegis-arcade-run-card"><div class="aegis-game-icon">🤖</div><h3>Aegis Run</h3><p id="aegis-run-help">Saute les obstacles, esquive les drones et bats ton record.</p><button id="aegis-run-launch">Jouer à Aegis Run</button></article>',
    '</div><div id="aegis-run-stage"></div>'
  ].join('');
  const chat=document.createElement('section');
  chat.id='aegis-chat-view';chat.className='aegis-feature-view aegis-feature-full';chat.hidden=true;
  chat.innerHTML=[
    '<header class="aegis-feature-head"><div><small>COMMUNITY / P2P BETA</small><h2>◇ Aegis Chat</h2><p id="aegis-chat-subhead">Salons français et anglais · Choisis un salon puis Rejoindre</p></div><button id="aegis-chat-close" aria-label="Close">×</button></header>',
    '<div class="aegis-chat-layout">',
    '<nav class="aegis-chat-sidebar"><b id="aegis-chat-rooms-label">SALONS</b><div id="aegis-chat-rooms"></div>',
    '<div class="aegis-chat-server"><details id="aegis-chat-advanced"><summary id="aegis-chat-advanced-label">⚙ Configuration avancée</summary><label for="aegis-chat-server" id="aegis-chat-server-label">Service de connexion</label><input id="aegis-chat-server" type="url" placeholder="wss://chat.example.com" spellcheck="false"/><p id="aegis-chat-server-hint">Nécessite un service WSS configuré pour rejoindre les salons. Aucun n’est encore déployé.</p></details></div></nav>',
    '<div class="aegis-chat-main"><div class="aegis-chat-room-head"><div><h3 id="aegis-chat-room-title">Choisis un salon</h3><span id="aegis-chat-participants"></span></div><button id="aegis-chat-leave" disabled>Quitter</button></div>',
    '<div class="aegis-chat-safety"><strong id="aegis-chat-rule-title">Modération locale stricte</strong><p id="aegis-chat-rule-desc">IA locale installée obligatoire pour envoyer et lire des messages. Texte uniquement, pas de liens, pièces jointes ou HTML. Les filtres ne sont pas infaillibles.</p><button id="aegis-chat-ai">Configurer Aegis AI local</button></div>',
    '<div id="aegis-chat-log" class="aegis-chat-log" role="log" aria-live="polite"><div class="aegis-chat-empty" id="aegis-chat-empty">Choisis un salon dans la liste pour commencer.</div></div>',
    '<div class="aegis-chat-compose"><input id="aegis-chat-nick" maxlength="24" spellcheck="false" placeholder="Pseudo"/><textarea id="aegis-chat-input" maxlength="280" rows="2" placeholder="Ton message…"></textarea><button id="aegis-chat-send" disabled>Envoyer</button></div>',
    '<div id="aegis-chat-status" role="status">Service de signalisation non configuré.</div>',
    '</div></div>'
  ].join('');
  document.body.append(focus,arcade,chat);
  const views={focus,arcade,chat}; let active=null;
  const runner=$('offline-run'),errorPage=$('error-page'),errorActions=errorPage?.querySelector('.browser-error-actions');
  let runnerMoved=false,reflexTimer=0;
  function restoreRunner(){
    if(!runnerMoved||!runner||!errorActions)return;
    runnerMoved=false;
    window.AegisOfflineRun?.setVisible(false);runner.hidden=true;
    errorPage.insertBefore(runner,errorActions);
    if(errorPage.classList.contains('show')&&errorPage.classList.contains('offline-mode')){
      runner.hidden=false;
      window.AegisOfflineRun?.setVisible(true,{privateMode:document.body.classList.contains('private-mode')});
    }
  }
  function close(name){
    if(!name)name=active;
    if(name==='arcade')restoreRunner();
    if(views[name])views[name].hidden=true;
    if(active===name)active=null;
    document.body.classList.toggle('aegis-feature-open',Boolean(active));
  }
  function open(name){
    if(!views[name])return;
    if(active)close(active);
    active=name;views[name].hidden=false;
    document.body.classList.add('aegis-feature-open');
    localize();
  }
  function addToolbar(name,title,icon){
    const button=document.createElement('button');
    button.type='button';button.className='icon-btn aegis-feature-shortcut';
    button.title=title;button.setAttribute('aria-label',title);button.textContent=icon;
    button.addEventListener('click',()=>open(name));
    document.querySelector('.tools-group')?.appendChild(button);
  }
  addToolbar('focus','Aegis Focus','⏱');
  addToolbar('arcade','Aegis Arcade','✹');
  addToolbar('chat','Aegis Chat','Chat');
  for(const name of Object.keys(views))$(name==='focus'?'aegis-focus-close':'aegis-'+name+'-close').addEventListener('click',()=>close(name));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&active){event.preventDefault();close(active);}
  });

  // Daily discovery is placed ONLY on Aegis Start and never advertised as a verified promotion.
  const destinations=[
    {title:'Epic Games · Free Games',type:'JEUX',description:'Découvre les jeux offerts en ce moment, directement chez Epic Games.',url:'https://store.epicgames.com/fr/free-games'},
    {title:'itch.io · Free Games',type:'JEUX INDÉPENDANTS',description:'Explore des jeux indés accessibles gratuitement sur itch.io.',url:'https://itch.io/games/free'},
    {title:'Steam · Free to Play',type:'JEUX',description:'Découvre la rubrique des jeux gratuits sur Steam.',url:'https://store.steampowered.com/genre/Free%20to%20Play/'},
    {title:'GOG · Free Games',type:'JEUX',description:'Consulte les jeux gratuits actuellement proposés sur GOG.',url:'https://www.gog.com/partner/free_games'},
    {title:'GitHub · Open Source',type:'LOGICIELS',description:'Explore des outils open source et vérifie leur licence.',url:'https://github.com/topics/open-source'}
  ];
  const deal=destinations[((Math.floor(Date.now()/86400000)%destinations.length)+destinations.length)%destinations.length];
  const dealCard=document.createElement('article');
  dealCard.id='aegis-start-daily-deal';
  dealCard.innerHTML=[
    '<div class="aegis-deal-badge">✦ DAILY DISCOVERY</div><div class="aegis-deal-body"><div><small id="aegis-deal-label">Le bon plan du jour</small>',
    '<h3 id="aegis-deal-title"></h3><p id="aegis-deal-detail"></p><span id="aegis-deal-warning">Source officielle · disponibilité à vérifier, pas de prix garanti.</span></div>',
    '<button id="aegis-deal-visit" type="button">Découvrir ↗</button></div>'
  ].join('');
  const quickActions=$('start-quick-actions');
  if(quickActions)quickActions.insertAdjacentElement('afterend',dealCard);
  $('aegis-deal-title').textContent=deal.title;
  $('aegis-deal-detail').textContent=deal.description;
  $('aegis-deal-visit').addEventListener('click',()=>{
    if(typeof createTab==='function')createTab(deal.url);
  });
  // Independent start-page entry points.
  if(quickActions){
    for(const [name,title,icon] of [['arcade','Arcade','✹'],['chat','Chat','◇']]){
      const b=document.createElement('button');b.type='button';
      const symbol=document.createElement('span');symbol.textContent=icon;
      const bold=document.createElement('b');bold.textContent=title;
      const small=document.createElement('small');small.textContent=title==='Arcade'?'Offline games':'Community';
      b.append(symbol,bold,small);b.addEventListener('click',()=>open(name));quickActions.appendChild(b);
    }
    quickActions.querySelector('[data-start-action="focus"]')?.addEventListener('click',event=>{
      event.stopImmediatePropagation();event.preventDefault();open('focus');
    },true);
  }

  // Independent Focus timer.
  const focusKey='aegis-focus-timer-v2';
  const timer={remaining:1500,running:false,deadline:0};
  try{const saved=JSON.parse(localStorage.getItem(focusKey)||'{}');
    if(Number.isInteger(saved.remaining)&&saved.remaining>=0&&saved.remaining<=3600)timer.remaining=saved.remaining;
    if(saved.running&&Number.isFinite(saved.deadline)&&saved.deadline>Date.now()-3600000&&saved.deadline<Date.now()+3600000){
      timer.running=true;timer.deadline=saved.deadline;timer.remaining=Math.max(0,Math.ceil((saved.deadline-Date.now())/1000));
    }
  }catch{}
  function saveTimer(){try{localStorage.setItem(focusKey,JSON.stringify(timer));}catch{}}
  function paintTimer(){
    if(timer.running){
      timer.remaining=Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));
      if(!timer.remaining){timer.running=false;saveTimer();}
    }
    $('aegis-timer-clock').textContent=String(Math.floor(timer.remaining/60)).padStart(2,'0')+':'+String(timer.remaining%60).padStart(2,'0');
    $('aegis-timer-state').textContent=timer.running?tr('Concentration…','Focusing…'):timer.remaining?tr('Prêt / Pause','Ready / Paused'):tr('Terminé !','Complete!');
    $('aegis-timer-toggle').textContent=timer.running?tr('Pause','Pause'):tr('Démarrer','Start');
  }
  $('aegis-timer-toggle').addEventListener('click',()=>{
    if(timer.running){timer.running=false;}
    else{if(!timer.remaining)timer.remaining=Number($('aegis-timer-length').value)*60;
      timer.running=true;timer.deadline=Date.now()+timer.remaining*1000;}
    saveTimer();paintTimer();
  });
  $('aegis-timer-reset').addEventListener('click',()=>{timer.running=false;timer.remaining=Number($('aegis-timer-length').value)*60;timer.deadline=0;saveTimer();paintTimer();});
  $('aegis-timer-length').addEventListener('change',()=>{$('aegis-timer-reset').click();});
  $('aegis-focus-minimal').addEventListener('click',()=>{close('focus');if(typeof toggleFocusMode==='function')toggleFocusMode(true);});
  setInterval(paintTimer,1000);paintTimer();

  // Aegis Arcade · Memory + Reflex + Aegis Run.
  const emoji=['★','◇','◉','♫','☀','❖','♟','✿'];
  let cards=[],flipped=[],moves=0,matched=0,locked=false,memoryTimer=0;
  function memoryPaint(){
    const board=$('aegis-memory-board');board.replaceChildren();
    for(const card of cards){
      const tile=document.createElement('button');tile.type='button';tile.className='aegis-memory-tile'+(card.open?' open':'');
      tile.textContent=card.open?card.icon:'?';
      tile.disabled=card.matched||locked;
      tile.addEventListener('click',()=>flip(card));board.appendChild(tile);
    }
    $('aegis-memory-counter').textContent=tr('Coups : ','Moves: ')+moves+(matched===8?tr(' · Bravo !',' · You win!'):'');
  }
  function newMemory(){
    clearTimeout(memoryTimer);flipped=[];moves=0;matched=0;locked=false;
    const deck=[...emoji,...emoji].sort(()=>Math.random()-.5);
    cards=deck.map(icon=>({icon,open:false,matched:false}));memoryPaint();
  }
  function flip(card){
    if(locked||card.open||card.matched)return;
    card.open=true;flipped.push(card);memoryPaint();
    if(flipped.length===2){
      moves++;
      if(flipped[0].icon===flipped[1].icon){
        flipped.forEach(c=>c.matched=true);matched++;flipped=[];memoryPaint();
      }else{
        locked=true;memoryPaint();
        memoryTimer=setTimeout(()=>{flipped.forEach(c=>c.open=false);flipped=[];locked=false;memoryPaint();},800);
      }
    }
  }
  $('aegis-memory-reset').addEventListener('click',newMemory);newMemory();
  let reflex='idle',start=0;
  const reflexKey='aegis-reflex-best-v2';
  function reflexBest(value){
    let old=0;try{old=Number(localStorage.getItem(reflexKey))||0;}catch{}
    if(value&&(!old||value<old)){old=value;try{localStorage.setItem(reflexKey,String(old));}catch{}}
    $('aegis-reflex-record').textContent=tr('Record : ','Best: ')+(old?old+' ms':'—');
  }
  reflexBest(0);
  $('aegis-reflex-play').addEventListener('click',()=>{
    const btn=$('aegis-reflex-play');
    if(reflex==='idle'||reflex==='done'){
      clearTimeout(reflexTimer);reflex='waiting';btn.className='aegis-reflex-btn waiting';
      btn.textContent=tr('Attends…','Wait…');$('aegis-reflex-result').textContent=tr('Ne clique pas avant le vert.','Wait for green.');
      reflexTimer=setTimeout(()=>{reflex='ready';start=performance.now();btn.className='aegis-reflex-btn ready';btn.textContent=tr('CLIQUE !','CLICK!');},1400+Math.random()*2700);
    }else if(reflex==='waiting'){
      clearTimeout(reflexTimer);reflex='done';btn.className='aegis-reflex-btn';btn.textContent=tr('Réessayer','Try again');$('aegis-reflex-result').textContent=tr('Trop tôt !','Too early!');
    }else if(reflex==='ready'){
      const ms=Math.round(performance.now()-start);reflex='done';btn.className='aegis-reflex-btn';
      btn.textContent=tr('Rejouer','Play again');$('aegis-reflex-result').textContent=ms+' ms';reflexBest(ms);
    }
  });
  $('aegis-run-launch').addEventListener('click',()=>{
    if(!runner||!errorActions)return;
    runnerMoved=true;$('aegis-run-stage').appendChild(runner);
    runner.hidden=false;
    window.AegisOfflineRun?.setVisible(true,{privateMode:document.body.classList.contains('private-mode')});
    $('aegis-run-launch').textContent=tr('Jeu lancé','Game launched');
  });
  const labels={
    'aegis-focus-desc':['Un espace pour te concentrer, avec un minuteur local et un mode minimal.','A quiet place to focus, with a local timer and minimal browser mode.'],
    'aegis-timer-caption':['Durée de concentration','Focus duration'],
    'aegis-timer-reset':['Réinitialiser','Reset'],
    'aegis-focus-minimal':['Activer le mode Focus du navigateur (F9)','Enable minimal browser Focus mode (F9)'],
    'aegis-focus-footnote':['Le minuteur fonctionne hors connexion. Il ne bloque pas les sites ni les notifications.','The timer works offline. It does not block sites or notifications.'],
    'aegis-arcade-desc':['Des jeux indépendants et gratuits, jouables sans connexion.','Free independent mini-games playable offline.'],
    'aegis-memory-help':['Retrouve les 8 paires.','Find the 8 matching pairs.'],
    'aegis-memory-reset':['Nouvelle partie','New game'],
    'aegis-reflex-help':['Attends le vert avant de cliquer !','Wait for green, then click!'],
    'aegis-run-help':['Saute les obstacles, esquive les drones et bats ton record.','Jump over obstacles, duck under drones and beat your high score.'],
    'aegis-run-launch':['Jouer à Aegis Run','Play Aegis Run'],
    'aegis-chat-subhead':['Salons français et anglais · Clique sur un salon pour le rejoindre','French and English rooms · Click a room to join'],
    'aegis-chat-rooms-label':['SALONS','ROOMS'],
    'aegis-chat-server-label':['Service de connexion','Signaling service'],
    'aegis-chat-advanced-label':['⚙ Configuration avancée','⚙ Advanced settings'],
    'aegis-chat-server-hint':['Pour rejoindre un salon public, il faut déployer le service WSS. Il n’est pas encore en ligne.','To join a public room, deploy the WSS signaling service. None is live yet.'],
    'aegis-chat-rule-title':['Modération locale stricte','Strict local moderation'],
    'aegis-chat-rule-desc':['Chaque message envoyé et reçu doit être accepté par Aegis AI installé localement. Aucun lien, pièce jointe, HTML ou code exécutable. Aucun filtre n’est parfait.','Every sent and received message needs approval from installed local Aegis AI. No links, files, HTML or executable code. No filter is perfect.'],
    'aegis-chat-ai':['Configurer Aegis AI local','Set up local Aegis AI'],
    'aegis-chat-leave':['Quitter','Leave'],
    'aegis-chat-send':['Envoyer','Send'],
    'aegis-deal-label':['Le bon plan du jour','Daily discovery'],
    'aegis-deal-warning':['Source officielle · disponibilité à vérifier, aucune offre garantie.','Official source · verify availability; no offer guaranteed.'],
    'aegis-deal-visit':['Découvrir ↗','Explore ↗']
  };
  function localize(){for(const [id,pair] of Object.entries(labels)){const el=$(id);if(el)el.textContent=en()?pair[1]:pair[0];}paintTimer();}
  window.AegisFeatures={openFocus:()=>open('focus'),openArcade:()=>open('arcade'),openChat:()=>open('chat'),closeChat:()=>close('chat'),close};
  localize();
})();
