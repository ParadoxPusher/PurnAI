import { readFileSync } from 'fs';

const raw = readFileSync(process.env.USERPROFILE + '/tmp/doctest.txt', 'utf8');
const lines = raw.split('\n').filter(l => l.startsWith('data: {'));
let content = '';
for (const line of lines) {
  try {
    const data = JSON.parse(line.slice(6));
    const c = data.choices?.[0]?.delta?.content;
    if (c) content += c;
  } catch {}
}

console.log('=== FULL ASSEMBLED CONTENT ===');
console.log(content);
console.log('\n=== EXTRACTION TEST ===');

const marker = '```json doc-gen';
const idx1 = content.indexOf(marker);
console.log('indexOf marker:', idx1);

if (idx1 !== -1) {
  const idx2 = content.indexOf('```', idx1 + marker.length);
  console.log('closing backtick at:', idx2);
  if (idx2 !== -1) {
    const jsonStr = content.substring(idx1 + marker.length, idx2).trim();
    console.log('=== JSON STR (first 500) ===');
    console.log(jsonStr.substring(0, 500));
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('PARSE OK - type:', parsed.type, ', title:', parsed.title, ', content length:', (parsed.content || '').length);
    } catch (e) {
      console.log('PARSE FAIL:', e.message);
    }
  }
} else {
  console.log('NO doc-gen block found!');
  console.log('Has ```json:', content.includes('```json'));
  console.log('Has doc-gen:', content.includes('doc-gen'));
  console.log('Content length:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));
}
