const byId=(id)=>document.getElementById(id);
// Inline SVG icons for client-side rendering
function svgIcon(name, size=16){
  const p=(d)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  switch(name){
    case 'home': return p('M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z');
    case 'clock': return p('M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z');
    case 'star': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
    case 'star-fill': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
    default: return p('');
  }
}
window.svgIcon = svgIcon;
const searchBox=byId('searchBox'); const results=byId('searchResults');
let INDEX=[]; let NOTES=[];
fetch('/search-index.json').then(r=>r.json()).then(d=>INDEX=d);
fetch('/notes.json').then(r=>r.json()).then(d=>NOTES=d);

function doSearch(q){
  q=q.trim().toLowerCase(); if(!q){results.style.display='none';return}
  const isTag=q.startsWith('#'); const term=isTag?q.slice(1):q; const out=[];
  for(const it of INDEX){
    const hit=isTag? (it.tags||[]).some(t=>t.toLowerCase().includes(term)) : (it.title.toLowerCase().includes(term) || (it.headings||[]).some(h=>h.toLowerCase().includes(term)));
    if(hit) out.push(it); if(out.length>20) break;
  }
  if(!out.length){results.style.display='none';return}
  results.innerHTML=out.map(function(it){ return '<div><a href="/' + it.id.replace(/\\/g,'/').replace(/\.md$/i,'.html') + '\">' + it.title + '</a> <span class="meta">' + ((it.tags||[]).map(function(t){return '#'+t}).join(' ')) + '</span></div>'; }).join('');
  results.style.display='block';
}
if (searchBox) searchBox.addEventListener('input', ()=>doSearch(searchBox.value));
document.addEventListener('keydown', (e)=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); searchBox&&searchBox.focus(); } });

