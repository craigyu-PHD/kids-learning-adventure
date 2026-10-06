import assert from 'node:assert/strict';
import { selectExactAvatarHero, type AvatarHeroAsset } from '../src/avatarHeroAssets';
import { cosmetics } from '../src/cosmetics';

const avatars=['brother','younger','sister','younger-sister'];
// Metadata only; no fabricated art files are created or registered.
const records:AvatarHeroAsset[]=avatars.map(avatarId=>({avatarId,itemId:'starter-sun-cap',path:`assets/v6.4/hero-composites/${avatarId}/starter-sun-cap.webp`,sourceSha256:'a'.repeat(64),deliverySha256:'b'.repeat(64)}));
for(const avatar of avatars) {
  assert.equal(selectExactAvatarHero(avatar,['starter-sun-cap'],records)?.avatarId,avatar);
  assert.equal(selectExactAvatarHero(avatar,['starter-sun-cap']),undefined,'Unaccepted real manifest must stay empty');
  for(const slot of ['hairstyle','headphones','glasses','backpack','cape','outfit']) {
    const other=cosmetics.find(i=>i.slot===slot)!;
    const look=['starter-sun-cap',other.id], before=[...look];
    assert.equal(selectExactAvatarHero(avatar,look,records),undefined,`${slot} combination must keep runtime`);
    assert.deepEqual(look,before,'Never unequip items to fit a single-item Hero');
  }
  const world=cosmetics.find(i=>i.slot==='room')!;
  assert.equal(selectExactAvatarHero(avatar,['starter-sun-cap',world.id],records)?.avatarId,avatar,'Room is independently rendered');
}
for(const look of [[],['missing'],['starter-sun-cap','missing'],['starter-sun-cap','starter-sun-cap']]) assert.equal(selectExactAvatarHero('brother',look,records),undefined);
assert.equal(selectExactAvatarHero('unknown',['starter-sun-cap'],records),undefined);
assert.equal(selectExactAvatarHero('younger',['starter-sun-cap'],records.slice(0,1)),undefined,'Never substitute another avatar');
assert.equal(selectExactAvatarHero('brother',['starter-sun-cap'],[records[0],records[0]]),undefined);
for(const mutation of [{path:'assets/v5/items/hat.webp'},{sourceSha256:''},{deliverySha256:'bad'}]) assert.equal(selectExactAvatarHero('brother',['starter-sun-cap'],[{...records[0],...mutation}]),undefined);
console.log(JSON.stringify({status:'PASS',avatars:4,blockedMultiWearableCases:24,productionHeroes:0,note:'Selection logic only, not visual art acceptance'}));
