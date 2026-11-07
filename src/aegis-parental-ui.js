'use strict';
/**
 * Parental controls UI: all settings are changed only after a PIN check in main.
 * The salted PIN hash and usage accounting never live in the renderer.
 */
(function(){
  const $=id=>document.getElementById(id);
  const en=()=>!document.documentElement.lang.toLowerCase().startsWith('fr');
  const tr=(fr,english)=>en()?english:fr;
  const settings=$('panel-settings')?.querySelector('.settings-body');
  if(!settings)return;
  const section=document.createElement('section');
  section.id='aegis-parental-settings';
  section.innerHTML=[
    '<div class="settings-section-title" id="parental-heading">Contrôle parental</div>',
    '<p class="settings-note" id="parental-description">Code parental, temps d’écran et sites bloqués. Protection appliquée au navigateur.</p>',
    '<div class="aegis-parental-status" id="parental-status" role="status">Chargement…</div>',
    '<label class="field-label" id="parental-limit-label">Temps d’écran par jour',
    '<select id="parental-daily-limit"><option value="0">Sans limite</option><option value="30">30 min</option><option value="60">1 h</option><option value="90">1 h 30</option><option value="120">2 h</option><option value="180">3 h</option><option value="240">4 h</option><option value="360">6 h</option></select></label>',
    '<label class="field-label" id="parental-sites-label">Sites à bloquer (un domaine par ligne)',
    '<textarea id="parental-blocked-domains" rows="4" placeholder="tiktok.com&#10;instagram.com&#10;youtube.com" spellcheck="false"></textarea></label>',
    '<div class="aegis-parental-actions">',
    '<button type="button" class="primary-btn" id="parental-save">Configurer / activer</button>',
    '<button type="button" class="secondary-btn" id="parental-unlock">Déverrouiller 15 min</button>',
    '<button type="button" class="secondary-btn" id="parental-change-pin">Changer le code</button>',
    '<button type="button" class="secondary-btn" id="parental-disable">Désactiver</button></div>',
    '<p class="settings-note" id="parental-limits-note">Le contrôle protège la navigation dans Aegis, pas Windows ni les autres navigateurs. Une personne disposant d’un accès administrateur au PC peut le contourner.</p>'
  ].join('');
  const save=$('save-settings-btn');
  if(save?.parentElement===settings)settings.insertBefore(section,save);
  else settings.appendChild(section);
  let status=null;
  async function askPin(title){
    return new Promise(resolve=>{
      const dim=document.createElement('div');
      dim.className='aegis-parental-modal';
      dim.innerHTML=[
        '<form class="aegis-parental-dialog">',
        '<h2></h2>',
        '<input type="password" inputmode="numeric" maxlength="16" autocomplete="off" aria-label="Code parental" required/>',
        '<div><button type="button" class="secondary-btn" data-cancel>Annuler</button>',
        '<button type="submit" class="primary-btn">Confirmer</button></div>',
        '</form>'
      ].join('');
      const titleElement=dim.querySelector('h2');
      titleElement.textContent=title;
      const input=dim.querySelector('input');
      let resolved=false;
      function finish(value){
        if(resolved)return;resolved=true;
        window.removeEventListener('keydown',onEscape,true);
        dim.remove();resolve(value);
      }
      function onEscape(event){
        if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish(null);}
      }
      dim.querySelector('[data-cancel]').addEventListener('click',()=>finish(null));
      dim.querySelector('form').addEventListener('submit',event=>{event.preventDefault();finish(input.value);});
      window.addEventListener('keydown',onEscape,true);
      document.body.appendChild(dim);
      input.focus();
    });
  }
  async function refresh(initial=false){
    try{
      status=await window.api.parentalStatus();
      if(initial){
        $('parental-daily-limit').value=String(status.dailyLimitMinutes||0);
        $('parental-blocked-domains').value=(status.blockedDomains||[]).join('\n');
      }
      $('parental-status').textContent=!status.configured
        ?tr('Aucun code parental défini. Crée un code à 4–16 chiffres.','No PIN set. Create a 4–16 digit PIN.')
        :!status.enabled
          ?tr('Protection désactivée · code conservé.','Protection disabled · PIN retained.')
          :tr('Protection active','Protection enabled')+' · '+
            (status.remainingMinutes===null?tr('temps illimité','unlimited time'):tr('reste ','remaining ')+status.remainingMinutes+' min')+
            (status.temporarilyUnlocked?tr(' · déverrouillé temporairement',' · temporarily unlocked'):'');
      $('parental-save').textContent=status.configured
        ?tr('Enregistrer les règles','Save rules')
        :tr('Créer mon code parental','Create parental PIN');
      $('parental-unlock').disabled=!status.enabled;
      $('parental-disable').disabled=!status.enabled;
      $('parental-change-pin').disabled=!status.configured;
    }catch{$('parental-status').textContent=tr('État de protection indisponible.','Parental status unavailable.');}
  }
  function rules(){
    return {
      dailyLimitMinutes:Math.max(0,Math.min(1440,Number($('parental-daily-limit').value)||0)),
      blockedDomains:$('parental-blocked-domains').value
    };
  }
  async function resultToast(result,success){
    if(result?.ok){if(typeof showToast==='function')showToast(success);await refresh();return true;}
    if(typeof showToast==='function')showToast(tr('Code incorrect, limite d’essais atteinte, ou configuration invalide.','Wrong PIN, too many attempts, or invalid settings.'));
    return false;
  }
  $('parental-save').addEventListener('click',async()=>{
    try{
      if(!status?.configured){
        const pin=await askPin(tr('Créer un code parental (4 à 16 chiffres)','Create parental PIN (4–16 digits)'));
        if(!pin)return;
        const confirm=await askPin(tr('Confirmer le code parental','Confirm parental PIN'));
        if(!confirm)return;
        const created=await window.api.parentalCreate({pin,confirm});
        if(!await resultToast(created,tr('Code parental créé.','Parental PIN created.')))return;
        await resultToast(await window.api.parentalConfigure({pin,...rules()}),tr('Contrôle parental activé.','Parental controls enabled.'));
      }else{
        const pin=await askPin(tr('Code parental pour enregistrer','Parental PIN to save settings'));
        if(!pin)return;
        await resultToast(await window.api.parentalConfigure({pin,...rules()}),tr('Règles enregistrées.','Rules saved.'));
      }
    }catch{if(typeof showToast==='function')showToast(tr('Erreur de configuration.','Configuration error.'));}
  });
  $('parental-unlock').addEventListener('click',async()=>{
    const pin=await askPin(tr('Code parental : déverrouillage 15 min','Parental PIN: unlock for 15 minutes'));
    if(pin)await resultToast(await window.api.parentalUnlock(pin),tr('Déverrouillage actif pour 15 minutes.','Unlocked for 15 minutes.'));
  });
  $('parental-disable').addEventListener('click',async()=>{
    const pin=await askPin(tr('Code parental pour désactiver','Parental PIN to disable'));
    if(pin)await resultToast(await window.api.parentalDisable(pin),tr('Protection désactivée.','Protection disabled.'));
  });
  $('parental-change-pin').addEventListener('click',async()=>{
    const oldPin=await askPin(tr('Code actuel','Current PIN'));if(!oldPin)return;
    const newPin=await askPin(tr('Nouveau code à 4–16 chiffres','New PIN (4–16 digits)'));if(!newPin)return;
    const confirm=await askPin(tr('Confirmer le nouveau code','Confirm new PIN'));if(!confirm)return;
    await resultToast(await window.api.parentalChangePin({oldPin,newPin,confirm}),tr('Code parental modifié.','Parental PIN changed.'));
  });
  function blockedPage(data){
    if(!data||!['blocked-site','screen-time'].includes(data.reason))return;
    let current=null;
    try{current=getActiveTab();}catch{}
    const guest=current?.webview?.getWebContentsId?.();
    if(guest&&data.guestId&&guest!==data.guestId)return;
    const previous=$('aegis-parental-alert');previous?.remove();
    const alert=document.createElement('aside');
    alert.id='aegis-parental-alert';
    alert.innerHTML='<strong></strong><span></span><button class="primary-btn" type="button" data-unlock></button><button type="button" data-close>×</button>';
    alert.querySelector('strong').textContent=tr('Navigation protégée','Protected navigation');
    alert.querySelector('span').textContent=data.reason==='screen-time'
      ?tr('Temps d’écran atteint.','Screen-time limit reached.')
      :tr('Ce site est bloqué par le contrôle parental.','This website is blocked by parental controls.');
    alert.querySelector('[data-unlock]').textContent=tr('Entrer le code','Enter PIN');
    alert.querySelector('[data-close]').addEventListener('click',()=>alert.remove());
    alert.querySelector('[data-unlock]').addEventListener('click',async()=>{
      const pin=await askPin(tr('Code parental','Parental PIN'));
      if(!pin)return;
      const ok=await resultToast(await window.api.parentalUnlock(pin),tr('Déverrouillage temporaire activé.','Temporary unlock enabled.'));
      if(ok){
        alert.remove();
        const url=String(data.url||'');
        if(/^https?:\/\//i.test(url)&&typeof navigateActive==='function')void navigateActive(url);
      }
    });
    document.body.appendChild(alert);
  }
  window.api.onParentalBlocked?.(blockedPage);
  window.api.onParentalExpired?.(()=>{
    try{
      const tab=getActiveTab();
      if(tab&&!tab.internalStart)activateStartPage(tab);
    }catch{}
    blockedPage({reason:'screen-time',url:''});
  });
  setInterval(()=>{if(!$('panel-settings')?.classList.contains('open'))return;void refresh();},60000);
  void refresh(true);
})();
