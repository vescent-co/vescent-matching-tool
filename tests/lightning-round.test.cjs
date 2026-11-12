const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const questions = JSON.parse(fs.readFileSync(path.join(root,
  'test-data/onboarding_questions_2026-09-v2.json'), 'utf8')).questions
  .filter(question => question.id.startsWith('lightning_'));
const html = fs.readFileSync(path.join(root, 'apps-script/matching.html'), 'utf8');
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const script = fullScript.split('renderWeights();\n\nlet teens')[0];

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.handlers = {}; this._text = ''; }
  setAttribute(key, value) { this.attrs[key] = value; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; this._text = ''; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  get textContent() {
    return this._text + this.children.map(child => typeof child === 'string' ? child : child.textContent).join(' ');
  }
  set textContent(value) { this._text = value; this.children = []; }
}

function csv(records) {
  const headers = [...new Set(records.flatMap(record => Object.keys(record)))];
  const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  return [headers, ...records.map(record => headers.map(header => record[header]))]
    .map(row => row.map(quote).join(',')).join('\r\n');
}

function setup() {
  const context = vm.createContext({ console, document: { createElement: tag => new Element(tag) } });
  vm.runInContext(script + '\nlet mentors = [];', context);
  const run = code => vm.runInContext(code, context);
  context.fixtureCSV = fs.readFileSync(path.join(root, 'test-data/test-teens-export.csv'), 'utf8');
  const base = run('parseCSV(fixtureCSV).records[0]');
  function record(name, matches = 8, rawIds = false) {
    const result = { ...base, first_name: name, email: name.toLowerCase() + '@example.test' };
    result['What fills your time?'] = 'Music';
    result["Want a mentor who's been through it too?"] = 'Anxiety';
    for (const [index, question] of questions.entries()) {
      const option = question.options[index < matches ? 0 : 1];
      result[question.id] = rawIds ? option.id : option.label;
    }
    return result;
  }
  function people(records, role = 'teen') {
    context.csvInput = csv(records);
    return run(`readPeople(csvInput, ${JSON.stringify(role)})`);
  }
  function score(teen, mentorRecords) {
    context.teen = teen;
    context.candidates = people(mentorRecords, 'mentor').people;
    return run('mentors = candidates; scoreMentors(teen)');
  }
  return { context, run, record, people, score };
}

test('imports all eight unique export columns as validated answers', () => {
  const { record, people } = setup();
  for (const rawIds of [false, true]) {
    const result = people([record('Teen', 8, rawIds)]);
    assert.equal(result.people.length, 1);
    assert.deepEqual(Array.from(result.people[0].lightning.answers),
      questions.map(question => question.options[0].label));
    assert.equal(result.people[0].lightning.problems.length, 0);
    assert.doesNotMatch(result.notices.map(notice => notice[1]).join(' '), /not available|left out/);
  }
});

for (const matches of [0, 1, 6, 8]) {
  test(`${matches} shared taps earns ${matches / 8 * 15} Lightning Round points`, () => {
    const { context, run, record, people } = setup();
    context.teen = people([record('Teen')]).people[0];
    context.mentor = people([record('Mentor', matches)], 'mentor').people[0];
    const result = run('lightningScore(teen, mentor)');
    assert.equal(result.shared.length, matches);
    assert.equal(result.points, matches / 8 * 15);
    assert.deepEqual(Array.from(result.shared), questions.slice(0, matches).map(q => q.options[0].label));
  });
}

for (const change of ['missing', 'invalid', 'wrong question']) {
  test(`${change} answer is flagged and cannot earn Lightning Round points`, () => {
    const { context, run, record, people } = setup();
    const incomplete = record('Incomplete');
    incomplete.lightning_01 = change === 'missing' ? ''
      : change === 'invalid' ? 'Unexpected answer' : questions[1].options[0].label;
    const loaded = people([incomplete]);
    assert.ok(loaded.notices.some(notice => /lightning_01/.test(notice[1])));
    context.teen = loaded.people[0];
    context.mentor = people([record('Complete')], 'mentor').people[0];
    assert.equal(run('lightningScore(teen, mentor)'), null);
  });
}

test('Lightning Round changes ranking and the full score is out of 100', () => {
  const { record, people, score } = setup();
  const teen = people([record('Teen')]).people[0];
  const rows = score(teen, [record('Alpha', 0), record('Zoe', 8)]);
  assert.equal(rows[0].mentor.rec.first_name, 'Zoe');
  assert.equal(rows[0].total, 100);
  assert.equal(rows[0].percent, 100);
  assert.equal(rows[1].total, 85);
  assert.equal(rows[1].percent, 85);
});

test('legacy export stays explicitly unscored for Lightning Round', () => {
  const { context, run, people, record, score } = setup();
  const legacy = run('parseCSV(fixtureCSV).records[0]');
  const result = people([legacy]);
  assert.match(result.notices.map(notice => notice[1]).join(' '), /Lightning|lightning/);
  const rows = score(result.people[0], [record('Mentor')]);
  context.teen = result.people[0];
  assert.equal(run('pointsPossible(teen)'), 85);
  assert.equal(rows[0].lightning, null);
});

