'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseSteam,parseEpic,currentPromotion,chooseOfDay,getLiveDailyOffer}=require('../lib/live-deals');
const NOW=Date.parse('2026-11-06T13:00:00Z');
test('Steam only accepts active, currency-consistent and genuine discounted prices',()=>{
  const sample={specials:{items:[
    {id:111,name:'Verified Sale',type:'app',discounted:true,discount_percent:50,original_price:2000,final_price:1000,currency:'EUR'},
    {id:112,name:'Fake Sale',discounted:true,discount_percent:90,original_price:2000,final_price:1900,currency:'EUR'},
    {id:113,name:'Expired',discounted:true,discount_percent:50,original_price:2000,final_price:1000,currency:'EUR',discount_expiration:1},
    {id:114,name:'Wrong currency',discounted:true,discount_percent:50,original_price:2000,final_price:1000,currency:'USD'},
    {id:115,name:'Markup <img>',discounted:true,discount_percent:20,original_price:3000,final_price:2400,currency:'EUR'}
  ]}};
  const offers=parseSteam(sample,NOW);
  assert.deepEqual(offers.map(x=>x.id),['steam-111','steam-115']);
  assert.equal(offers[0].priceCents,1000);
  assert.equal(offers[0].url,'https://store.steampowered.com/app/111/');
  assert.ok(!offers[1].title.includes('<'));
});
test('Epic only advertises base games with a live zero-pay-percent promotion',()=>{
  const base={offerType:'BASE_GAME',title:'Verified Free',id:'game-id',offerMappings:[{pageSlug:'verified-free'}],
    promotions:{promotionalOffers:[{promotionalOffers:[{startDate:'2026-11-01T00:00:00Z',endDate:'2026-11-09T00:00:00Z',discountSetting:{discountPercentage:0}}]}]}};
  assert.ok(currentPromotion(base,NOW));
  const other={...base,id:'out',title:'Upcoming',promotions:{promotionalOffers:[],upcomingPromotionalOffers:[{promotionalOffers:[{startDate:'2026-11-07T00:00:00Z',endDate:'2026-11-15T00:00:00Z',discountSetting:{discountPercentage:0}}]}]}};
  const parsed=parseEpic({data:{Catalog:{searchStore:{elements:[base,other,{...base,offerType:'DLC'}]}}}},NOW);
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].title,'Verified Free');
  assert.equal(parsed[0].url,'https://store.epicgames.com/fr/p/verified-free');
  assert.equal(parsed[0].discountPercent,100);
});
test('Daily pick remains stable for a date and returns nothing when no verified offers',()=>{
  const d=[{url:'https://store.epicgames.com/fr/p/a',id:'a'},{url:'https://store.steampowered.com/app/100/',id:'b'}];
  assert.deepEqual(chooseOfDay(d,NOW),chooseOfDay(d,NOW+2000));
  assert.equal(chooseOfDay([]),null);
});
test('A failed source never becomes a fake deal',async()=>{
  const result=await getLiveDailyOffer(async()=>{throw new Error('no internet');},NOW);
  assert.equal(result.ok,false);
  assert.equal(result.offer,null);
  assert.equal(result.error,'no-verified-live-offer');
});
