const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'apps-script/matching.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('renderWeights();\n\nlet teens')[0];
const ctx = vm.createContext({ console });
vm.runInContext(script + '\nlet mentors = [];', ctx);
const run = code => vm.runInContext(code, ctx);
const questions = JSON.parse(fs.readFileSync(path.join(root, 'test-data/onboarding_questions_2026-09-v2.json'), 'utf8')).questions;
const changed = {
  personality_01: 'After a long day of classes, what sounds better?',
  personality_11: 'With coursework, you...',
  personality_16: "You'd rather a professor who...",
  personality_19: 'Your room or bag is usually...',
  lived_experience: 'Sometimes life experiences can be so helpful in a near-peer relationship. Are there any of the following personal experiences in your life that might be relevant for your match?',
};
function record(side) {
  const rec = { user_id: 'fictional-' + side, first_name: 'Fictional', last_name: 'Mentor ' + side, email: 'mentor' + side + '@example.test', survey_version: '2026-11-mentor-v1' };
  for (const q of questions.filter(q => q.id.startsWith('personality_') || q.id.startsWith('lightning_'))) {
    let answer = q.options[side].label;
    if (side === 1 && q.id === 'personality_01') answer = 'Chilling alone';
    if (side === 1 && q.id === 'personality_02') answer = 'Taking space and processing it alone';
    rec[q.id.startsWith('lightning_') ? q.id : changed[q.id] || q.prompt] = answer;
  }
  rec['What fills your time?'] = 'music, animals';
  rec[changed.lived_experience] = 'anxiety, family stress';
  rec['When a teen messages you, how fast can you honestly reply?'] = 'Every evening - I check in once a day';
  rec['Tell teens who you are'] = 'Fictional bio';
  rec["I'm here to help with"] = 'confidence';
  rec["Any other experience you'd like to add?"] = 'Fictional experience';
  return rec;
}
function read(rows, role = 'mentor') {
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const quote = v => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  ctx.input = [headers, ...rows.map(r => headers.map(h => r[h]))].map(row => row.map(quote).join(',')).join('\r\n');
  return run('readPeople(input,' + JSON.stringify(role) + ')');
}
for (const [side, expected] of [[0, 'ESTJ'], [1, 'INFP']]) {
  const result = read([record(side)]);
  assert.equal(result.people[0].type, expected);
  assert.equal(result.people[0].problems.length, 0);
  assert.equal(result.people[0].lightning.problems.length, 0);
  assert.equal(result.people[0].rec["Want a mentor who's been through it too?"], 'anxiety, family stress');
  assert.equal(result.people[0].rec.mentorBio, 'Fictional bio');
  assert.equal(result.people[0].rec.mentorHelp, 'confidence');
  assert.equal(result.people[0].rec["When a friend texts you, you usually reply..."], 'Every evening - I check in once a day');
  assert.equal(result.notices.length, 0);
}
// Each row keeps its own answers, including both directions of every renamed choice.
const two = read([record(0), record(1)]);
assert.deepEqual(Array.from(two.people, p => p.type), ['ESTJ', 'INFP']);
assert.equal(read([record(0)], 'teen').people.length, 0);
const missing = record(0);
delete missing[changed.personality_01];
assert.equal(read([missing]).people.length, 0);
const incomplete = record(0);
incomplete.lightning_01 = '';
assert.ok(read([incomplete]).notices.some(n => /lightning_01/.test(n[1])));
const unknown = record(1);
unknown.survey_version = 'future-unknown';
assert.equal(read([record(0), unknown]).people.length, 0);
// A representation change must not change scores or weights.
ctx.candidate = two.people[0];
ctx.teen = run('personWithLightning(candidate.rec, [])');
const scored = run('mentors = [candidate]; scoreMentors(teen)[0]');
assert.equal(scored.total, 100);
assert.equal(scored.percent, 100);
console.log('PASS: new mentor CSV wording, both personality directions, all eight Lightning answers, correct row alignment, display-only details, wrong upload slot, missing columns/answers, mixed versions, unchanged 100-point score.');
