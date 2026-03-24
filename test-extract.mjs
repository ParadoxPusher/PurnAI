import { readFileSync } from 'fs';

const raw = readFileSync(process.env.USERPROFILE + '/tmp/doctest.txt', 'utf8');
const lines = raw.split('\n').filter(l => l.startsWith('data: {'));
let content = '';
let thinking = '';

for (const line of lines) {
  try {
    const data = JSON.parse(line.slice(6));
    const delta = data.choices?.[0]?.delta;
    if (delta) {
      const reasoning = delta.reasoning_content || delta.reasoning;
      if (reasoning) thinking += reasoning;
      if (delta.content) content += delta.content;
    }
  } catch {}
}

console.log('Content length:', content.length);
console.log('Thinking length:', thinking.length);
console.log();

// Simulate extractDocGen exactly as the frontend does
function extractDocGen(content) {
  if (!content) return { cleanContent: '', docData: null, isGenerating: false };

  const matchStart = content.indexOf('```json doc-gen');
  if (matchStart === -1) return { cleanContent: content, docData: null, isGenerating: false };

  const matchEnd = content.indexOf('```', matchStart + 15);

  if (matchEnd === -1) {
    const cleanContent = content.substring(0, matchStart).trim();
    return { cleanContent, docData: null, isGenerating: true };
  }

  const jsonStr = content.substring(matchStart + 15, matchEnd).trim();
  let parsed = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse doc-gen block:', e.message);
    console.log('JSON string (first 200):', jsonStr.substring(0, 200));
  }

  const cleanContent = (content.substring(0, matchStart) + content.substring(matchEnd + 3)).trim();
  return { cleanContent, docData: parsed, isGenerating: false };
}

const result = extractDocGen(content);
console.log('extractDocGen result:');
console.log('  cleanContent length:', result.cleanContent.length);
console.log('  cleanContent:', JSON.stringify(result.cleanContent.substring(0, 100)));
console.log('  docData:', result.docData ? `type=${result.docData.type}, title=${result.docData.title}, content_len=${(result.docData.content||'').length}` : 'null');
console.log('  isGenerating:', result.isGenerating);

// Now simulate extractImageGen on the cleanContent
function extractImageGen(content) {
  if (!content) return { cleanContent: '', imagePrompt: null };
  const matchStart = content.indexOf('```json image-gen');
  if (matchStart === -1) return { cleanContent: content, imagePrompt: null };
  const matchEnd = content.indexOf('```', matchStart + 17);
  if (matchEnd === -1) return { cleanContent: content.substring(0, matchStart).trim(), imagePrompt: null };
  const jsonStr = content.substring(matchStart + 17, matchEnd).trim();
  let prompt = null;
  try {
    const parsed = JSON.parse(jsonStr);
    prompt = parsed.prompt;
  } catch {}
  const cleanContent = (content.substring(0, matchStart) + content.substring(matchEnd + 3)).trim();
  return { cleanContent, imagePrompt: prompt };
}

const imgResult = extractImageGen(result.cleanContent);
console.log('\nextractImageGen result:');
console.log('  finalContent length:', imgResult.cleanContent.length);
console.log('  finalContent:', JSON.stringify(imgResult.cleanContent.substring(0, 100)));
console.log('  imagePrompt:', imgResult.imagePrompt);

// Check what renders
console.log('\n=== RENDER CHECKS ===');
console.log('Would show thinking block:', thinking.length > 0);
console.log('Would show message content (finalContent):', imgResult.cleanContent.length > 0);
console.log('Would show "Building document...":', result.isGenerating);
console.log('Would show DocumentCard:', result.docData !== null);