const hover=document.createElement('div'); hover.className='hovercard'; document.body.appendChild(hover);
document.body.addEventListener('mousemove',(e)=>{hover.style.left=(e.pageX+12)+'px'; hover.style.top=(e.pageY+12)+'px';});
document.body.addEventListener('mouseover',(e)=>{ const a=e.target.closest('a'); if(!a||!a.href||!a.pathname.endsWith('.html')){hover.style.display='none';return} const id=a.pathname.replace(/^\//,'').replace(/\.html$/i,'.md'); const n=NOTES.find(n=>n.id===id); if(n){ hover.innerHTML='<strong>'+n.title+'</strong><div class="meta">'+((n.tags||[]).map(t=>'#'+t).join(' '))+'</div>'; hover.style.display='block'; } });
document.body.addEventListener('mouseout',()=>{hover.style.display='none'});

window.togglePin=function(rel){ const pins=JSON.parse(localStorage.getItem('pins')||'[]'); const i=pins.indexOf(rel); if(i>=0) pins.splice(i,1); else pins.push(rel); localStorage.setItem('pins', JSON.stringify(pins)); const el=document.querySelector('[data-pin]'); if(el) el.innerHTML = pins.includes(rel)? svgIcon('star-fill'):svgIcon('star'); }

// Save Session (global): exports session notes + todos + pins as files
window.saveSessionSnapshot = async function(){
  const notes = localStorage.getItem('sessionNotes')||'';
  const todos = localStorage.getItem('graphTodos')||'[]';
  const pins = localStorage.getItem('pins')||'[]';
  const now = new Date(); const pad=n=>String(n).padStart(2,'0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const json = JSON.stringify({ when: now.toISOString(), notes, todos: JSON.parse(todos), pins: JSON.parse(pins) }, null, 2);
  const summary = `Session ${stamp}\n\nNotes preview:\n${notes.slice(0,500)}\n\nTodos count: ${JSON.parse(todos).length}\nPins count: ${JSON.parse(pins).length}\n`;
  async function saveFile(name, contents, type){
    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({ suggestedName: name });
        const w = await handle.createWritable(); await w.write(contents); await w.close(); return true;
      }catch(e){ /* user cancelled */ }
    }
    const a=document.createElement('a'); a.download=name; a.href=URL.createObjectURL(new Blob([contents],{type})); a.click(); URL.revokeObjectURL(a.href);
    return true;
  }
  await saveFile(`session-snapshot-${stamp}.json`, json, 'application/json');
  await saveFile(`session-summary-${stamp}.txt`, summary, 'text/plain');
};

// Color-code tags to match node colors
(function(){
  const map = (name)=>{
    if(name==='pc') return 'tag-pc';
    if(name==='npc') return 'tag-npc';
    if(name==='location') return 'tag-location';
    if(name==='arc' || name==='planning') return 'tag-arc';
    return null;
  };
  document.querySelectorAll('.tag').forEach(a=>{
    const txt = (a.textContent||'').trim();
    const name = txt.startsWith('#') ? txt.slice(1) : txt;
    const cls = map(name);
    if(cls) a.classList.add(cls);
  });
})();

// Inject Save Session button at the end of the top bar (to the right of search)
(function(){
  const topBar = document.querySelector('.top');
  if(!topBar) return;
  if(document.getElementById('saveSession')) return;
  const frag=document.createDocumentFragment();
  const btnSave=document.createElement('button');
  btnSave.id='saveSession'; btnSave.className='chip primary'; btnSave.textContent='Save Session'; btnSave.title='Save Session';
  btnSave.addEventListener('click', ()=> window.saveSessionSnapshot && window.saveSessionSnapshot());
  const btnFav=document.createElement('button');
  btnFav.id='bookmarkPage'; btnFav.className='chip'; btnFav.textContent='Bookmark'; btnFav.title='Bookmark this page';
  btnFav.addEventListener('click', ()=> addFavorite());
  frag.appendChild(btnFav); frag.appendChild(btnSave);
  const searchWrap = document.querySelector('.top .search');
  if(searchWrap && searchWrap.nextSibling){ topBar.insertBefore(frag, searchWrap.nextSibling); } else { topBar.appendChild(frag); }
})();

// Global Drawer (toggle + pin + adaptive layout)
(function(){
  const right = document.querySelector('.right');
  if(!right) return;
  const toggle = document.getElementById('drawerToggle');
  const reveal = document.getElementById('drawerReveal');
  const pin = document.getElementById('drawerPin');
  const KEY_PIN='drawerPinned';
  const KEY_OPEN='drawerOpen';
  function applyState(){
    const pinned = JSON.parse(localStorage.getItem(KEY_PIN)||'false');
    const open = JSON.parse(localStorage.getItem(KEY_OPEN)||'true');
    pin && (pin.textContent = pinned? 'Unpin':'Pin', pin.setAttribute('aria-pressed', String(pinned)));
    const shouldOpen = pinned ? true : open;
    document.body.classList.toggle('drawer-collapsed', !shouldOpen);
  }
  toggle?.addEventListener('click', ()=>{ const cur = JSON.parse(localStorage.getItem(KEY_OPEN)||'true'); localStorage.setItem(KEY_OPEN, JSON.stringify(!cur)); applyState(); });
  pin?.addEventListener('click', ()=>{ const cur = JSON.parse(localStorage.getItem(KEY_PIN)||'false'); const next = !cur; localStorage.setItem(KEY_PIN, JSON.stringify(next)); if(next){ localStorage.setItem(KEY_OPEN, 'true'); } applyState(); });
  reveal?.addEventListener('click', ()=>{ localStorage.setItem(KEY_OPEN,'true'); applyState(); });
  applyState();
})();

// Left Drawer (toggle + pin + collapse/expand all)
(function(){
  const left = document.querySelector('.left');
  if(!left) return;
  const toggle = document.getElementById('leftDrawerToggle');
  const pin = document.getElementById('leftDrawerPin');
  const btnCollapse = document.getElementById('leftCollapseExpand');
  const reveal = (function(){ const b=document.createElement('button'); b.id='leftDrawerReveal'; b.className='left-drawer-tab'; b.textContent='Nav'; b.title='Show navigation'; document.body.appendChild(b); return b; })();
  const KEY_PIN='leftDrawerPinned';
  const KEY_OPEN='leftDrawerOpen';
  function applyState(){
    const pinned = JSON.parse(localStorage.getItem(KEY_PIN)||'false');
    const open = JSON.parse(localStorage.getItem(KEY_OPEN)||'true');
    pin && (pin.textContent = pinned? 'Unpin':'Pin', pin.setAttribute('aria-pressed', String(pinned)));
    const shouldOpen = pinned ? true : open;
    document.body.classList.toggle('left-collapsed', !shouldOpen);
  }
  toggle?.addEventListener('click', ()=>{ const cur = JSON.parse(localStorage.getItem(KEY_OPEN)||'true'); localStorage.setItem(KEY_OPEN, JSON.stringify(!cur)); applyState(); });
  pin?.addEventListener('click', ()=>{ const cur = JSON.parse(localStorage.getItem(KEY_PIN)||'false'); const next = !cur; localStorage.setItem(KEY_PIN, JSON.stringify(next)); if(next){ localStorage.setItem(KEY_OPEN, 'true'); } applyState(); });
  reveal?.addEventListener('click', ()=>{ localStorage.setItem(KEY_OPEN,'true'); applyState(); });

  function collapseAll(keepCurrent){
    const details = Array.from(document.querySelectorAll('.left details'));
    details.forEach(d=>d.open=false);
    if(!keepCurrent) return;
    const currentLink = (function(){
      const lg=document.getElementById('localGraph');
      if(!lg) return null;
      const rel=lg.dataset.rel; if(!rel) return null;
      const href='/' + rel.replace(/\\/g,'/').replace(/\\.md$/i,'.html');
      return document.querySelector('.left a[href="'+href+'"]');
    })();
    if(currentLink){
      let el=currentLink.parentElement;
      while(el && !el.classList.contains('left')){
        if(el.tagName==='DETAILS') el.open=true;
        el=el.parentElement;
      }
    }
  }
  let collapsed=true;
  btnCollapse?.addEventListener('click', ()=>{
    if(collapsed){
      document.querySelectorAll('.left details').forEach(d=>d.open=true);
      btnCollapse.textContent='Collapse all';
    }else{
      collapseAll(true);
      btnCollapse.textContent='Expand all';
    }
    collapsed=!collapsed;
  });
  if(btnCollapse) btnCollapse.textContent = 'Collapse all';
  applyState();
  // Mark active nav item
  const path = location.pathname;
  const a = document.querySelector('.left a.nav-item[href="'+path+'"]') || document.querySelector('.left a.nav-item[href="'+path.replace(/index\.html$/,'')+'index.html" ]');
  if(a){ a.classList.add('active'); let el=a.parentElement; while(el && !el.classList.contains('left')){ if(el.tagName==='DETAILS') el.open=true; el=el.parentElement; } a.scrollIntoView({block:'center'}); }
  // Auto-collapse sections except current
  if(a){ const keep = new Set(); let el=a.parentElement; while(el && !el.classList.contains('left')){ if(el.tagName==='DETAILS') keep.add(el); el=el.parentElement; }
    document.querySelectorAll('.left details.nav-details').forEach(d=>{ if(!keep.has(d)) d.open=false; }); }
  // Breadcrumb
  const bc = document.getElementById('breadcrumbText');
  if(bc && a){
    const sec = a.closest('.nav-group')?.querySelector('.nav-label span:last-child')?.textContent || '';
    const title = document.title || a.textContent;
    bc.textContent = `You Are Here: ${sec} > ${title}`;
    const sib = document.getElementById('breadcrumbSiblings');
    sib?.addEventListener('click', (e)=>{ e.preventDefault(); const grp=a.closest('.nav-group')?.querySelector('.nav-details'); if(grp){ grp.open=true; grp.scrollIntoView({block:'start'}); } });
  }
  // Persist section open/closed
  const KEY_SEC='navOpenSections';
  function saveSections(){ const opens=[...document.querySelectorAll('.left details.nav-details')].filter(d=>d.open).map(d=> d.querySelector('.nav-label span:last-child')?.textContent || ''); localStorage.setItem(KEY_SEC, JSON.stringify(opens)); }
  function loadSections(){ try{ return JSON.parse(localStorage.getItem(KEY_SEC)||'[]'); }catch{return []} }
  document.querySelectorAll('.left details.nav-details').forEach(d=> d.addEventListener('toggle', saveSections));
  (function restore(){
    const opens=new Set(loadSections());
    if(opens.size){
      document.querySelectorAll('.left details.nav-details').forEach(d=>{
        const n=d.querySelector('.nav-label span:last-child')?.textContent||'';
        d.open = opens.has(n);
      });
      if(a){
        let el=a.parentElement;
        while(el && !el.classList.contains('left')){
          if(el.tagName==='DETAILS') el.open=true;
          el=el.parentElement;
        }
      }
    }
  })();
  // Recents: store and render
  (function recents(){ const KEY='recents'; function load(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []} } function save(v){ localStorage.setItem(KEY, JSON.stringify(v)); }
    const id = location.pathname.replace(/^\//,'').replace(/\.html$/i,'.md'); let list=load().filter(x=>x.id!==id); const title=document.title||id; list.unshift({id,title}); list=list.slice(0,12); save(list);
    const ul=document.getElementById('navRecents'); if(ul){ ul.innerHTML = list.map(r=>'<li><a class="nav-item" href="/'+r.id.replace(/\\/g,'/').replace(/\.md$/i,'.html')+'"><span class="nav-icon">'+svgIcon('clock')+'</span><span class="nav-text">'+r.title+'</span></a></li>').join('') || '<li class="meta">No recents</li>'; }
  })();
  // Quick Nav filter
  (function quick(){ const q=document.getElementById('navQuick'); if(!q) return; q.addEventListener('input', ()=>{ const term=q.value.trim().toLowerCase(); const items=[...document.querySelectorAll('.left .nav-list a.nav-item')]; items.forEach(a=>{ const t=a.textContent.toLowerCase(); const show = !term || t.includes(term); a.parentElement.style.display = show? '':'none'; }); // Hide empty groups
    document.querySelectorAll('.left .nav-group').forEach(g=>{ const any=[...g.querySelectorAll('.nav-list li')].some(li=>li.style.display!=='none'); g.style.display = any? '':'none'; }); }); })();

  // Per-section mini filters
  (function sectionFilters(){
    const inputs=[...document.querySelectorAll('.left .nav-mini-input')]; if(!inputs.length) return;
    inputs.forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const term=(inp.value||'').trim().toLowerCase();
        const details=inp.closest('details.nav-details'); if(!details) return;
        const items=[...details.querySelectorAll('ul.nav-list > li')];
        items.forEach(li=>{
          const t=(li.textContent||'').toLowerCase();
          li.style.display = !term || t.includes(term) ? '' : 'none';
        });
      });
    });
  })();

  // "Show only this section" toggle
  (function onlySection(){
    const KEY='navOnlySection';
    function applyOnly(sectionLabel){
      const groups=[...document.querySelectorAll('.left .nav-group')];
      groups.forEach(g=>{
        const label=g.querySelector('.nav-label span:last-child')?.textContent||'';
        const show = !sectionLabel || label===sectionLabel;
        g.style.display = show? '' : 'none';
      });
      // reflect active button state
      document.querySelectorAll('.nav-only').forEach(btn=>{
        const lab=btn.getAttribute('data-section');
        btn.setAttribute('aria-pressed', sectionLabel && lab===sectionLabel ? 'true':'false');
      });
    }
    const saved = (function(){ try{return localStorage.getItem(KEY)||''}catch{return ''} })();
    if(saved) applyOnly(saved);
    document.querySelectorAll('.nav-only').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.preventDefault();
        const label=btn.getAttribute('data-section')||'';
        const cur = (function(){ try{return localStorage.getItem(KEY)||''}catch{return ''} })();
        const next = (cur===label)? '' : label;
        try{ if(next) localStorage.setItem(KEY,next); else localStorage.removeItem(KEY);}catch{}
        applyOnly(next);
      });
    });
  })();
  // Hotkeys g + (c/n/l/a/d)
  (function hotkeys(){ let gated=false; let to=null; document.addEventListener('keydown',(e)=>{ if(e.target && (/input|textarea/i.test(e.target.tagName))) return; if(!gated && e.key.toLowerCase()==='g'){ gated=true; clearTimeout(to); to=setTimeout(()=>{gated=false},1500); return; } if(gated){ const k=e.key.toLowerCase(); gated=false; const map={ c:'Characters', n:'NPCs', l:'World', a:'Arcs', d:'Dashboard', t:'Tools', w:'World' }; const target=map[k]; if(!target) return; if(k==='d'){ location.href='/index.html'; return; } const label=[...document.querySelectorAll('.left .nav-group .nav-label span:last-child')].find(span=>span.textContent===target); const det=label?.closest('.nav-details'); if(det){ det.open=true; det.scrollIntoView({block:'start'}); const first=det.parentElement.querySelector('.nav-list a.nav-item'); first?.focus(); } } }); })();
})();

