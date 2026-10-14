const fs = require('node:fs');
const path = require('node:path');
const here = __dirname;
let html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
// The public page links to the staff tool; omit that entry from the staff page itself.
html = html.replace(/  <!-- STAFF_ENTRY_START -->[\s\S]*?  <!-- STAFF_ENTRY_END -->\n/, '');
html = html.replace('<head>', '<head>\n<base target="_top">');
html = html.replace('Files you open here stay on this computer. Nothing is uploaded, sent or saved. Closing or refreshing the page clears everything.', 'Answer files are read temporarily in this browser. When you record a decision, the teen and mentor identities, suggestions and scores, required reason, and status are saved to the private team log in Google Drive. The tool does not assign anyone in the admin portal.');
html = html.replace('</main>', '<section class="panel" id="matchHistory"><h2>Match decision history</h2><p id="logStatus" role="status" aria-live="polite">Loading private team log…</p><button id="refreshLog" type="button">Refresh history</button><div id="historyRows"></div></section>\n</main>');
html = html.replace('ordered.forEach(p => list.append(renderTeen(p)));', 'ordered.forEach(p => { const card = renderTeen(p); card.append(decisionForm(p)); list.append(card); });');
html = html.replace('</body>', '<style>select,textarea{font:inherit;padding:8px;max-width:100%;}textarea{width:100%;min-height:80px;} .decision-form{margin-top:16px;border-top:1px solid #e6e1dc;padding-top:12px;} .decision-form label{display:block;margin:8px 0;} .decision-form button,#matchHistory button{padding:8px 12px;margin:6px 8px 6px 0;cursor:pointer;} .decision-form p{margin:8px 0;} .history-event{border-top:1px solid #e6e1dc;padding:12px 0;} .saved{color:#245530;} .unsaved{color:#8a251c;}</style>\n<script>\n' + fs.readFileSync(path.join(here,'client.js'),'utf8') + '\n</script>\n</body>');
fs.writeFileSync(path.join(here, 'Index.html'), html);
console.log('Built Apps Script Index.html from the existing scoring tool; public index.html is unchanged.');
