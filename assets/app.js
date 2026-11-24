/* Arabisht nga shqipja — logjika e aplikacionit (pa framework, pa build) */
{
const U=window.UNITS||[],SOON=window.SOON||[];
const DN=['Fjalor i ri','Dialogu 1','Gramatika','Fjalor + Dialogu 2','Përsëritje e përzier','Fol dhe ndërto','Testi i javës'];
const INT=[1,2,4,7,15,30,60];
const PASS=80;

/* ---------- GJENDJA ---------- */
const KEY='bayna-sq-v1';
const fresh=()=>({done:{},cards:{},streak:0,best:0,last:'',free:false,tr:true,log:{},scores:{}});
let S=null;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
S={...fresh(),...(S&&typeof S==='object'?S:{})};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const fmt=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dayAt=n=>{const d=new Date();d.setDate(d.getDate()+n);return fmt(d)};
const today=()=>dayAt(0);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const DAYS=[];U.forEach((u,ui)=>DN.forEach((n,di)=>DAYS.push({ui,di,id:'u'+u.n+'d'+(di+1)})));
const unlocked=i=>{if(i===0)return true;const p=S.done[DAYS[i-1].id];return !!p&&(S.free||p<today())};
const curIdx=()=>DAYS.findIndex(d=>!S.done[d.id]);
const streak=()=>(S.last===today()||S.last===dayAt(-1))?S.streak:0;
const activity=()=>{const t=today();S.log[t]=(S.log[t]||0)+1;if(S.last!==t){S.streak=S.last===dayAt(-1)?S.streak+1:1;S.last=t}S.best=Math.max(S.best||0,S.streak)};
const due=()=>Object.entries(S.cards).filter(([,c])=>c.due<=today());
const ALLW=U.flatMap(u=>u.A.concat(u.B).map(w=>({ar:w[0],sq:w[1],tr:w[2],u:u.n})));
const app=document.getElementById('app');
let toastT;const toast=m=>{let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),3200)};

/* ---------- ZËRI (Web Speech API, falas, në pajisje) ---------- */
let V=null;const pickV=()=>{try{const vs=speechSynthesis.getVoices();V=vs.find(v=>/^ar[-_]SA/i.test(v.lang))||vs.find(v=>/^ar/i.test(v.lang))||null}catch(e){}};
try{pickV();speechSynthesis.onvoiceschanged=pickV}catch(e){}
let warned=false;
const utter=(t,cb)=>{const u=new SpeechSynthesisUtterance(t);u.lang='ar-SA';if(V)u.voice=V;u.rate=.8;if(cb)u.onend=cb;speechSynthesis.speak(u)};
const speak=t=>{try{speechSynthesis.cancel();if(!V&&!warned){warned=true;toast('Pajisja mund të mos ketë zë arabisht. Shtoje te cilësimet e gjuhës/zërit ose provo Chrome.')}utter(t)}catch(e){toast('Zëri nuk punon në këtë shfletues.')}};
const playAll=(ls,i=0)=>{try{if(i===0)speechSynthesis.cancel();if(i<ls.length)utter(ls[i],()=>playAll(ls,i+1))}catch(e){}};
const hush=()=>{try{speechSynthesis.cancel()}catch(e){}};

/* ---------- PYETJET ---------- */
const mk=q=>({k:'mcq',t:'Zgjidh përgjigjen e saktë',p:q.p,opts:shuffle(q.o),a:q.o[0],optAr:!!q.ar});
const vq=(ws,pool,n)=>shuffle(ws.map((w,i)=>{const o=shuffle(pool.filter(x=>x[0]!==w[0]&&x[1]!==w[1])).slice(0,3);
 return i%2?{k:'mcq',t:'Si thuhet në arabisht?',p:w[1],opts:shuffle([w[0],...o.map(x=>x[0])]),a:w[0],optAr:true}
 :{k:'mcq',t:'Çfarë do të thotë?',p:w[0],pAr:true,opts:shuffle([w[1],...o.map(x=>x[1])]),a:w[1]}})).slice(0,n||99);