// Favorites rendering and actions
(function(){
  const favList = document.getElementById('navFav');
  if(!favList) return;
  function loadFav(){ try{ return JSON.parse(localStorage.getItem('favorites')||'[]'); }catch{return []} }
  function saveFav(list){ localStorage.setItem('favorites', JSON.stringify(list)); }
  function hrefFor(id){ return '/' + id.replace(/\\/g,'/').replace(/\.md$/i,'.html'); }
  function render(){
    const list=loadFav();
    favList.innerHTML = list.length? list.map((f,i)=> '<li><a class="nav-item" href="'+hrefFor(f.id)+'"><span class="nav-icon">'+svgIcon('star')+'</span><span class="nav-text">'+(f.title||f.id)+'</span></a> <button class="todo-btn" data-remove="'+i+'" title="Remove">✕</button></li>').join('') : '<li class="meta">No favorites</li>';
    favList.querySelectorAll('button[data-remove]').forEach(b=> b.addEventListener('click',()=>{ const i=parseInt(b.getAttribute('data-remove')); const arr=loadFav(); arr.splice(i,1); saveFav(arr); render(); }));
  }
  window.addFavorite = function(){
    const id = location.pathname.replace(/^\//,'').replace(/\.html$/i,'.md');
    const list=loadFav(); if(list.find(x=>x.id===id)) return;
    // Find title from NOTES if present
    let title=document.title||id;
    try{
      const meta = window.NOTES && window.NOTES.find(n=>n.id===id); if(meta) title=meta.title;
    }catch{}
    list.unshift({id, title}); saveFav(list); render();
  };
  render();
})();

// Global To-Do (works on any page with todo elements present)
(function(){
  const FORM = document.getElementById('todoForm');
  const INPUT = document.getElementById('todoInput');
  const LIST = document.getElementById('todoList');
  const CLEAR = document.getElementById('todoClearDone');
  if(!FORM||!INPUT||!LIST) return; // not present on this page
  const KEY='graphTodos';
  function load(){ return JSON.parse(localStorage.getItem(KEY)||'[]'); }
  function save(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
  function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;","</script":"&lt;/script>","</":"&lt;/"}[c]||c)); }
  function itemTemplate(it,i){ const id='todo_'+i; const cls='todo-text'+(it.done?' done':''); return '<li class="todo-item" role="listitem">'+
    '<input id="'+id+'" class="todo-check" type="checkbox" data-i="'+i+'" '+(it.done?'checked':'')+' aria-label="Mark task as done">'+
    '<label class="'+cls+'" for="'+id+'" data-i="'+i+'">'+escapeHtml(it.text)+'</label>'+
    '<div class="todo-actions-row">'+
    '<button class="todo-btn" data-edit="'+i+'" title="Edit">Edit</button>'+
    '<button class="todo-btn" data-del="'+i+'" title="Delete">Delete</button>'+
    '</div></li>'; }
  function render(){ const items=load(); if(!items.length){ LIST.innerHTML='<li class="meta">No tasks yet</li>'; return;} LIST.innerHTML = items.map(itemTemplate).join('');
    LIST.querySelectorAll('input.todo-check').forEach(cb=>cb.addEventListener('change',()=>{ const items=load(); const i=parseInt(cb.getAttribute('data-i')); items[i].done=cb.checked; save(items); render(); }));
    LIST.querySelectorAll('button[data-del]').forEach(b=>b.addEventListener('click',()=>{ const items=load(); const i=parseInt(b.getAttribute('data-del')); items.splice(i,1); save(items); render(); }));
    LIST.querySelectorAll('button[data-edit]').forEach(b=>b.addEventListener('click',()=>{ startEdit(parseInt(b.getAttribute('data-edit'))); })); }
  function startEdit(i){ const items=load(); const it=items[i]; const li=LIST.children[i]; if(!li) return; const current=it.text; const lbl=li.querySelector('label.todo-text'); lbl.outerHTML='<input class="todo-edit" data-i="'+i+'" value="'+escapeHtml(current)+'" aria-label="Edit task">'; const ed=li.querySelector('input.todo-edit'); ed.focus(); ed.select(); function commit(saveIt){ const items=load(); if(saveIt){ const v=ed.value.trim(); items[i].text=v||current; } save(items); render(); } ed.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); commit(true);} if(e.key==='Escape'){ e.preventDefault(); commit(false);} }); ed.addEventListener('blur',()=>commit(true)); }
  CLEAR?.addEventListener('click',()=>{ const items=load().filter(it=>!it.done); save(items); render(); });
  FORM.addEventListener('submit',(e)=>{ e.preventDefault(); const t=(INPUT.value||'').trim(); if(!t) return; const items=load(); items.unshift({text:t,done:false}); save(items); INPUT.value=''; render(); });
  render();
})();

