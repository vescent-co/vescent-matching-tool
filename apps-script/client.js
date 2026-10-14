let logEvents = [];
let logReady = false;
let logBusy = false;
const decisionDrafts = new Map();
const confirmationRequests = new Map();

function logCall(method, data) {
  return new Promise((resolve, reject) => {
    const runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
    if (data === undefined) runner[method](); else runner[method](data);
  });
}
function currentDecision(teenId) {
  return logEvents.filter(e => e.teenId === teenId).at(-1);
}
function personName(rec) {
  return [rec.first_name, rec.last_name].filter(Boolean).join(' ') || rec.username || 'No name';
}
function logMessage(message, error = false) {
  const box = document.getElementById('logStatus');
  box.textContent = message;
  box.className = error ? 'unsaved' : 'saved';
}
async function refreshMatchLog() {
  if (logBusy) return;
  logBusy = true;
  logReady = false;
  document.getElementById('refreshLog').disabled = true;
  logMessage('Loading private team log…');
  try {
    const result = await logCall('loadMatchLog');
    logEvents = result.events;
    logReady = true;
    logMessage('History loaded for ' + result.email + '. Decisions save to the team Google Sheet.');
  } catch (error) {
    logMessage('History could not be loaded. Recording is unavailable. ' + error.message, true);
  } finally {
    logBusy = false;
    document.getElementById('refreshLog').disabled = false;
    renderHistory();
    renderTeens();
  }
}
function decisionForm(teen) {
  const teenId = teen.rec.user_id;
  const box = el('section', {class:'decision-form'}, el('h3', {}, 'Record a match decision'));
  if (!teenId) { box.append(el('p', {class:'unsaved'}, 'Teen account ID is missing. Check the admin export before recording a decision.')); return box; }
  if (!logReady) { box.append(el('p', {class:'unsaved'}, 'Load the private history before recording a decision.')); return box; }
  const latest = currentDecision(teenId);
  if (latest) box.append(el('p', {}, 'Existing decision: ' + latest.mentorName + ' · ' + latest.status + '. Check the admin roster before changing it.'));
  if (!decisionDrafts.has(teenId)) decisionDrafts.set(teenId, {mentorEmail:'', reason:'', pending:null, correcting:false});
  const draft = decisionDrafts.get(teenId);
  if (latest && !draft.correcting && !draft.pending) {
    const correct = el('button', {type:'button'}, 'Correct decision');
    correct.disabled = logBusy;
    correct.addEventListener('click', () => {draft.correcting = true; renderTeens();});
    box.append(correct);
    return box;
  }
  const rows = scoreMentors(teen);
  const select = el('select', {'aria-label':'Chosen mentor for ' + personName(teen.rec)}, el('option', {value:''}, 'Choose the mentor you selected'));
  for (const row of rows) {
    const rec = row.mentor.rec;
    if (rec.email) select.append(el('option', {value:rec.email.trim().toLowerCase()}, personName(rec) + ' · ' + row.percent + '%'));
  }
  select.value = draft.mentorEmail;
  select.disabled = !!draft.pending || logBusy;
  select.addEventListener('change', () => {draft.mentorEmail = select.value;});
  const reason = el('textarea', {maxlength:'1000',required:'', 'aria-label':'Required reason for ' + personName(teen.rec)});
  reason.value = draft.reason;
  reason.disabled = !!draft.pending || logBusy;
  reason.addEventListener('input', () => {draft.reason = reason.value;});
  const message = el('p', {role:'status','aria-live':'polite'});
  const save = el('button', {type:'button'}, draft.pending ? 'Retry save' : latest ? 'Save corrected decision' : 'Record decision');
  save.disabled = logBusy || !rows.length;
  save.addEventListener('click', async () => {
    if (logBusy) return;
    if (!draft.pending) {
      const selected = rows.find(r => (r.mentor.rec.email || '').trim().toLowerCase() === draft.mentorEmail);
      if (!selected || !draft.reason.trim()) {message.textContent = 'Choose a mentor and enter the required reason.'; message.className = 'unsaved'; return;}
      const suggested = topMatches(rows);
      if (!suggested.includes(selected)) suggested.push(selected);
      draft.pending = {
        eventId:crypto.randomUUID(), decisionId:latest ? latest.decisionId : crypto.randomUUID(), previousEventId:latest ? latest.eventId : '', action:latest ? 'correct' : 'record',
        teenId, teenName:personName(teen.rec), mentorEmail:draft.mentorEmail, mentorName:personName(selected.mentor.rec), reason:draft.reason.trim(),
        suggestions:suggested.map(r => ({name:personName(r.mentor.rec),email:r.mentor.rec.email || '',total:r.total,percent:r.percent})), weights:{...WEIGHTS},possible:pointsPossible(),
      };
    }
    logBusy = true;
    save.disabled = select.disabled = reason.disabled = true;
    message.textContent = 'Saving… Keep this page open until confirmation.';
    try {
      const result = await logCall('saveMatchEvent', draft.pending);
      if (!result.saved) throw new Error('No saved confirmation was received.');
      if (!logEvents.some(e => e.eventId === result.event.eventId)) logEvents.push(result.event);
      decisionDrafts.delete(teenId);
      logMessage('Saved: ' + result.event.teenName + ' → ' + result.event.mentorName + '. ' + result.event.status + '.');
      logBusy = false;
      renderHistory(); renderTeens();
    } catch (error) {
      logBusy = false;
      save.disabled = false; save.textContent = 'Retry save';
      message.textContent = 'Save not confirmed. Retry uses the same record identifier to avoid duplicates. ' + error.message;
      message.className = 'unsaved';
      logMessage('A decision save is unresolved. Keep this page open and retry or check the history.', true);
    }
  });
  const edit = el('button', {type:'button'}, 'Cancel retry and edit');
  edit.addEventListener('click', () => {if(logBusy) return; draft.pending=null; draft.correcting=!!latest; renderTeens();});
  box.append(el('label', {}, 'Chosen mentor', select), el('label', {}, 'Reason (required, up to 1,000 characters)', reason),
    el('p', {}, 'Recording saves history only. Make the assignment in the admin portal, then confirm it below.'),save,message);
  if (draft.pending) box.append(edit);
  return box;
}
function renderHistory() {
  const box = document.getElementById('historyRows');
  box.replaceChildren();
  if (!logReady) return;
  const latest = new Map();
  logEvents.forEach(e => latest.set(e.decisionId,e));
  if (!latest.size) {box.append(el('p', {}, 'No decisions recorded yet. Existing admin assignments are not imported automatically.')); return;}
  [...latest.values()].reverse().forEach(event => {
    const row = el('article', {class:'history-event'},
      el('h3', {}, event.teenName + ' → ' + event.mentorName),
      el('p', {}, event.status + ' · ' + new Date(event.at).toLocaleString('en-US',{timeZone:'America/New_York'}) + ' Eastern · ' + event.by),
      el('p', {}, 'Reason: ' + event.reason));
    const details = el('details', {}, el('summary', {}, 'Decision history and score snapshots'));
    logEvents.filter(e => e.decisionId === event.decisionId).forEach(e => details.append(el('p', {},
      e.at + ' · ' + e.by + ' · ' + e.action + ' · ' + e.mentorName + ' · ' + e.reason + ' · Suggestions: ' + e.suggestions.map(m => m.name + ' ' + m.percent + '% (' + formatPoints(m.total) + '/' + e.possible + ')').join('; ') + ' · Weights: ' + JSON.stringify(e.weights))));
    row.append(details);
    if (event.status === 'Pending assignment') {
      const confirmed = el('input', {type:'checkbox',id:'confirm-'+event.eventId});
      const label = el('label', {for:'confirm-'+event.eventId}, confirmed, ' I have completed this exact teen–mentor assignment in the admin portal.');
      const button = el('button', {type:'button'}, confirmationRequests.has(event.eventId) ? 'Retry confirmation' : 'Confirm completed assignment');
      const message = el('p', {role:'status','aria-live':'polite'});
      button.disabled = logBusy;
      button.addEventListener('click', async () => {
        if(logBusy) return;
        if (!confirmed.checked && !confirmationRequests.has(event.eventId)) {message.textContent='Check the assignment confirmation first.'; return;}
        if (!confirmationRequests.has(event.eventId)) confirmationRequests.set(event.eventId,{action:'confirm',eventId:crypto.randomUUID(),decisionId:event.decisionId,previousEventId:event.eventId});
        logBusy=true; button.disabled=true; message.textContent='Saving confirmation…';
        try {
          const result=await logCall('saveMatchEvent',confirmationRequests.get(event.eventId));
          if(!result.saved) throw new Error('No saved confirmation was received.');
          if(!logEvents.some(e => e.eventId===result.event.eventId)) logEvents.push(result.event);
          confirmationRequests.delete(event.eventId);
          logBusy=false; logMessage('Saved: assignment confirmed for '+event.teenName+'.'); renderHistory(); renderTeens();
        } catch(error) {
          logBusy=false; button.disabled=false; button.textContent='Retry confirmation'; message.textContent='Confirmation save unresolved. '+error.message; message.className='unsaved';
        }
      });
      row.append(label,button,message);
    }
    box.append(row);
  });
}
window.addEventListener('beforeunload', event => {
  if (logBusy || confirmationRequests.size || [...decisionDrafts.values()].some(d => d.pending || d.mentorEmail || d.reason)) {event.preventDefault(); event.returnValue='';}
});
document.getElementById('refreshLog').addEventListener('click',refreshMatchLog);
refreshMatchLog();