test('incomplete mentor data never mixes 85-point and 100-point rankings for one teen', () => {
  const { context, run, people, record, score } = setup();
  const teen = people([record('Teen')]).people[0];
  const incomplete = record('Incomplete');
  incomplete.lightning_08 = '';
  const rows = score(teen, [record('Complete'), incomplete]);
  context.teen = teen;
  assert.equal(run('pointsPossible(teen)'), 85);
  assert.ok(rows.every(row => row.lightning === null));
});

test('Google mentor form and admin export map the same question positions', () => {
  const { context, run, record, people } = setup();
  context.formCSV = fs.readFileSync(path.join(root, 'test-data/test-mentor-form.csv'), 'utf8');
  const formRecord = run('parseCSV(formCSV).records[0]');
  const teenRecord = record('Teen');
  for (const [index, question] of questions.entries()) {
    teenRecord[question.id] = formRecord[`Lightning round ${index + 1} of 8`];
  }
  context.teen = people([teenRecord]).people[0];
  context.mentor = run('readPeople(formCSV, "mentor").people[0]');
  assert.equal(run('lightningScore(teen, mentor).points'), 15);
});

test('shared taps and all-eight star appear in the suggestion cards and full table', () => {
  const { context, run, record, people, score } = setup();
  const teen = people([record('Teen')]).people[0];
  score(teen, [record('Mentor')]);
  context.teen = teen;
  const cards = run('renderTopMatches(teen)').textContent;
  assert.match(cards, /Lightning round/);
  assert.match(cards, /⭐ All 8 the same/);
  assert.match(cards, /Making a playlist/);
  assert.match(cards, /15 of 15/);
  assert.match(run('renderScores(teen)').textContent, /Lightning round/);
});

test('changed Lightning Round weight affects points and percentage denominator together', () => {
  const { context, run, record, people, score } = setup();
  run('WEIGHTS = {...WEIGHTS, lightning: 30};');
  const teen = people([record('Teen')]).people[0];
  const rows = score(teen, [record('Mentor')]);
  context.teen = teen;
  assert.equal(rows[0].lightning.points, 30);
  assert.equal(rows[0].total, 115);
  assert.equal(run('pointsPossible(teen)'), 115);
  assert.equal(rows[0].percent, 100);
});

test('reordered CSV columns keep answers attached to their IDs and their person', () => {
  const { context, run, record } = setup();
  const records = [record('First', 8), record('Second', 0)];
  const reverse = object => Object.fromEntries(Object.entries(object).reverse());
  context.csvInput = csv(records.map(reverse));
  const people = run('readPeople(csvInput).people');
  assert.deepEqual(Array.from(people[0].lightning.answers), questions.map(q => q.options[0].label));
  assert.deepEqual(Array.from(people[1].lightning.answers), questions.map(q => q.options[1].label));
});

test('duplicate Lightning Round column IDs are rejected instead of silently overwritten', () => {
  const { context, run, record } = setup();
  context.csvInput = csv([record('Teen')]).split('\r\n').map((line, i) =>
    line + ',"' + (i === 0 ? 'lightning_01' : 'Making a playlist') + '"').join('\r\n');
  const result = run('readPeople(csvInput)');
  assert.equal(result.people.length, 0);
  assert.match(result.notices[0][1], /Repeated Lightning round columns/);
});

test('fictional visual-test fixtures match the independent 100 / 96.25 / 85 answer key', () => {
  const { context, run } = setup();
  context.teenCSV = fs.readFileSync(path.join(root, 'test-data/test-teens-lightning.csv'), 'utf8');
  context.mentorCSV = fs.readFileSync(path.join(root, 'test-data/test-mentors-lightning.csv'), 'utf8');
  const rows = run('mentors = readPeople(mentorCSV, "mentor").people; scoreMentors(readPeople(teenCSV).people[0])');
  assert.deepEqual(Array.from(rows, row => [row.mentor.rec.first_name, row.total, row.percent]),
    [['All Eight', 100, 100], ['Six Shared', 96.25, 96], ['No Shared', 85, 85]]);
});

test('actual file selectors accept the fictional mentor CSV and still warn about a teen file', async () => {
  const nodes = new Map();
  const document = {
    createElement: tag => new Element(tag),
    getElementById: id => {
      if (!nodes.has(id)) nodes.set(id, new Element('div'));
      return nodes.get(id);
    },
  };
  const context = vm.createContext({ console, document });
  vm.runInContext(fullScript, context);
  const eventFor = filename => ({ target: { files: [{ name: filename,
    text: async () => fs.readFileSync(path.join(root, 'test-data', filename), 'utf8') }] } });
  await nodes.get('teenFile').handlers.change(eventFor('test-teens-lightning.csv'));
  await nodes.get('mentorFile').handlers.change(eventFor('test-mentors-lightning.csv'));
  assert.equal(nodes.get('teenNotices').textContent, '');
  assert.equal(nodes.get('mentorNotices').textContent, '');
  assert.match(nodes.get('mentorList').textContent, /3 mentors in this file/);
  assert.match(nodes.get('teenList').textContent, /All Eight Mentor 100%/);
  assert.match(nodes.get('teenList').textContent, /Six Shared Mentor 96%/);
  assert.match(nodes.get('teenList').textContent, /No Shared Mentor 85%/);
  assert.match(nodes.get('teenList').textContent, /⭐ All 8 the same/);

  await nodes.get('mentorFile').handlers.change(eventFor('test-teens-lightning.csv'));
  assert.match(nodes.get('mentorNotices').textContent, /This looks like a teen file/);
});