// Theme toggle in right drawer handle (with fallback card)
(function(){
  const rightPane = document.querySelector('.right');
  if(!rightPane) return;
  let theme = localStorage.getItem('theme')||'dark';
  document.body.setAttribute('data-theme', theme);
  const handle = rightPane.querySelector('.drawer-handle');
  const content = document.getElementById('drawerContent');
  function attach(el){
    el.addEventListener('click', ()=>{
      theme = (localStorage.getItem('theme')||'dark')==='dark'?'light':'dark';
      localStorage.setItem('theme', theme);
      document.body.setAttribute('data-theme', theme);
    });
  }
  // Prefer an existing button in the header if present
  const existing = document.getElementById('themeToggle');
  if(existing){ attach(existing); return; }
  if(handle && !existing){
    const btn=document.createElement('button');
    btn.id='themeToggle'; btn.className='chip'; btn.title='Toggle Light/Dark'; btn.textContent='Theme';
    handle.appendChild(btn);
    attach(btn);
  } else if(content && !existing){
    const wrap=document.createElement('div'); wrap.className='card';
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div>Theme</div><button id="themeToggle" class="chip">Toggle Light/Dark</button></div>';
    content.appendChild(wrap);
    const btn=document.getElementById('themeToggle');
    if(btn) attach(btn);
  }
})();