const bq=(u,all)=>u.build.map(b=>{const ex=shuffle(all.map(w=>w[0]).filter(w=>!w.includes(' ')&&!b[1].includes(w)))[0];return{k:'build',p:b[0],tiles:b[1],pool:shuffle(ex?b[1].concat(ex):b[1])}});
function steps(i){const d=DAYS[i],u=U[d.ui],all=u.A.concat(u.B),prev=U.slice(0,d.ui).flatMap(x=>x.A.concat(x.B));
 const old=prev.length?vq(shuffle(prev).slice(0,3),prev):[];
 switch(d.di){
 case 0:return[{k:'cards',w:u.A},{k:'quiz',q:vq(u.A,u.A)}];
 case 1:return[{k:'dialog',d:u.D1},{k:'quiz',q:u.D1.q.map(mk)}];
 case 2:return[{k:'gram',g:u.G},{k:'quiz',q:shuffle(u.G.ex.map(mk))}];
 case 3:return[{k:'cards',w:u.B},{k:'dialog',d:u.D2},{k:'quiz',q:vq(u.B,all).concat(u.D2.q.map(mk))}];
 case 4:return[{k:'quiz',q:shuffle(vq(all,all,12).concat(shuffle(u.G.ex).slice(0,4).map(mk),old))}];
 case 5:return[{k:'quiz',q:bq(u,all).concat(u.say.map(s=>({k:'say',p:s[0],a:s[1]})))}];
 case 6:return[{k:'quiz',test:true,q:shuffle(vq(all,all,10).concat(shuffle(u.G.ex).slice(0,4).map(mk),old,bq(u,all).slice(0,2)))}];
 }}

/* ---------- NAVIGIMI ---------- */
let tab='home';
const setTab=t=>{tab=t;document.body.classList.remove('inlesson');hush();
 document.querySelectorAll('.tab').forEach(b=>b.toggleAttribute('aria-current',b.dataset.tab===t)&&b.setAttribute('aria-current','page'));
 try{history.replaceState(null,'',t==='home'?location.pathname:'#'+t)}catch(e){}
 ({home,dict,stats})[t]();scrollTo(0,0)};
