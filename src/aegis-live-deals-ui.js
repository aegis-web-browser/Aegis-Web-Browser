'use strict';
/** Verified live daily offers on Aegis Start. No fake prices or hardcoded discounts. */
(function(){
  const $=id=>document.getElementById(id);
  const en=()=>!document.documentElement.lang.toLowerCase().startsWith('fr');
  const tr=(fr,eng)=>en()?eng:fr;
  const hero=document.querySelector('.start-hero');
  if(!hero)return;
  const card=document.createElement('article');
  card.id='aegis-start-daily-deal';
  card.setAttribute('aria-live','polite');
  card.innerHTML=[
    '<div class="aegis-deal-badge" id="aegis-deal-badge">✦ BON PLAN DU JOUR</div>',
    '<div class="aegis-deal-body"><div class="aegis-deal-info">',
    '<small id="aegis-deal-label">Offres officielles</small>',
    '<h3 id="aegis-deal-title">Vérification des promotions…</h3>',
    '<p id="aegis-deal-detail">Steam et Epic Games</p>',
    '<span id="aegis-deal-warning">Offres et disponibilités sujettes à modification.</span>',
    '</div><button id="aegis-deal-visit" type="button" disabled>Voir la promotion</button></div>'
  ].join('');
  hero.appendChild(card);
  let selectedOffer=null,lastDay='',lastRefresh=0,pending=null;
  function dayKey(){
    return new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'});
  }
  function price(cents){
    return new Intl.NumberFormat(en()?'en-IE':'fr-FR',{style:'currency',currency:'EUR'}).format(cents/100);
  }
  function renderOffer(){
    $('aegis-deal-badge').textContent=tr('✦ BON PLAN DU JOUR','✦ TODAY’S DEAL');
    if(!selectedOffer){
      $('aegis-deal-label').textContent=tr('Offres officielles','Official store deals');
      $('aegis-deal-title').textContent=tr('Aucune promotion vérifiée disponible','No verified deal available');
      $('aegis-deal-detail').textContent=tr('Les boutiques sont inaccessibles ou leurs données sont insuffisantes.','Stores are unavailable or their data could not confirm an active promotion.');
      $('aegis-deal-warning').textContent=tr('Aucun prix inventé. Vérifie les promotions en magasin.','No made-up prices. Check promotions at the store.');
      $('aegis-deal-visit').textContent=tr('Voir Steam','Browse Steam');
      $('aegis-deal-visit').disabled=false;
      return;
    }
    const d=selectedOffer;
    $('aegis-deal-label').textContent=d.kind==='free'
      ?tr('Jeu actuellement offert sur Epic Games','Currently free on Epic Games')
      :tr('Promotion Steam en cours','Current Steam discount');
    $('aegis-deal-title').textContent=d.title;
    $('aegis-deal-detail').textContent=d.kind==='free'
      ?tr('GRATUIT · réduction de 100 % pendant la promotion.','FREE · 100% off during the giveaway.')
      :('−'+d.discountPercent+' % · '+price(d.originalCents)+' → '+price(d.priceCents));
    const expiration=d.expiresAt?new Date(d.expiresAt):null;
    const validEnd=expiration&&Number.isFinite(expiration.getTime());
    $('aegis-deal-warning').textContent=d.store+' · '+tr('offre consultée aujourd’hui','offer checked today')+
      (validEnd?' · '+tr('jusqu’au ','until ')+expiration.toLocaleString(en()?'en-GB':'fr-FR',{dateStyle:'short',timeStyle:'short'}):'');
    $('aegis-deal-visit').textContent=tr('Voir l’offre','View offer');
    $('aegis-deal-visit').disabled=false;
  }
  $('aegis-deal-visit').addEventListener('click',()=>{
    const url=selectedOffer?.url||'https://store.steampowered.com/specials/';
    if(typeof navigateActive==='function')void navigateActive(url);
  });
  async function refresh(force=false){
    const day=dayKey();
    if(pending)return pending;
    if(!force&&lastDay===day&&Date.now()-lastRefresh<60*60*1000)return;
    lastDay=day;lastRefresh=Date.now();
    $('aegis-deal-title').textContent=tr('Recherche des offres réelles…','Checking live store promotions…');
    pending=(async()=>{
      try{
        const result=await window.api.liveDailyDeal();
        selectedOffer=result?.ok&&result?.offer?result.offer:null;
      }catch{selectedOffer=null;}
      renderOffer();
    })().finally(()=>pending=null);
    return pending;
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
  window.addEventListener('online',()=>{void refresh(true);});
  setInterval(()=>{if(!document.hidden)void refresh();},60000);
  window.AegisDailyDeals={refresh};
  renderOffer();
  void refresh(true);
})();
