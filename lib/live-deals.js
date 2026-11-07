'use strict';

/**
 * Real store offers, not invented "deals". Two official storefront endpoints.
 * The endpoints are publicly accessible but are not contractual/public APIs:
 * fail gracefully and NEVER claim a discount when upstream data cannot verify it.
 */
const https = require('node:https');

const SOURCES = Object.freeze({
  steam: 'https://store.steampowered.com/api/featuredcategories/?cc=fr&l=french',
  epic: 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=fr&country=FR&allowCountries=FR'
});
const MAX_BODY = 2 * 1024 * 1024;
function requestJson(url, options={}) {
  const timeoutMs = Math.max(800, Math.min(8000, Number(options.timeoutMs)||5500));
  return new Promise((resolve,reject)=>{
    let done=false;
    const req=https.get(url,{headers:{'Accept':'application/json','User-Agent':'Aegis-Web/5.9 (public offer discovery)'},timeout:timeoutMs},res=>{
      if(res.statusCode!==200){res.resume();reject(new Error('HTTP '+res.statusCode));return;}
      let size=0;
      const chunks=[];
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>MAX_BODY){req.destroy(new Error('Response too large'));return;}
        chunks.push(chunk);
      });
      res.once('end',()=>{
        try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}
        catch(e){reject(new Error('Invalid JSON from official store'));}
      });
    });
    req.once('timeout',()=>req.destroy(new Error('Store request timeout')));
    req.once('error',reject);
  });
}
function trimTitle(value) {
  return typeof value==='string'?value.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,125):'';
}
function parseSteam(data, now=Date.now()) {
  const items=Array.isArray(data?.specials?.items)?data.specials.items:[];
  const deals=[];
  for(const item of items) {
    const appId=Number(item?.id), title=trimTitle(item?.name);
    const percent=Number(item?.discount_percent);
    const original=Number(item?.original_price), final=Number(item?.final_price);
    const expiry=Number(item?.discount_expiration||0);
    if(!Number.isInteger(appId)||appId<=0||appId>2_000_000_000||!title)continue;
    if(item?.type && !['app','game'].includes(String(item.type).toLowerCase()))continue;
    if(!item?.discounted||!Number.isInteger(percent)||percent<10||percent>99)continue;
    if(!Number.isInteger(original)||!Number.isInteger(final)||original<=0||final<0||final>=original)continue;
    if(expiry>0&&expiry*1000<now)continue;
    const currency=String(item?.currency||'EUR').toUpperCase();
    if(currency!=='EUR')continue; // Never label USD as euros.
    if(Math.abs(Math.round((1-final/original)*100)-percent)>3)continue;
    deals.push({id:'steam-'+appId,title,store:'Steam',kind:'discount',discountPercent:percent,
      originalCents:original,priceCents:final,currency:'EUR',
      url:'https://store.steampowered.com/app/'+appId+'/',expiresAt:expiry?new Date(expiry*1000).toISOString():null});
  }
  return deals;
}
function currentPromotion(item, now=Date.now()) {
  const lists=item?.promotions?.promotionalOffers;
  if(!Array.isArray(lists))return null;
  for(const group of lists){
    for(const offer of (Array.isArray(group?.promotionalOffers)?group.promotionalOffers:[])){
      const start=Date.parse(offer?.startDate||'');
      const end=Date.parse(offer?.endDate||'');
      // Epic discountPercentage is the percentage of the price *paid* (0 = free).
      if(offer?.discountSetting?.discountPercentage===0&&Number.isFinite(start)&&Number.isFinite(end)&&start<=now&&end>now)return {end};
    }
  }
  return null;
}
function parseEpic(data,now=Date.now()) {
  const items=data?.data?.Catalog?.searchStore?.elements;
  if(!Array.isArray(items))return [];
  const result=[];
  for(const item of items) {
    if(item?.offerType!=='BASE_GAME')continue;
    const title=trimTitle(item?.title);
    const promo=currentPromotion(item,now);
    if(!title||!promo)continue;
    const slug=String(item?.offerMappings?.[0]?.pageSlug||item?.productSlug||'').replace(/\/home$/,'').replace(/\/+$/,'');
    if(!/^[a-z0-9][a-z0-9/_-]{1,130}$/i.test(slug))continue;
    result.push({id:'epic-'+String(item.id||slug).slice(0,70),title,store:'Epic Games',
      kind:'free',discountPercent:100,originalCents:null,priceCents:0,currency:'EUR',
      url:'https://store.epicgames.com/fr/p/'+slug.replace(/^p\//,''),
      expiresAt:new Date(promo.end).toISOString()});
  }
  return result;
}
function frenchDayIndex(now=Date.now()) {
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  return Math.floor(Date.parse(date+'T00:00:00Z')/86400000);
}
function chooseOfDay(deals, now=Date.now()) {
  const clean=Array.isArray(deals)?deals.filter(x=>x&&/^https:\/\/(store\.steampowered\.com|store\.epicgames\.com)\//.test(x.url)): [];
  if(!clean.length)return null;
  // Stable daily pick, changing between entries when the source has multiple active offers.
  const index=((frenchDayIndex(now)%clean.length)+clean.length)%clean.length;
  return clean[index];
}
async function getLiveDailyOffer(fetcher=requestJson,now=Date.now()) {
  const results=await Promise.allSettled([
    fetcher(SOURCES.steam),fetcher(SOURCES.epic)
  ]);
  const steam=results[0].status==='fulfilled'?parseSteam(results[0].value,now):[];
  const epic=results[1].status==='fulfilled'?parseEpic(results[1].value,now):[];
  const eligible=[...epic,...steam].sort((a,b)=>a.id.localeCompare(b.id));
  const offer=chooseOfDay(eligible,now);
  return {ok:Boolean(offer),offer,checkedAt:new Date(now).toISOString(),
    sourceCount:{steam:steam.length,epic:epic.length},error:offer?null:'no-verified-live-offer'};
}
module.exports={SOURCES,requestJson,parseSteam,parseEpic,currentPromotion,chooseOfDay,getLiveDailyOffer};