document.querySelector('.nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)setTab(b.dataset.tab)});

/* ---------- KRYEFAQJA ---------- */
function home(){
 const ci=curIdx(),cd=ci>=0?DAYS[ci]:null,open=ci>=0&&unlocked(ci),nd=due().length,doneN=Object.keys(S.done).length;
 let th;
 if(!cd)th=`<div class="t">I përfundove të gjitha njësitë që janë gati. Mashallah!</div><div class="k">Vazhdo me përsëritjen e përditshme derisa të shtohen njësitë e reja.</div>${nd?`<div class="row"><button class="btn" data-rev>Përsërit ${nd} fjalë</button></div>`:''}`;
 else if(open)th=`<div class="k">Mësimi i sotëm · Njësia ${U[cd.ui].n}, dita ${cd.di+1} nga 7</div><div class="t">${esc(DN[cd.di])}</div><div class="row"><button class="btn" data-go="${ci}">Fillo mësimin</button>${nd?`<button class="btn sec" data-rev>Përsërit ${nd} fjalë</button>`:''}</div>`;
 else th=`<div class="k">Mësimi i sotëm u krye</div><div class="t">Dita e radhës (${esc(DN[cd.di])}) hapet nesër.</div><div class="k">Pushimi mes mësimeve e ndihmon kujtesën.${nd?' Ndërkohë ke fjalë për përsëritje.':''}</div>${nd?`<div class="row"><button class="btn" data-rev>Përsërit ${nd} fjalë</button></div>`:''}`;
 app.innerHTML=`<section class="band hero"><div class="wrap">
 <p class="big ar">العَرَبِيَّةُ بَيْنَ يَدَيْكَ</p>
 <h1>Arabisht nga shqipja, një njësi në javë</h1>
 <p class="lead">15–20 minuta në ditë. Çdo njësi ka 7 ditë: fjalor, dialogë, gramatikë, përsëritje, të folur dhe test në fund të javës.</p>
 <div class="today">${th}</div>
 <div class="stats"><div class="stat"><b>${streak()}</b><span>ditë radhazi</span></div><div class="stat"><b>${doneN}/${DAYS.length}</b><span>mësime të kryera</span></div><div class="stat"><b>${Object.keys(S.cards).length}</b><span>fjalë të mësuara</span></div></div>
 </div></section>
 <section class="band"><div class="wrap">
 ${U.map((u,ui)=>`<div class="unit"><div class="uh"><div><div style="color:var(--mut);font-size:14px">Njësia ${u.n} · java ${u.n}${S.scores['u'+u.n]?` · testi ${S.scores['u'+u.n]}%`:''}</div><h2>${esc(u.sq)}</h2></div><span class="ar">${esc(u.ar)}</span></div>
 <div class="path">${DN.map((n,di)=>{const i=ui*7+di,d=DAYS[i],done=!!S.done[d.id],ok=unlocked(i),cur=i===ci&&ok;
 return`<button class="node ${done?'done':''} ${cur?'cur':''}" data-go="${i}" ${ok?'':'disabled'} aria-label="Dita ${di+1}: ${esc(n)}${done?' (e kryer)':ok?'':' (e mbyllur)'}"><i>${done?'✓':di+1}</i><small>${esc(n)}</small></button>`}).join('')}</div></div>`).join('')}
 <h3>Njësitë që vijnë</h3><div class="soon">${SOON.map((s,i)=>`<div><span class="ar">${esc(s[0])}</span>${U.length+i+1}. ${esc(s[1])}</div>`).join('')}</div>
 </div></section>
 <section class="band" style="background:var(--sand)"><div class="wrap"><h2>Pse funksionon kjo mënyrë</h2><div class="how">
 <div><b>Nxjerrja nga kujtesa.</b> Nuk e lexon vetëm mësimin: përgjigjesh, ndërton fjali dhe flet. Kjo i fiksojnë fjalët më mirë se rileximi.</div>
 <div><b>Përsëritje me intervale.</b> Fjalët kthehen pas 1, 2, 4, 7, 15, 30 e 60 ditësh, pikërisht kur fillon t’i harrosh.</div>
 <div><b>Përzierje.</b> Dita 5 dhe testi i përziejnë fjalorin, gramatikën dhe fjalët e njësive të kaluara.</div>
 <div><b>Pak, por çdo ditë.</b> Një mësim në ditë dhe një seri ditësh radhazi. Gabimet kthehen në fund derisa t’i bësh saktë.</div>
 </div></div></section>
 <section class="band set"><div class="wrap"><h2>Cilësimet</h2>
 <label><input type="checkbox" id="tr" ${S.tr?'checked':''}> Trego transliterimin te fjalët e reja</label>
 <label><input type="checkbox" id="free" ${S.free?'checked':''}> Mënyra e lirë: hap ditën tjetër pa pritur nesër</label>
 <p class="lead" style="font-size:14px">Dialogët dhe ushtrimet janë shkruar posaçërisht për këtë platformë sipas temave të librit 1 të «العربية بين يديك». Nuk janë kopje e tekstit të librit. Progresi ruhet në këtë pajisje; te “Progresi” mund ta ruash ose ta kalosh në një pajisje tjetër.</p></div></section>`;
}

/* ---------- FJALORI ---------- */
let dq='',dmode='learned';
function dict(){
 const learned=Object.keys(S.cards).length;
 app.innerHTML=`<section class="band"><div class="wrap"><h1>Fjalori</h1><p class="lead">Të gjitha fjalët e platformës. Prek një fjalë për ta dëgjuar. Pikat tregojnë sa mirë e di.</p>
 <input class="search" id="dq" type="search" placeholder="Kërko shqip ose arabisht…" value="${esc(dq)}" autocomplete="off">
 <div class="seg"><button data-dm="learned" aria-pressed="${dmode==='learned'}">Të mësuarat (${learned})</button><button data-dm="all" aria-pressed="${dmode==='all'}">Të gjitha (${ALLW.length})</button>${U.map(u=>`<button data-dm="u${u.n}" aria-pressed="${dmode==='u'+u.n}">Njësia ${u.n}</button>`).join('')}</div>
 <div class="words" id="wl"></div></div></section>`;
 renderWords();
}
const strip=s=>s.replace(/[ً-ْٰـ]/g,'').toLowerCase();
function renderWords(){
 const q=strip(dq.trim());
 let ws=ALLW.filter(w=>dmode==='all'||(dmode==='learned'?S.cards[w.ar]:'u'+w.u===dmode));
 if(q)ws=ws.filter(w=>strip(w.ar).includes(q)||w.sq.toLowerCase().includes(q)||(w.tr||'').toLowerCase().includes(q));
 const seen=new Set();ws=ws.filter(w=>!seen.has(w.ar)&&seen.add(w.ar));
 const el=document.getElementById('wl');
 el.innerHTML=ws.length?ws.map(w=>{const c=S.cards[w.ar],lv=c?c.b+1:0;return`<button class="word card" style="text-align:start" data-say="${esc(w.ar)}"><span><span class="m">${esc(w.sq)}</span><br><span class="u">Njësia ${w.u}${S.tr?' · '+esc(w.tr):''}</span></span><span class="lvl" aria-label="Niveli ${lv} nga 7">${INT.map((x,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</span><span class="ar">${esc(w.ar)}</span></button>`}).join('')
 :`<div class="empty">${dmode==='learned'&&!q?'Ende s’ke fjalë të mësuara. Fillo mësimin e parë dhe fjalët do të shfaqen këtu.':'Asnjë fjalë nuk përputhet me kërkimin.'}</div>`;
}

/* ---------- PROGRESI ---------- */
function stats(){
 const cards=Object.values(S.cards),mast=cards.filter(c=>c.b>=3).length,days=Object.keys(S.log).length;
 const start=new Date();start.setDate(start.getDate()-27);
 const cal=[...Array(28)].map((_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const k=fmt(d),n=S.log[k]||0;return`<i class="${n>1?'a2':n?'a1':''}" title="${k}">${d.getDate()}</i>`}).join('');
 app.innerHTML=`<section class="band"><div class="wrap"><h1>Progresi</h1>
 <div class="grid2"><div class="box"><b>${streak()}</b><span>ditë radhazi tani</span></div><div class="box"><b>${S.best||0}</b><span>seria më e gjatë</span></div><div class="box"><b>${days}</b><span>ditë aktive gjithsej</span></div><div class="box"><b>${mast}/${cards.length}</b><span>fjalë të forta (niveli 4+)</span></div></div>
 <h3>28 ditët e fundit</h3><div class="cal">${cal}</div>
 <h3>Njësitë</h3><div class="bars">${U.map(u=>{const n=DN.filter((_,i)=>S.done['u'+u.n+'d'+(i+1)]).length,sc=S.scores['u'+u.n];return`<div class="bar"><span>${esc(u.sq)}</span><span class="t"><b style="width:${Math.round(n/7*100)}%"></b></span><span class="v">${sc?sc+'%':n+'/7'}</span></div>`}).join('')}</div>
 <h2>Ruaje progresin</h2><p class="lead">Progresi ruhet vetëm në këtë shfletues. Shkarko një kopje ose kopjo kodin, pastaj ngarkoje në telefon a kompjuter tjetër.</p>
 <div class="row"><button class="btn" id="dl">Shkarko kopjen (.json)</button><label class="btn sec" style="display:inline-flex;align-items:center">Ngarko kopjen<input type="file" id="up" accept=".json,application/json" hidden></label><button class="btn sec" id="cp">Kopjo kodin</button></div>
 <h3>Ose ngjite kodin këtu</h3><textarea id="code" placeholder="Ngjite kodin e progresit…"></textarea>
 <div class="row" style="margin-top:10px"><button class="btn sec" id="imp">Ngarko nga kodi</button><button class="btn sec" id="reset">Fshi progresin</button></div>
 </div></section>`;
}
const exportCode=()=>btoa(unescape(encodeURIComponent(JSON.stringify(S))));
const importData=txt=>{try{let o;try{o=JSON.parse(txt)}catch(e){o=JSON.parse(decodeURIComponent(escape(atob(txt.trim()))))}if(!o||typeof o!=='object'||!o.done)throw 0;S={...fresh(),...o};save();toast('Progresi u ngarkua.');setTab('home')}catch(e){toast('Kodi ose skedari nuk është i vlefshëm.')}};

/* ---------- MËSIMI ---------- */
let L=null,Q=null,R=null;
function startLesson(i){if(!unlocked(i))return;document.body.classList.add('inlesson');L={i,st:steps(i),s:0};renderStep()}
const bar=(frac,label)=>`<div class="lbar"><div class="row"><button class="x" data-home>✕ Mbyll</button><span style="font-size:14px;color:var(--mut)">${esc(label)}</span></div><div class="prog" role="progressbar" aria-valuenow="${Math.round(frac*100)}" aria-valuemin="0" aria-valuemax="100"><b style="width:${Math.round(frac*100)}%"></b></div></div>`;
function renderStep(){
 const st=L.st[L.s],d=DAYS[L.i],lab='Njësia '+U[d.ui].n+' · '+DN[d.di];
 if(st.k==='quiz'){Q={items:st.q.slice(),n:0,total:st.q.length,ok:0,test:!!st.test,lab};renderQ();return}
 let h='';
 if(st.k==='cards')h=`<h2>Fjalët e reja</h2><p class="lead">Prek secilën kartë për ta dëgjuar. Thuaje me zë dy herë dhe lidhe me një situatë nga jeta jote.</p><div class="cards">${st.w.map(w=>`<button class="card" data-say="${esc(w[0])}"><span class="ar">${esc(w[0])}</span>${S.tr?`<span class="tr">${esc(w[2])}</span>`:''}<span class="sq">${esc(w[1])}</span></button>`).join('')}</div>`;
 if(st.k==='dialog'){L.lines=st.d.l.map(l=>l[1]);h=`<h2>${esc(st.d.t)}</h2><p class="lead">1) Dëgjoje të gjithin pa përkthim. 2) Prek çdo rresht për përkthimin. 3) Lexoje me zë, duke luajtur njërin nga personat.</p><div class="row"><button class="btn sec" data-all>▶ Dëgjo dialogun</button><button class="btn sec" data-showall>Shfaq përkthimet</button></div><div class="dl">${st.d.l.map(l=>`<div class="line"><span class="who">${esc(l[0])}</span><div><div class="ar" data-tog>${esc(l[1])}</div><div class="sq">${esc(l[2])}</div></div><button class="play" data-say="${esc(l[1])}" aria-label="Dëgjo">▶</button></div>`).join('')}</div>`}
 if(st.k==='gram')h=`<h2>${esc(st.g.t)}</h2><p class="lead">Lexoje ngadalë. Mbulo kolonën shqip dhe provo t’i kujtosh kuptimet. Pastaj vijnë ushtrimet.</p><div class="gram">${st.g.h}</div>`;
 app.innerHTML=bar(L.s/L.st.length,lab)+`<section class="band"><div class="wrap">${h}<button class="btn" data-next>Vazhdo</button></div></section>`;
 scrollTo(0,0);
}
function renderQ(){
 const it=Q.items[0];if(!it)return finishQuiz();
 const frac=(L.s+(Q.n/(Q.n+Q.items.length)))/L.st.length;
 let h='';
 if(it.k==='mcq')h=`<div class="qt">${esc(it.t)}</div><div class="qp ${it.pAr?'ar':''}">${esc(it.p)} ${it.pAr?`<button class="play" data-say="${esc(it.p)}" aria-label="Dëgjo">▶</button>`:''}</div><div class="opts">${it.opts.map((o,j)=>`<button class="opt ${it.optAr?'ar':''}" data-opt="${j}">${esc(o)}</button>`).join('')}</div><p class="kbd">Tastiera: 1–4 për përgjigjen, Enter për të vazhduar.</p>`;
 if(it.k==='build'){it.sel=it.sel||[];h=`<div class="qt">Ndërto fjalinë në arabisht (prek fjalët sipas radhës; një fjalë është e tepërt)</div><div class="qp">${esc(it.p)}</div><div class="ans">${it.sel.map((t,j)=>`<button class="tile" data-un="${j}">${esc(it.pool[t])}</button>`).join('')}</div><div class="tiles">${it.pool.map((t,j)=>it.sel.includes(j)?'':`<button class="tile" data-tile="${j}">${esc(t)}</button>`).join('')}</div><div class="row" style="margin-top:16px"><button class="btn" data-check ${it.sel.length?'':'disabled'}>Kontrollo</button></div>`}
 if(it.k==='say')h=`<div class="qt">Thuaje me zë në arabisht, pastaj shiko përgjigjen</div><div class="qp">${esc(it.p)}</div><div id="rv"><button class="btn" data-show>E thashë, shfaq përgjigjen</button></div>`;
 app.innerHTML=bar(frac,Q.lab)+`<section class="band"><div class="q">${h}<div class="fb" id="fb" aria-live="polite"></div></div></section>`;
}
function feedback(ok,correct){
 const it=Q.items[0];
 if(ok)Q.ok++;else if(!Q.test)Q.items.push({...it,sel:[],answered:false,opts:it.opts?shuffle(it.opts):it.opts});
 const fb=document.getElementById('fb');fb.className='fb on '+(ok?'ok':'no');
 fb.innerHTML=`<p><b>${ok?'Saktë!':'Jo krejt.'}</b> ${ok?'':`Përgjigjja e saktë: <span class="ar" style="font-size:22px">${esc(correct)}</span>${Q.test?'':' (do të të dalë sërish)'}`}</p><button class="btn" data-qn>Vazhdo</button>`;
 fb.querySelector('[data-qn]').focus();
}
function finishQuiz(){
 if(Q.test){const pct=Math.round(Q.ok/Q.total*100),u=U[DAYS[L.i].ui];
  if(pct<PASS){app.innerHTML=bar(1,Q.lab)+`<section class="band"><div class="q center"><h2>${pct}%</h2><p class="lead" style="margin:0 auto 16px">Për ta kaluar testin të duhen ${PASS}%. Përsërit fjalët te “Fjalori” dhe gramatikën, pastaj provo sërish. Nuk ka afat.</p><div class="row" style="justify-content:center"><button class="btn" data-go="${L.i}">Provo sërish</button><button class="btn sec" data-home>Kthehu</button></div></div></section>`;return}
  S.scores['u'+u.n]=Math.max(S.scores['u'+u.n]||0,pct)}
 L.s++;if(L.s<L.st.length)return renderStep();
 complete();
}
function complete(){
 const d=DAYS[L.i],u=U[d.ui];
 if(!S.done[d.id])S.done[d.id]=today();
 const add=d.di===0?u.A:d.di===3?u.B:[];
 add.forEach(w=>{if(!S.cards[w[0]])S.cards[w[0]]={sq:w[1],b:0,due:dayAt(1)}});
 activity();save();
 const msg=d.di===6?`Njësia ${u.n} u krye. Mashallah!`:'Mësimi i sotëm u krye!';
 app.innerHTML=`<section class="band hero" style="min-height:100vh"><div class="wrap center"><p class="big ar">أَحْسَنْتَ!</p><h1>${esc(msg)}</h1><p class="lead" style="margin:0 auto 20px">Seria: ${streak()} ditë radhazi. ${add.length?add.length+' fjalë të reja hynë në përsëritjen e përditshme.':''} Kthehu nesër për hapin tjetër.</p><button class="btn" data-home>Kthehu në faqen kryesore</button></div></section>`;
}

/* ---------- PËRSËRITJA ---------- */
function startReview(){const d=shuffle(due()).slice(0,30);if(!d.length){toast('Sot nuk ke fjalë për përsëritje.');return}document.body.classList.add('inlesson');R={list:d,i:0,shown:false,dir:d.map(()=>Math.random()<.5)};renderR()}
function renderR(){
 if(R.i>=R.list.length){activity();save();app.innerHTML=`<section class="band hero" style="min-height:100vh"><div class="wrap center"><p class="big ar">مَا شَاءَ اللَّهُ</p><h1>Përsëritja u krye</h1><p class="lead" style="margin:0 auto 20px">Fjalët që i dije do të kthehen më vonë, ato që i harrove do të kthehen nesër.</p><button class="btn" data-home>Kthehu</button></div></section>`;return}
 const [ar,c]=R.list[R.i],arFirst=R.dir[R.i];
 app.innerHTML=bar(R.i/R.list.length,'Përsëritja e ditës · '+(R.i+1)+'/'+R.list.length)+`<section class="band"><div class="q center">
 <div class="qt">${arFirst?'Çfarë do të thotë?':'Si thuhet në arabisht?'}</div>
 <div class="qp ${arFirst?'ar':''}">${esc(arFirst?ar:c.sq)}</div>
 ${R.shown?`<div class="${arFirst?'qp':'reveal ar'}">${esc(arFirst?c.sq:ar)}</div><button class="play" data-say="${esc(ar)}" aria-label="Dëgjo">▶</button>
 <div class="row" style="justify-content:center;margin-top:18px"><button class="btn sec" data-r="0">Nuk e dija</button><button class="btn" data-r="1">E dija</button></div>`
 :`<button class="btn" data-flip>Shfaq përgjigjen</button>`}</div></section>`;
}

/* ---------- NGJARJET ---------- */
let resetArm=false;
app.addEventListener('click',e=>{
 const t=e.target.closest('button,[data-tog]');if(!t)return;
 if(t.dataset.say!==undefined){speak(t.dataset.say);if(!t.classList.contains('card')||t.classList.contains('word'))return}
 if(t.dataset.tog!==undefined){t.closest('.line').classList.toggle('open');return}
 if(t.dataset.showall!==undefined){app.querySelectorAll('.line').forEach(l=>l.classList.add('open'));return}
 if(t.dataset.go!==undefined)return startLesson(+t.dataset.go);
 if(t.dataset.home!==undefined)return setTab('home');
 if(t.dataset.rev!==undefined)return startReview();
 if(t.dataset.next!==undefined){hush();L.s++;return renderStep()}
 if(t.dataset.all!==undefined)return playAll(L.lines||[]);
 if(t.dataset.dm!==undefined){dmode=t.dataset.dm;return dict()}
 if(t.id==='reset'){if(!resetArm){resetArm=true;t.textContent='Kliko sërish: fshihet përgjithmonë';return}S=fresh();save();resetArm=false;toast('Progresi u fshi.');return setTab('home')}
 if(t.id==='dl'){try{const b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='arabisht-progresi-'+today()+'.json';document.body.appendChild(a);a.click();a.remove()}catch(x){toast('Shkarkimi nuk u lejua. Përdor “Kopjo kodin”.')}return}
 if(t.id==='cp'){const c=exportCode();document.getElementById('code').value=c;navigator.clipboard?.writeText(c).then(()=>toast('Kodi u kopjua.'),()=>toast('Kodi është në kutinë poshtë; kopjoje vetë.'));return}
 if(t.id==='imp')return importData(document.getElementById('code').value);
 if(t.dataset.opt!==undefined&&Q){const it=Q.items[0];if(it.answered)return;it.answered=true;const ok=it.opts[+t.dataset.opt]===it.a;
  app.querySelectorAll('.opt').forEach(b=>{b.disabled=true;const v=it.opts[+b.dataset.opt];if(v===it.a)b.classList.add('right');else if(b===t)b.classList.add('wrong')});
  if(it.pAr||it.optAr)speak(it.pAr?it.p:it.a);return feedback(ok,it.a)}
 if(t.dataset.tile!==undefined){Q.items[0].sel.push(+t.dataset.tile);return renderQ()}
 if(t.dataset.un!==undefined){Q.items[0].sel.splice(+t.dataset.un,1);return renderQ()}
 if(t.dataset.check!==undefined){const it=Q.items[0];if(it.answered)return;it.answered=true;const s=it.sel.map(j=>it.pool[j]).join(' '),c=it.tiles.join(' ');
  app.querySelectorAll('.tile,[data-check]').forEach(b=>b.disabled=true);speak(c);return feedback(s===c,c)}
 if(t.dataset.show!==undefined){const it=Q.items[0];document.getElementById('rv').innerHTML=`<div class="reveal ar">${esc(it.a)}</div><div class="row" style="justify-content:center"><button class="play" data-say="${esc(it.a)}" aria-label="Dëgjo">▶</button><button class="btn sec" data-self="0">Gabova</button><button class="btn" data-self="1">E thashë saktë</button></div>`;speak(it.a);return}
 if(t.dataset.self!==undefined){const it=Q.items[0];if(it.answered)return;it.answered=true;document.querySelectorAll('[data-self]').forEach(b=>b.disabled=true);return feedback(t.dataset.self==='1',it.a)}
 if(t.dataset.qn!==undefined){hush();Q.items.shift();Q.n++;return renderQ()}
 if(t.dataset.flip!==undefined){R.shown=true;renderR();if(!R.dir[R.i])speak(R.list[R.i][0]);return}
 if(t.dataset.r!==undefined){const c=S.cards[R.list[R.i][0]];if(t.dataset.r==='1'){c.b=Math.min(c.b+1,INT.length-1);c.due=dayAt(INT[c.b])}else{c.b=0;c.due=dayAt(1)}save();R.i++;R.shown=false;return renderR()}
});
app.addEventListener('input',e=>{if(e.target.id==='dq'){dq=e.target.value;renderWords()}});
app.addEventListener('change',e=>{
 if(e.target.id==='tr'){S.tr=e.target.checked;save()}
 if(e.target.id==='free'){S.free=e.target.checked;save();home()}
 if(e.target.id==='up'&&e.target.files[0]){e.target.files[0].text().then(importData)}
});
document.addEventListener('keydown',e=>{
 if(!document.body.classList.contains('inlesson')||e.target.matches('input,textarea'))return;
 const n=+e.key;
 if(n>=1&&n<=4){const b=app.querySelectorAll('.opt:not([disabled])')[n-1];if(b){b.click();e.preventDefault()}return}
 if(e.key==='Enter'){const b=app.querySelector('[data-qn],[data-next],[data-flip]');if(b&&document.activeElement!==b){b.click();e.preventDefault()}}
});

/* ---------- FILLIMI ---------- */
const h0=location.hash.slice(1);setTab(['dict','stats'].includes(h0)?h0:'home');
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
}
