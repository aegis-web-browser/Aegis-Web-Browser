const $=id=>document.getElementById(id);
let pdfjs=null, pdfLib=null, raw=null, parsed=null, pageNo=1, filename='document.pdf';
let marks=[], mode='read', loading=false;
function notice(msg){$('status').textContent=msg}
function base64ToBytes(encoded){const str=atob(encoded),buf=new Uint8Array(str.length);for(let i=0;i<str.length;i++)buf[i]=str.charCodeAt(i);return buf}
function toBase64(bytes){let s=''; for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.slice(i,i+32768));return btoa(s)}
async function loadLibraries(){
  if(!pdfjs){
    notice('Chargement du lecteur PDF…');
    pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs';
  }
  if(!pdfLib){
    notice('Chargement des outils de modification PDF…');
    await new Promise((resolve,reject)=>{
      if(window.PDFLib){resolve();return}
      const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      script.onload=resolve; script.onerror=()=>reject(new Error('Connexion nécessaire pour charger pdf-lib'));
      document.head.appendChild(script)
    });
    pdfLib=window.PDFLib;
  }
}
async function loadBytes(bytes){
  raw=new Uint8Array(bytes);
  if(parsed)try{await parsed.destroy()}catch{}
  parsed=await pdfjs.getDocument({data:raw.slice(),isEvalSupported:false}).promise;
  pageNo=1;marks=[];
  $('total').textContent=parsed.numPages;$('page-num').max=parsed.numPages;
  for(const id of ['save','prev','next','page-num','rotate','delete'])$(id).disabled=false;
  await drawPage();
}
async function drawPage(){
  if(!parsed)return;
  pageNo=Math.max(1,Math.min(parsed.numPages,Number(pageNo)||1));
  $('page-num').value=pageNo;
  const page=await parsed.getPage(pageNo);const bounds=page.getViewport({scale:1});
  const maxWidth=Math.min(880,window.innerWidth-70);
  const scale=Math.max(.4,Math.min(1.65,maxWidth/bounds.width));
  const viewport=page.getViewport({scale});
  const canvas=$('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  $('page-box').style.display='block';$('blank').style.display='none';
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  $('page-box').dataset.width=bounds.width;$('page-box').dataset.height=bounds.height;
  drawMarks();notice(`${filename} · page ${pageNo}/${parsed.numPages} · modifications non enregistrées : ${marks.length}`);
}
function drawMarks(){
  const layer=$('marks');layer.textContent='';layer.style.width=$('canvas').width+'px';layer.style.height=$('canvas').height+'px';
  $('page-box').classList.toggle('editable',mode!=='read');
  for(const mark of marks.filter(m=>m.page===pageNo)){
    const el=document.createElement('span');el.className='mark '+mark.mode;
    el.style.left=mark.x*100+'%';el.style.top=mark.y*100+'%';
    if(mark.mode==='text'){el.textContent=mark.text;el.style.fontSize=Math.max(10,mark.size*$('canvas').width/Number($('page-box').dataset.width))+'px'}
    if(mark.mode==='highlight'){el.style.width='18%';el.style.height='2.6%';}
    if(mark.mode==='pen'){el.textContent='●'}
    layer.appendChild(el)
  }
  $('undo').disabled=marks.length===0;
}
$('marks').addEventListener('click',event=>{
  if(!parsed||mode==='read')return;
  const rect=$('marks').getBoundingClientRect();
  const x=Math.min(.99,Math.max(0,(event.clientX-rect.left)/rect.width));
  const y=Math.min(.99,Math.max(0,(event.clientY-rect.top)/rect.height));
  const text=$('text-value').value.trim();
  if(mode==='text'&&!text){notice('Écris d’abord le texte à ajouter.');$('text-value').focus();return}
  marks.push({page:pageNo,mode,x,y,text:text.slice(0,800),size:Math.min(46,Math.max(8,Number($('font-size').value)||15))});drawMarks();
});
document.querySelectorAll('.mode').forEach(btn=>btn.addEventListener('click',()=>{
 mode=btn.dataset.mode; document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b===btn));drawMarks()
}));
$('undo').onclick=()=>{marks.pop();drawMarks()};
$('prev').onclick=()=>{if(pageNo>1){pageNo--;drawPage().catch(e=>notice(e.message))}};
$('next').onclick=()=>{if(parsed&&pageNo<parsed.numPages){pageNo++;drawPage().catch(e=>notice(e.message))}};
$('page-num').onchange=()=>{pageNo=Number($('page-num').value);drawPage().catch(e=>notice(e.message))};
$('open').onclick=async()=>{
 if(loading)return;loading=true;
 try{
  const selected=await window.pdfBridge.open();if(!selected)return;
  filename=selected.name;
  await loadLibraries();
  await loadBytes(base64ToBytes(selected.data));
  $('name').textContent=filename;
 }catch(e){notice('Erreur de chargement : '+e.message)}finally{loading=false}
};
window.pdfBridge.onInitialFile(async pathname => {
  if (loading) return;
  loading = true;
  try {
    const selected = await window.pdfBridge.readInitial(pathname);
    filename = selected.name;
    await loadLibraries();
    await loadBytes(base64ToBytes(selected.data));
    $('name').textContent = filename;
  } catch (error) {
    notice('Erreur d’ouverture du PDF : ' + error.message);
  } finally {
    loading = false;
  }
});
async function persist(doc, label){
 const out=await doc.save({useObjectStreams:false});
 const result=await window.pdfBridge.save({filename:filename.replace(/\.pdf$/i,'')+'-modifie.pdf',data:toBase64(out)});
 if(result.saved){notice(`Copie enregistrée : ${result.filename}`); await loadBytes(out); marks=[];drawMarks()}else notice('Enregistrement annulé.');
}
async function prepareDoc(){return pdfLib.PDFDocument.load(raw,{updateMetadata:false})}
$('save').onclick=async()=>{
 if(!parsed)return;
 try{
  notice('Écriture des annotations dans une copie PDF…');
  const doc=await prepareDoc();const font=await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  for(const m of marks){const page=doc.getPages()[m.page-1];if(!page)continue;
   const w=page.getWidth(),h=page.getHeight();const x=m.x*w,y=(1-m.y)*h;
   if(m.mode==='text')page.drawText(m.text,{x,y:y-m.size,size:m.size,font,color:pdfLib.rgb(.84,.15,.2),maxWidth:Math.max(30,w-x-10)});
   else if(m.mode==='highlight')page.drawRectangle({x,y:y-.026*h,width:.18*w,height:.026*h,color:pdfLib.rgb(1,.96,.0),opacity:.36});
   else if(m.mode==='pen')page.drawCircle({x,y,radius:5,color:pdfLib.rgb(.94,.16,.18)});
  }
  await persist(doc);
 }catch(e){notice('Impossible d’enregistrer : '+e.message)}
};
$('rotate').onclick=async()=>{
 if(!parsed)return;
 try{const doc=await prepareDoc();const page=doc.getPages()[pageNo-1];page.setRotation(pdfLib.degrees((page.getRotation().angle+90)%360));await persist(doc)}catch(e){notice(e.message)}
};
$('delete').onclick=async()=>{
 if(!parsed||parsed.numPages<2){notice('Le PDF doit conserver au moins une page.');return}
 if(!confirm('Supprimer définitivement cette page de la copie ?'))return;
 try{const doc=await prepareDoc();doc.removePage(pageNo-1);await persist(doc)}catch(e){notice(e.message)}
};
