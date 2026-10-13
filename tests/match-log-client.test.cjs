const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');const crypto=require('node:crypto');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.value='';this.disabled=false;this._text='';}
 setAttribute(k,v){this.attrs[k]=v;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];this._text='';}
 addEventListener(k,f){this.handlers[k]=f;}
 get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join(' ');}
 set textContent(t){this._text=t;this.children=[];}
}
const nodes=new Map();const calls=[];const windowEvents={};
const document={createElement:t=>new Element(t),getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Element('div'));return nodes.get(id);}};
const runner=(success,failure)=>new Proxy({}, {get:(_,method)=>method==='withSuccessHandler'?f=>runner(f,failure):method==='withFailureHandler'?f=>runner(success,f):data=>calls.push({method,data,success,failure})});
const ctx=vm.createContext({document,window:{addEventListener:(k,f)=>windowEvents[k]=f},google:{script:{run:runner()}},crypto:{randomUUID:()=>crypto.randomUUID()},console});
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'apps-script/Index.html'),'utf8');
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],ctx);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const descendants=(node, predicate)=>[...(predicate(node)?[node]:[]),...node.children.filter(c=>c instanceof Element).flatMap(c=>descendants(c,predicate))];
(async()=>{
 assert.equal(calls[0].method,'loadMatchLog');
 calls.shift().success({email:'staff@example.com',events:[]});await flush();
 ctx.teenCSV=fs.readFileSync(path.join(root,'test-data/test-teens-export.csv'),'utf8');
 ctx.mentorCSV=fs.readFileSync(path.join(root,'test-data/test-mentor-form.csv'),'utf8');
 vm.runInContext('teens=readPeople(teenCSV).people; mentors=readPeople(mentorCSV,"mentor").people; renderTeens();',ctx);
 let form=descendants(nodes.get('teenList'),e=>e.attrs.class==='decision-form')[0];
 let button=descendants(form,e=>e.tag==='button'&&e.textContent==='Record decision')[0];
 await button.handlers.click();assert.equal(calls.length,0);assert.match(form.textContent,/enter the required reason/);
 const select=descendants(form,e=>e.tag==='select')[0];select.value='testmentor@example.com';select.handlers.change();
 const reason=descendants(form,e=>e.tag==='textarea')[0];reason.value='Fictional selection reason.';reason.handlers.input();
 const save=button.handlers.click();assert.equal(calls[0].method,'saveMatchEvent');assert.equal(select.disabled,true);assert.equal(reason.disabled,true);
 const request=calls.shift();assert.equal(request.data.reason,'Fictional selection reason.');assert.equal(request.data.suggestions.length,1);
 request.failure(new Error('Simulated connection loss'));await save;
 assert.equal(button.textContent,'Retry save');assert.equal(reason.value,'Fictional selection reason.');assert.match(form.textContent,/Save not confirmed/);
 let warned=false;windowEvents.beforeunload({preventDefault:()=>{warned=true;}});assert.equal(warned,true);
 const retry=button.handlers.click();const repeated=calls.shift();assert.equal(repeated.data.eventId,request.data.eventId);
 repeated.success({saved:true,event:{...request.data,at:'2026-10-12T20:00:00.000Z',by:'staff@example.com',status:'Pending assignment'}});await retry;
 assert.match(nodes.get('historyRows').textContent,/Pending assignment/);
 assert.match(nodes.get('logStatus').textContent,/Saved:/);
 const confirm=descendants(nodes.get('historyRows'),e=>e.tag==='button'&&e.textContent==='Confirm completed assignment')[0];
 await confirm.handlers.click();assert.equal(calls.length,0);
 const check=descendants(nodes.get('historyRows'),e=>e.tag==='input')[0];check.checked=true;
 const confirmSave=confirm.handlers.click();const sent=calls.shift();assert.equal(sent.data.action,'confirm');assert.equal(sent.data.previousEventId,request.data.eventId);
 sent.success({saved:true,event:{...request.data,...sent.data,at:'2026-10-12T20:01:00.000Z',by:'staff@example.com',status:'Confirmed in admin'}});await confirmSave;
 assert.match(nodes.get('historyRows').textContent,/Confirmed in admin/);
 warned=false;windowEvents.beforeunload({preventDefault:()=>{warned=true;}});assert.equal(warned,false);
 const reload=vm.runInContext('refreshMatchLog()',ctx);calls.shift().failure(new Error('No access'));await reload;
 assert.match(nodes.get('logStatus').textContent,/Recording is unavailable/);
 assert.match(nodes.get('teenList').textContent,/Load the private history/);
 console.log('PASS: UI requires reason; shows unconfirmed failures; preserves draft; retries same ID; shows saved status; confirms only after checkbox; warns on unresolved drafts; blocks recording when history cannot load.');
})().catch(e=>{console.error(e);process.exitCode=1;});
