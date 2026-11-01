// Separate integration to minimize regressions in Aegis's existing toolbar and menus.
(() => {
 const $=id=>document.getElementById(id);
 const openPdf=async()=>{try{await window.api.openPdfStudio()}catch(e){alert('Aegis PDF Studio : '+e.message)}};
 const pdfButton=$('aegis-pdf-btn'),pdfMenu=$('menu-aegis-pdf');
 pdfButton?.addEventListener('click',openPdf);pdfMenu?.addEventListener('click',openPdf);
 const panel=document.createElement('section');panel.id='aegis-cast-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Aegis Cast');
 panel.innerHTML=`<div class="aegis-cast-head"><b>📺 Aegis Cast</b><button id="aegis-cast-close" aria-label="Fermer">✕</button></div><p>Projette les images de l’onglet actif sur un écran ayant un navigateur, connecté au <b>même Wi-Fi</b>.</p><p class="cast-warning">Partage volontaire : les pages et informations visibles de l’onglet sont affichées sur cet écran. Ce n’est pas Google Chromecast. Image seule, environ 1 image par seconde, sans audio. Pas de prise en charge des contenus DRM.</p><p id="cast-info">Aucun partage en cours.</p><div id="cast-links"></div><div class="aegis-cast-actions"><button id="cast-go">Démarrer</button><button id="cast-end">Arrêter</button></div>`;
 document.body.appendChild(panel);
 const toast=message=>{const el=$('cast-info');if(el)el.textContent=String(message)};
 const close=()=>panel.classList.remove('show');
 $('aegis-cast-close').onclick=close;
 async function refresh(){
  try{const st=await window.api.castStatus();render(st)}catch(e){toast(e.message)}
 }
 function render(st){
  const links=$('cast-links');links.textContent='';
  if(st.active){
   toast(`Diffusion active — ${st.tabTitle}. Ouvre cette adresse sur ta TV :`);
   for(const url of st.urls||[]){
    const div=document.createElement('div');div.className='cast-link';
    const code=document.createElement('code');code.textContent=url;const copy=document.createElement('button');copy.textContent='Copier';
    copy.onclick=()=>window.api.copyText(url).then(()=>{copy.textContent='Copié !'}).catch(e=>toast(e.message));
    div.append(code,copy);links.appendChild(div)
   }
  }else toast('Aucun partage en cours.');
 }
 async function show(){panel.classList.toggle('show');if(panel.classList.contains('show'))await refresh()}
 $('aegis-cast-btn')?.addEventListener('click',show);
 $('menu-aegis-cast')?.addEventListener('click',show);
 $('cast-go').onclick=async()=>{
  const tab=typeof activeTab === 'function' ? activeTab() : null;
  // renderer.js declares `tabs` and `activeTabId` in its top-level script, accessible to subsequent scripts.
  const candidate=tab||(typeof tabs !== 'undefined' ? tabs.find(t=>t.id===activeTabId) : null);
  if(!candidate || candidate.internalStart || candidate.private){toast('Sélectionne un onglet Web non privé.');return}
  let guestId=null;try{guestId=candidate.webview.getWebContentsId()}catch{}
  if(!guestId){toast('Cet onglet n’est pas encore prêt.');return}
  toast('Démarrage du partage sur le réseau local…');
  try{const st=await window.api.startCast({guestId, private:!!candidate.private,title:candidate.title||candidate.webview.getTitle()});
   if(!st.ok)throw new Error(st.error||'Impossible de démarrer Aegis Cast');render(st)
  }catch(e){toast(e.message)}
 };
 $('cast-end').onclick=async()=>{try{render(await window.api.stopCast())}catch(e){toast(e.message)}};
})();
