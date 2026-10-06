import { writeFileSync } from 'node:fs';
import { curriculum } from '../src/data/curriculum';
const output = curriculum.flatMap(day => day.blocks.map((block, index) => ({ day: day.index, dayTitle: day.title, blockNumber:index+1, ...block })));
writeFileSync('qa/v653/20261005/lessons/online-20261006/lesson-snapshot.json',JSON.stringify(output,null,2));
console.log(`Saved exact current snapshot: ${output.length} lessons`);
