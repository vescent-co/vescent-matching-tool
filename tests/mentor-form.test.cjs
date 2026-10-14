const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'apps-script', 'matching.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('renderWeights();\n\nlet teens')[0];
const ctx = vm.createContext({console});
vm.runInContext(script + '\nlet mentors = [];', ctx);
const run = code => vm.runInContext(code, ctx);
const load = name => fs.readFileSync(path.join(root, 'test-data', name), 'utf8');
const form = load('test-mentor-form.csv');
ctx.form = form;
let result = run('readPeople(form, "mentor")');
assert.equal(result.people.length, 1);
assert.equal(result.people[0].type, 'ESFJ');
assert.equal(result.people[0].problems.length, 0);
assert.equal(result.people[0].rec.email, 'testmentor@example.com');
assert.equal(result.people[0].rec.lightningAnswers.length, 8);
assert.match(result.people[0].rec.mentorBio, /Fictional Test Mentor/);
assert.equal(result.notices.some(n => n[0] === 'error'), false);
assert.equal(run('pointsPossible()'), 85);
assert.equal(run('readPeople(form).people.length'), 0);

// Every score in the preserved, independently written answer key must stay the same.
ctx.teenCSV = load('test-teens-export.csv');
ctx.mentorCSV = load('test-mentors.csv');
run('mentors = readPeople(mentorCSV, "mentor").people;');
const expected = load('expected-results.md').split('\n').filter(l => /^\| (Ava|Bella|Cora|Dani|Emma) \| (Maya|Nora|Priya|Quinn|Olive) \|/.test(l));
assert.equal(expected.length, 25);
ctx.scored = run('readPeople(teenCSV).people.flatMap(t => scoreMentors(t).map(m => ({teen:t.rec.first_name, mentor:m.mentor.rec.first_name, total:m.total, percent:m.percent})))');
for (const line of expected) {
  const cells = line.split('|').slice(1,-1).map(x => x.trim());
  const row = ctx.scored.find(x => x.teen === cells[0] && x.mentor === cells[1]);
  assert.equal(row.total, Number(cells[8]), `${cells[0]}/${cells[1]} total`);
  assert.equal(row.percent, Number(cells[9].replace('%','')), `${cells[0]}/${cells[1]} percent`);
}
assert.equal(run('topMatches(scoreMentors(readPeople(teenCSV).people.find(t => t.rec.first_name === "Cora"))).length'), 4);

const csv = rows => {
  const headers = Object.keys(rows[0]);
  const quote = v => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  return [headers, ...rows.map(r => headers.map(h => r[h]))].map(r => r.map(quote).join(',')).join('\r\n');
};
const original = run('parseCSV(form).records[0]');
const read = rows => {ctx.csv = csv(rows); return run('readPeople(csv, "mentor")');};
// Exercise both answer directions, including all mentor-specific wording changes.
ctx.original = original;
for (const [side, expectedType] of [[1, 'ESTJ'], [2, 'INFP']]) {
  ctx.side = side;
  const row = run(`(() => {
    const row = {...original};
    for (const [wording, a, b] of Object.values(PERSONALITY).flat()) {
      let answer = side === 1 ? a : b;
      if (side === 2 && wording === "After a long day at school, what sounds better?") answer = "Chilling alone";
      if (side === 2 && wording === "When you're stressed, what helps more?") answer = "Taking space and processing it alone";
      row[FORM_PERSONALITY[wording] || wording] = answer;
    }
    return row;
  })()`);
  assert.equal(read([row]).people[0].type, expectedType);
}
const older = {...original, Timestamp:'10/11/2026 23:59:59', Email:' TESTMENTOR@EXAMPLE.COM ', 'First name':'Older', 'Tell teens who you are':'Old bio'};
const newer = {...original, Timestamp:'10/12/2026 12:33:25', 'First name':'Newer'};
for (const rows of [[newer,older],[older,newer]]) {
  result = read(rows);
  assert.equal(result.people.length, 1);
  assert.equal(result.people[0].rec.first_name, 'Newer');
  assert.match(result.notices.map(n => n[1]).join(' '), /submitted 2 times.*Using 10\/12\/2026/);
}
result = read([newer,{...older,Timestamp:newer.Timestamp}]);
assert.equal(result.people.length, 0);
assert.match(result.notices.at(-1)[1], /tied newest timestamps/);
result = read([newer,{...older,Timestamp:'not a date'}]);
assert.equal(result.people.length, 0);
result = read([{...newer,Email:''}]);
assert.equal(result.people.length, 0);
assert.match(result.notices.at(-1)[1], /invalid email/);
result = read([newer,{...older,Email:'second@example.com'}]);
assert.equal(result.people.length, 2);
result = read([{...newer,"When you're stressed, what helps more?":'Unexpected answer'}]);
assert.equal(result.people[0].type, null);
assert.equal(result.people[0].problems.length, 1);
result = read([{...newer,[Object.keys(newer).find(h => h.startsWith('Sometimes life experiences'))]:'','Any other experience you\'d like to add?':'Unscored test note'}]);
assert.equal(result.people.length, 1);
assert.equal(result.people[0].rec.livedOther, 'Unscored test note');
ctx.csv = form.replace('Lightning round 8 of 8', 'Changed lightning question');
assert.equal(run('readPeople(csv, "mentor").people.length'), 0);
ctx.csv = form.replace('Timestamp,', 'Renamed timestamp,').replace('Email,', 'Renamed email,');
assert.equal(run('readPeople(csv, "mentor").people.length'), 0);
assert.equal(run('responseTime("2/30/2026 12:00:00")'), null);
assert.equal(run('responseTime("10/12/2026 25:00:00")'), null);
assert.equal(run('responseTime("10/12/2026 1:00:00 PM")'), run('responseTime("10/12/2026 13:00:00")'));
console.log('PASS: real fictional Forms download; all 25 original scores; third-place ties; newest duplicate in either row order; notices; timestamp ambiguity; missing email; distinct emails; incomplete answers; optional text; changed headings; timestamp parsing.');