// Save Session (global): exports session notes + todos + pins as files
window.saveSessionSnapshot = async function(){
  const notes = localStorage.getItem('sessionNotes')||'';
  const todos = localStorage.getItem('graphTodos')||'[]';
  const pins = localStorage.getItem('pins')||'[]';
  const now = new Date(); const pad=n=>String(n).padStart(2,'0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const json = JSON.stringify({ when: now.toISOString(), notes, todos: JSON.parse(todos), pins: JSON.parse(pins) }, null, 2);
  const summary = `Session ${stamp}\n\nNotes preview:\n${notes.slice(0,500)}\n\nTodos count: ${JSON.parse(todos).length}\nPins count: ${JSON.parse(pins).length}\n`;
  async function saveFile(name, contents, type){
    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({ suggestedName: name });
        const w = await handle.createWritable(); await w.write(contents); await w.close(); return true;
      }catch(e){ /* user cancelled */ }
    }
    const a=document.createElement('a'); a.download=name; a.href=URL.createObjectURL(new Blob([contents],{type})); a.click(); URL.revokeObjectURL(a.href);
    return true;
  }
  await saveFile(`session-snapshot-${stamp}.json`, json, 'application/json');
  await saveFile(`session-summary-${stamp}.txt`, summary, 'text/plain');
}
