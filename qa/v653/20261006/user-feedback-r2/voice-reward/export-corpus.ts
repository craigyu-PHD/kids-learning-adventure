import { curriculum } from '../../../../../src/data/curriculum';
import { lessonInstructionText } from '../../../../../src/lessonInstructionText';
import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
const entries=new Map<string,{text:string,textSha256:string,uses:object[]}>();
function add(raw:string,use:object){const text=lessonInstructionText(raw).trim().replace(/\s+/g,' ');const existing=entries.get(text);if(existing)existing.uses.push(use);else entries.set(text,{text,textSha256:createHash('sha256').update(text).digest('hex'),uses:[use]});}
for(const day of curriculum)for(const block of day.blocks){add(block.sentence,{dayId:day.id,blockId:block.id,kind:'sentence',sourceText:block.sentence});for(const term of block.vocabulary)add(term,{dayId:day.id,blockId:block.id,kind:'vocabulary',sourceText:term});}
add('Hello! Let us learn English together.',{kind:'settings-preview'});
writeFileSync(new URL('corpus.json',import.meta.url),JSON.stringify({curriculumSha256:createHash('sha256').update(readFileSync('src/data/curriculum.ts')).digest('hex'),formatterSha256:createHash('sha256').update(readFileSync('src/lessonInstructionText.ts')).digest('hex'),days:curriculum.length,blocks:curriculum.flatMap(x=>x.blocks).length,entries:[...entries.values()]},null,2));
console.log({unique:entries.size,withAdventure:[...entries.keys()].filter(t=>/Adventure\s*\d/i.test(t)),placeholders:[...entries.keys()].filter(t=>/__/.test(t))});
