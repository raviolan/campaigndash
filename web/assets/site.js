const byId=(id)=>document.getElementById(id);
// Inline SVG icons for client-side rendering
function svgIcon(name, size=16){
  const p=(d)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  switch(name){
    case 'home': return p('M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z');
    case 'clock': return p('M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z');
    case 'star': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
    case 'star-fill': return p('M12 2l3.1 6.3 7 .9-5.1 4.9 1.3 6.9L12 17.8 5.7 21l1.3-6.9L2 9.2l7-.9L12 2z');
    case 'pin': return p('M12 2a6 6 0 016 6c0 4-6 12-6 12S6 12 6 8a6 6 0 016-6zm0 8a2 2 0 110-4 2 2 0 010 4z');
    case 'checklist': return p('M4 6h9v2H4V6zm0 6h9v2H4v-2zm11-7l3 3-1.5 1.5L14.5 7.5 13 9l-1.5-1.5L14.5 4z');
    case 'note': return p('M6 3h9a2 2 0 012 2v14l-4-3-4 3V5a2 2 0 00-2-2z');
    case 'bookmark': return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 4h12v18l-6-4-6 4V4z"/></svg>`;
    case 'bookmark-fill': return p('M6 4h12v18l-6-4-6 4V4z');
    default: return p('');
  }
}
window.svgIcon = svgIcon;
const searchBox=byId('searchBox'); const results=byId('searchResults');
const urlFor=(id)=>'/' + id.replace(/\\/g,'/').replace(/\.md$/i,'.html').split('/').map(encodeURIComponent).join('/');
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
  results.innerHTML=out.map(function(it){ return '<div><a href="' + ('/' + it.id.replace(/\\/g,'/').replace(/\.md$/i,'.html').split('/').map(encodeURIComponent).join('/')) + '\">' + it.title + '</a> <span class="meta">' + ((it.tags||[]).map(function(t){return '#'+t}).join(' ')) + '</span></div>'; }).join('');
  results.style.display='block';
}
if (searchBox) searchBox.addEventListener('input', ()=>doSearch(searchBox.value));
document.addEventListener('keydown', (e)=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); searchBox&&searchBox.focus(); } });

const hover=document.createElement('div'); hover.className='hovercard'; document.body.appendChild(hover);
document.body.addEventListener('mousemove',(e)=>{hover.style.left=(e.pageX+12)+'px'; hover.style.top=(e.pageY+12)+'px';});
document.body.addEventListener('mouseover',(e)=>{ const a=e.target.closest('a'); if(!a||!a.href||!a.pathname.endsWith('.html')){hover.style.display='none';return} if(a.closest('.left')){ hover.style.display='none'; return; } const id=decodeURIComponent(a.pathname.replace(/^\//,'')).replace(/\.html$/i,'.md'); const n=NOTES.find(n=>n.id===id); if(n){ hover.innerHTML='<strong>'+n.title+'</strong><div class="meta">'+((n.tags||[]).map(t=>'#'+t).join(' '))+'</div>'; hover.style.display='block'; } });
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

// Resizable side panels (drag to adjust --left-w and --right-w)
(function(){
  const left=document.querySelector('.resizer-left');
  const right=document.querySelector('.resizer-right');
  if(!left||!right) return;
  const root=document.documentElement;
  const KEY_L='panelLeftW'; const KEY_R='panelRightW';
  // Restore saved widths
  try{ const lw=parseInt(localStorage.getItem(KEY_L)||'0',10); if(lw) root.style.setProperty('--left-w', lw+'px'); }catch{}
  try{ const rw=parseInt(localStorage.getItem(KEY_R)||'0',10); if(rw) root.style.setProperty('--right-w', rw+'px'); }catch{}
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function onDrag(which, ev){ ev.preventDefault(); function move(e){ if(which==='left'){ const x=e.clientX; const min=180; const max=window.innerWidth - (parseInt(getComputedStyle(root).getPropertyValue('--right-w'))||340) - 300; const w=clamp(x, min, max); root.style.setProperty('--left-w', w+'px'); try{localStorage.setItem(KEY_L,String(w));}catch{} } else { const x=e.clientX; const min=220; const max=window.innerWidth - (parseInt(getComputedStyle(root).getPropertyValue('--left-w'))||300) - 300; const w=clamp(window.innerWidth - x, min, max); root.style.setProperty('--right-w', w+'px'); try{localStorage.setItem(KEY_R,String(w));}catch{} } }
    function up(){ document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }
  left.addEventListener('mousedown', onDrag.bind(null,'left'));
  right.addEventListener('mousedown', onDrag.bind(null,'right'));
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
    if(pin){ pin.innerHTML = window.svgIcon && window.svgIcon('pin', 16) || 'Pin'; pin.setAttribute('aria-pressed', String(pinned)); pin.classList.toggle('active', pinned); }
    const shouldOpen = pinned ? true : open;
    document.body.classList.toggle('drawer-collapsed', !shouldOpen);
  }
  toggle?.addEventListener('click', ()=>{ const cur = JSON.parse(localStorage.getItem(KEY_OPEN)||'true'); localStorage.setItem(KEY_OPEN, JSON.stringify(!cur)); applyState(); });
  pin?.addEventListener('click', ()=>{ const cur = JSON.parse(localStorage.getItem(KEY_PIN)||'false'); const next = !cur; localStorage.setItem(KEY_PIN, JSON.stringify(next)); if(next){ localStorage.setItem(KEY_OPEN, 'true'); } applyState(); });
  reveal?.addEventListener('click', ()=>{ localStorage.setItem(KEY_OPEN,'true'); applyState(); });
  applyState();
})();

// Right panel tools: tabs, pinning, notepad autosave, default home
(function(){
  const tabs = document.querySelectorAll('.tool-tab');
  const views = {
    home: document.getElementById('toolHome'),
    todo: document.getElementById('toolTodo'),
    note: document.getElementById('toolNote')
  };
  const KEY_TOOL='rightActiveTool';
  const SPLIT=true; // split mode: two panes visible
  const KEY_PINS='rightPinnedTools';
  const KEY_TOP='rightPaneTop';
  const KEY_BOTTOM='rightPaneBottom';
  const KEY_SPLIT='rightPaneSplit';
  function getPins(){ try{ return JSON.parse(localStorage.getItem(KEY_PINS)||'[]'); }catch{return []} }
  function setPins(list){ localStorage.setItem(KEY_PINS, JSON.stringify(list)); }
  function isPinned(id){ return getPins().includes(id); }
  function togglePin(id){ const arr=getPins(); const i=arr.indexOf(id); if(i>=0) arr.splice(i,1); else arr.push(id); setPins(arr); renderPins(); renderHome(); renderPinButtons(); }
  function setActive(name){ localStorage.setItem(KEY_TOOL, name); for(const b of tabs){ b.classList.toggle('active', b.getAttribute('data-tool')===name); if(window.svgIcon){ const t=b.getAttribute('data-tool'); b.innerHTML = t==='home'? svgIcon('home') : t==='todo'? svgIcon('checklist') : svgIcon('note'); } }
    if(SPLIT){ // always show todo + note in split mode
      views.home && views.home.classList.remove('active');
      views.todo && views.todo.classList.add('active');
      views.note && views.note.classList.add('active');
      renderHome();
    } else {
      for(const k in views){ if(views[k]) views[k].classList.toggle('active', k===name); }
      if(name==='home') renderHome();
    }
  }
  function renderPins(){ document.querySelectorAll('.tool-pin').forEach(btn=>{ const id=btn.getAttribute('data-tool'); btn.classList.toggle('active', isPinned(id)); if(window.svgIcon) btn.innerHTML = svgIcon('pin',14); }); }
  function renderHome(){ const home=document.getElementById('toolHomePins'); if(!home) return; const pins=getPins(); const map={ todo:{icon:'checklist',label:'To-Do'}, note:{icon:'note',label:'Notepad'} };
    home.innerHTML = pins.length? pins.map(id=> `<button class="chip" data-open="${id}">${window.svgIcon?svgIcon(map[id]?.icon||'dot',16):''} ${map[id]?.label||id}</button>`).join('') : '<div class="meta">No tools pinned. Open a tool and click its pin.</div>';
    home.querySelectorAll('button[data-open]').forEach(b=> b.addEventListener('click', ()=> setActive(b.getAttribute('data-open')||'home')));
  }
  // Initialize icons and clicks
  tabs.forEach(b=>{ const t=b.getAttribute('data-tool'); if(window.svgIcon){ b.innerHTML = t==='home'? svgIcon('home') : t==='todo'? svgIcon('checklist') : svgIcon('note'); }
    b.addEventListener('click', ()=> setActive(b.getAttribute('data-tool')||'home'));
  });
  // Pin buttons
  document.querySelectorAll('.tool-pin').forEach(btn=> btn.addEventListener('click', ()=> togglePin(btn.getAttribute('data-tool')||'')));
  renderPins();
  // Notepad autosave
  (function(){ const ta=document.getElementById('toolNotepad'); if(!ta) return; const KEY='sessionNotes'; try{ ta.value = localStorage.getItem(KEY)||''; }catch{} ta.addEventListener('input', ()=>{ try{ localStorage.setItem(KEY, ta.value); }catch{} }); })();
  setActive(localStorage.getItem(KEY_TOOL)||'home');

  // Per-pane selection and adjustable split (split mode)
  if(SPLIT){
    const topBody = document.querySelector('.pane-body[data-pane="top"]');
    const bottomBody = document.querySelector('.pane-body[data-pane="bottom"]');
    function iconFor(tool){ return tool==='home'? (window.svgIcon?svgIcon('home',14):'H') : tool==='todo'? (window.svgIcon?svgIcon('checklist',14):'T') : (window.svgIcon?svgIcon('note',14):'N'); }
    function activatePane(pane, tool){ const body = pane==='top'? topBody : bottomBody; if(!body) return; const el = views[tool]; if(!el) return; body.innerHTML=''; body.appendChild(el); document.querySelectorAll('.pane-tab[data-pane="'+pane+'"]').forEach(b=>{ const t=b.getAttribute('data-tool'); b.classList.toggle('active', t===tool); if(window.svgIcon){ b.innerHTML = iconFor(t); }}); localStorage.setItem(pane==='top'? KEY_TOP : KEY_BOTTOM, tool); if(tool==='home') renderHome(); }
    // Init pane tab icons and clicks
    document.querySelectorAll('.pane-tab').forEach(b=>{ const t=b.getAttribute('data-tool'); if(window.svgIcon) b.innerHTML = iconFor(t); b.addEventListener('click', ()=> activatePane(b.getAttribute('data-pane')||'top', t)); });
    const topSel = localStorage.getItem(KEY_TOP)||'todo';
    const botSel = localStorage.getItem(KEY_BOTTOM)||'note';
    activatePane('top', topSel);
    activatePane('bottom', botSel);
    // Adjustable split resizer
    (function(){
      const container=document.querySelector('.right-split');
      const res=document.querySelector('.pane-resizer-h'); if(!container||!res) return;
      const saved=localStorage.getItem(KEY_SPLIT);
      // Initialize and clamp
      (function initSplit(){
        const rect=container.getBoundingClientRect();
        const minPx=120; const maxPx=Math.max(minPx, rect.height-120);
        let val='50%';
        if(saved && /^(\d+)(px|%)$/.test(saved)){
          if(saved.endsWith('%')){
            const pct=parseFloat(saved); let px=rect.height*((isNaN(pct)?50:pct)/100);
            if(px<minPx) px=Math.min(rect.height/2, minPx); if(px>maxPx) px=Math.max(rect.height/2, maxPx);
            val = px+'px';
          } else {
            let px=parseFloat(saved); if(isNaN(px)) px=rect.height/2;
            if(px<minPx) px=Math.min(rect.height/2, minPx); if(px>maxPx) px=Math.max(rect.height/2, maxPx);
            val = px+'px';
          }
        }
        container.style.setProperty('--pane-top-h', val);
      })();
      function onDown(e){ e.preventDefault(); const rect=container.getBoundingClientRect(); const startY=e.clientY; const cur=getComputedStyle(container).getPropertyValue('--pane-top-h').trim(); const startPx = cur.endsWith('%')? rect.height*parseFloat(cur)/100 : parseFloat(cur)|| (rect.height/2);
        function onMove(ev){ const dy=ev.clientY-startY; let h=startPx+dy; const min=120; const max=rect.height-120; if(h<min) h=min; if(h>max) h=max; const val=h+'px'; container.style.setProperty('--pane-top-h', val); try{ localStorage.setItem(KEY_SPLIT, val);}catch{} }
        function onUp(){ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
      }
      res.addEventListener('mousedown', onDown);
    })();
  }
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
      const href='/' + rel.replace(/\\/g,'/').replace(/\\.md$/i,'.html').split('/').map(encodeURIComponent).join('/');
      return [...document.querySelectorAll('.left a')].find(a=>{ try{ return new URL(a.href, location.origin).pathname===href; }catch{ return false; } });
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
  // Mark active nav item (pathname-based)
  const path = location.pathname;
  const a = [...document.querySelectorAll('.left a.nav-item')].find(el=>{ try{ return new URL(el.href, location.origin).pathname===path; }catch{ return false; } });
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
    const id = decodeURIComponent(location.pathname.replace(/^\//,'')).replace(/\.html$/i,'.md'); let list=load().filter(x=>x.id!==id); const title=document.title||id; list.unshift({id,title}); list=list.slice(0,12); save(list);
    const ul=document.getElementById('navRecents'); if(ul){ ul.innerHTML = list.map(r=>'<li><a class="nav-item" href="'+urlFor(r.id)+'"><span class="nav-icon">'+svgIcon('clock')+'</span><span class="nav-text">'+r.title+'</span></a></li>').join('') || '<li class="meta">No recents</li>'; }
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
  function hrefFor(id){ return '/' + id.replace(/\\/g,'/').replace(/\.md$/i,'.html').split('/').map(encodeURIComponent).join('/'); }
  function render(){
    const list=loadFav();
    favList.innerHTML = list.length? list.map((f,i)=> '<li><a class="nav-item" href="'+hrefFor(f.id)+'"><span class="nav-icon">'+svgIcon('star')+'</span><span class="nav-text">'+(f.title||f.id)+'</span></a> <button class="todo-btn" data-remove="'+i+'" title="Remove">✕</button></li>').join('') : '<li class="meta">No favorites</li>';
    favList.querySelectorAll('button[data-remove]').forEach(b=> b.addEventListener('click',()=>{ const i=parseInt(b.getAttribute('data-remove')); const arr=loadFav(); arr.splice(i,1); saveFav(arr); render(); document.dispatchEvent(new CustomEvent('favorites-changed')); }));
  }
  window.addFavorite = function(){
    const id = decodeURIComponent(location.pathname.replace(/^\//,'')).replace(/\.html$/i,'.md');
    const list=loadFav(); if(list.find(x=>x.id===id)) return;
    // Find title from NOTES if present
    let title=document.title||id;
    try{
      const meta = window.NOTES && window.NOTES.find(n=>n.id===id); if(meta) title=meta.title;
    }catch{}
    list.unshift({id, title}); saveFav(list); render(); document.dispatchEvent(new CustomEvent('favorites-changed'));
  };
  window.toggleFavorite = function(id, title){
    const list=loadFav(); const i=list.findIndex(x=>x.id===id);
    if(i>=0){ list.splice(i,1); } else { list.unshift({id, title: title||id}); }
    saveFav(list); render(); document.dispatchEvent(new CustomEvent('favorites-changed'));
  };
  document.addEventListener('favorites-changed', ()=>{ try{ render(); }catch{} });
  render();
})();

// Global To-Do (works on any page with todo elements present)
(function(){
  const FORM = document.getElementById('todoForm');
  const INPUT = document.getElementById('todoInput');
  const LIST = document.getElementById('todoList');
  const TOGGLE = document.getElementById('todoClearDone'); // repurposed as Hide/Show Completed
  if(!FORM||!INPUT||!LIST) return; // not present on this page
  const KEY='graphTodos';
  const KEY_HIDE='todoHideCompleted';
  const KEY_ID='todoIdSeq';
  let nextFocusPath = '';
  let nextFocusId = '';

  function genId(){
    try{ const cur=Number(localStorage.getItem(KEY_ID)||'0')+1; localStorage.setItem(KEY_ID,String(cur)); return 't'+Date.now().toString(36)+cur.toString(36); }catch{ return 't'+Math.random().toString(36).slice(2); }
  }

  function load(){
    let arr=[]; try{ arr=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{}
    let changed=false;
    function norm(items){ return (items||[]).map(it=>{ const node={ id: it.id||genId(), text:it.text||'', done:!!it.done, collapsed: !!it.collapsed, children: it.children? norm(it.children) : [] }; if(!it.id) changed=true; return node; }); }
    const normed = norm(arr);
    if(changed) save(normed);
    return normed;
  }
  function save(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
  function hideCompleted(){ try{ return localStorage.getItem(KEY_HIDE)==='1'; }catch{return false} }
  function setHideCompleted(v){ try{ localStorage.setItem(KEY_HIDE, v?'1':'0'); }catch{} }
  function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;","</script":"&lt;/script>","</":"&lt;/"}[c]||c)); }

  function render(){
    const items=load();
    const hide = hideCompleted();
    if(TOGGLE) TOGGLE.textContent = hide? 'Show Completed' : 'Hide Completed';
    if(!items.length){ LIST.innerHTML='<li class="meta">No tasks yet</li>'; return; }
    LIST.innerHTML = renderList(items, '', true, hide);
    bindEvents();
    if(nextFocusId){
      const ed = LIST.querySelector('.todo-text[data-id="'+nextFocusId+'"]');
      if(ed){ ed.focus(); document.getSelection()?.selectAllChildren(ed); document.getSelection()?.collapseToEnd(); }
      nextFocusId='';
    } else if(nextFocusPath){
      const ed = LIST.querySelector('.todo-text[data-path="'+nextFocusPath+'"]');
      if(ed){ ed.focus(); document.getSelection()?.selectAllChildren(ed); document.getSelection()?.collapseToEnd(); }
      nextFocusPath='';
    }
  }

  function renderList(items, path, topLevel, hide){
    const parts=[];
    const filtered = hide? items.filter(it=>!it.done) : items;
    filtered.forEach((it, i)=>{
      const p = path===''? String(i) : path + '.' + i;
      const domId='todo_'+p.replace(/\./g,'_');
      const nid = it.id;
      const clsText = 'todo-text editable' + (it.done?' done':'') + (topLevel?' top-level':'');
      const hasChildren = (it.children||[]).length>0;
      const disclose = hasChildren? '<button class="todo-disclose" data-path="'+p+'" aria-label="Toggle">'+(it.collapsed?'▸':'▾')+'</button>' : '<span class="todo-disclose hidden"></span>';
      parts.push('<li class="todo-item'+(topLevel?' top-level':'')+'" role="listitem" data-path="'+p+'" data-id="'+nid+'">'
        + '<span class="todo-grip" draggable="true" data-id="'+nid+'" aria-label="Drag"></span>'
        + disclose
        + '<input id="'+domId+'" class="todo-check" type="checkbox" data-path="'+p+'" '+(it.done?'checked':'')+' aria-label="Mark task as done">'
        + '<div class="'+clsText+'" contenteditable="true" data-path="'+p+'" data-id="'+nid+'" spellcheck="false">'+escapeHtml(it.text)+'</div>'
        + '<div class="todo-actions"><button class="todo-more" data-path="'+p+'" title="More">⋯</button></div>'
      );
      if (hasChildren){
        parts.push('<ul class="todo-sublist" '+(it.collapsed?'style="display:none"':'')+'>'+renderList(it.children, p, false, hide)+'</ul>');
      }
      parts.push('</li>');
    });
    return parts.join('');
  }

  function getByPath(items, path){ if(!path) return null; const idx = path.split('.').map(n=>parseInt(n,10)); let cur={items}; for(let i=0;i<idx.length;i++){ const k=idx[i]; const arr=(i===0?cur.items:cur.children); if(!arr || k<0 || k>=arr.length) return null; cur = arr[k]; } return cur; }
  function getParentAndIndex(items, path){ const parts=path.split('.'); const last=parseInt(parts.pop(),10); const parentPath=parts.join('.'); let parentList = (parentPath==='')? items : getByPath(items, parentPath)?.children; return { parentList, index: last, parentPath } }

  function findById(items, id){
    let found=null, parent=null, index=-1;
    function walk(arr, p){
      for(let i=0;i<arr.length;i++){
        const n=arr[i]; if(n.id===id){ found=n; parent=p; index=i; return true; }
        if(n.children && walk(n.children, n)) return true;
      }
      return false;
    }
    walk(items, null);
    return { node:found, parent, index };
  }

  function containsId(root, id){
    if(!root) return false; if(root.id===id) return true; return (root.children||[]).some(c=>containsId(c,id));
  }

  function moveNodeById(id, targetId, mode){
    const items=load();
    const src = findById(items, id);
    const dst = findById(items, targetId);
    if(!src.node || !dst.node) return;
    // Prevent moving into itself/descendant
    if(mode==='into' && containsId(src.node, targetId)) return;
    // Remove from source
    let fromArr = src.parent? (src.parent.children||[]) : items;
    const moved = fromArr.splice(src.index,1)[0];
    if(mode==='into'){
      dst.node.children = dst.node.children || [];
      dst.node.children.push(moved);
    } else {
      // before/after in destination's parent list
      const toArr = dst.parent? (dst.parent.children||[]) : items;
      let di = dst.index + (mode==='after'? 1 : 0);
      // If moving within same array and original index < insertion index, adjust
      if(toArr===fromArr && src.index < di) di -= 1;
      toArr.splice(di,0,moved);
    }
    save(items);
    nextFocusId = id;
    render();
  }

  function newSiblingAfter(path){ const items=load(); const {parentList,index}=getParentAndIndex(items,path); if(!parentList) return; const insertAt=index+1; parentList.splice(insertAt,0,{text:'',done:false,collapsed:false,children:[]}); save(items); nextFocusPath = (path.split('.').slice(0,-1).concat(insertAt)).join('.'); render(); }
  function deleteItem(path){ const items=load(); const {parentList,index,parentPath}=getParentAndIndex(items,path); if(!parentList) return; const focusIdx = Math.max(0,index-1); parentList.splice(index,1); save(items); nextFocusPath = parentList.length? (parentPath? parentPath+'.'+focusIdx : String(focusIdx)) : parentPath; render(); }
  function indentItem(path){ const items=load(); const {parentList,index}=getParentAndIndex(items,path); if(!parentList || index<=0) return; const prev = parentList[index-1]; prev.children = prev.children||[]; const moved = parentList.splice(index,1)[0]; prev.children.push(moved); save(items); nextFocusPath = path.replace(/\.\d+$/,'') + '.' + (index-1) + '.' + (prev.children.length-1); render(); }
  function outdentItem(path){ const items=load(); const {parentList,index,parentPath}=getParentAndIndex(items,path); if(parentPath==='') return; const gp = getParentAndIndex(items,parentPath); if(!gp.parentList) return; const moved = parentList.splice(index,1)[0]; const parentIndex = parseInt(parentPath.split('.').pop()||'0',10); gp.parentList.splice(parentIndex+1,0,moved); save(items); nextFocusPath = gp.parentPath? gp.parentPath + '.' + (parentIndex+1) : String(parentIndex+1); render(); }

  function bindEvents(){
    LIST.querySelectorAll('input.todo-check').forEach(cb=>cb.addEventListener('change',()=>{ const items=load(); const p=cb.getAttribute('data-path')||''; const node=getByPath(items,p); if(node){ node.done=cb.checked; save(items); render(); } }));
    LIST.querySelectorAll('button.todo-more').forEach(b=>b.addEventListener('click',()=>{ const p=b.getAttribute('data-path')||''; // simple delete for now
      if(confirm('Delete this task?')) deleteItem(p);
    }));
    LIST.querySelectorAll('button.todo-disclose').forEach(d=>d.addEventListener('click',()=>{ const items=load(); const p=d.getAttribute('data-path')||''; const node=getByPath(items,p); if(node){ node.collapsed = !node.collapsed; save(items); render(); } }));
    LIST.querySelectorAll('.todo-text[contenteditable]')
      .forEach(ed=>{
        ed.addEventListener('input',()=>{ const items=load(); const p=ed.getAttribute('data-path')||''; const node=getByPath(items,p); if(node){ node.text = ed.textContent||''; save(items);} });
        ed.addEventListener('keydown',(e)=>{
          const p=ed.getAttribute('data-path')||''; const text=ed.textContent||'';
          if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); newSiblingAfter(p); return; }
          if(e.key==='Tab' && !e.shiftKey){ e.preventDefault(); indentItem(p); return; }
          if(e.key==='Tab' && e.shiftKey){ e.preventDefault(); outdentItem(p); return; }
          if(e.key==='Backspace' && text.trim()===''){
            e.preventDefault(); deleteItem(p); return;
          }
        });
      });
    // Drag & drop
    let dragId='';
    LIST.querySelectorAll('.todo-grip').forEach(grip=>{
      grip.addEventListener('dragstart', (e)=>{ dragId = grip.getAttribute('data-id')||''; e.dataTransfer?.setData('text/plain', dragId); e.dataTransfer?.setDragImage(document.createElement('img'),0,0); });
    });
    LIST.querySelectorAll('.todo-item').forEach(row=>{
      row.addEventListener('dragover', (e)=>{
        if(!dragId) return; e.preventDefault();
        const rect=row.getBoundingClientRect(); const y=e.clientY-rect.top; const zone = y/rect.height;
        row.classList.remove('drop-before','drop-after','drop-into');
        if(zone<0.33) row.classList.add('drop-before'); else if(zone>0.66) row.classList.add('drop-after'); else row.classList.add('drop-into');
      });
      row.addEventListener('dragleave', ()=>{ row.classList.remove('drop-before','drop-after','drop-into'); });
      row.addEventListener('drop', (e)=>{
        if(!dragId) return; e.preventDefault();
        const targetId = row.getAttribute('data-id')||'';
        if(!targetId || targetId===dragId) { dragId=''; row.classList.remove('drop-before','drop-after','drop-into'); return; }
        const rect=row.getBoundingClientRect(); const y=e.clientY-rect.top; const zone=y/rect.height; let mode = 'into'; if(zone<0.33) mode='before'; else if(zone>0.66) mode='after';
        row.classList.remove('drop-before','drop-after','drop-into');
        moveNodeById(dragId, targetId, mode);
        dragId='';
      });
    });
  }

  TOGGLE?.addEventListener('click',()=>{ const next = !hideCompleted(); setHideCompleted(next); render(); });
  FORM.addEventListener('submit',(e)=>{ e.preventDefault(); const t=(INPUT.value||'').trim(); if(!t) return; const items=load(); items.unshift({id:genId(),text:t,done:false,collapsed:false,children:[]}); save(items); INPUT.value=''; render(); });
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
};

// Image Lightbox for avatars and headers
(function(){
  function extractUrl(val){
    if(!val) return null; const m = String(val).match(/url\((['"]?)(.*?)\1\)/); return m? m[2] : null;
  }
  function openLightbox(src){
    if(!src) return;
    const preload = new Image();
    function show(){
      const backdrop=document.createElement('div'); backdrop.className='lightbox-backdrop';
      const wrap=document.createElement('div'); wrap.className='lightbox-img';
      const img=document.createElement('img'); img.alt=''; img.src=src; wrap.appendChild(img);
      document.body.appendChild(backdrop);
      document.body.appendChild(wrap);
      document.body.classList.add('lightbox-open');
      function cleanup(){ try{document.body.removeChild(wrap);}catch{} try{document.body.removeChild(backdrop);}catch{} document.body.classList.remove('lightbox-open'); document.removeEventListener('keydown', onEsc); }
      function onEsc(e){ if(e.key==='Escape') cleanup(); }
      backdrop.addEventListener('click', cleanup);
      document.addEventListener('keydown', onEsc);
    }
    preload.onload = show;
    preload.onerror = show;
    preload.src = src;
  }
  // Avatar clicks (PC/NPC entity pages)
  document.querySelectorAll('.entity-avatar img').forEach(img=>{
    img.addEventListener('click', ()=> openLightbox(img.currentSrc || img.src));
  });
  // Entity header background
  document.querySelectorAll('.entity-header').forEach(h=>{
    h.addEventListener('click', ()=>{
      const v = getComputedStyle(h).getPropertyValue('--header');
      const url = extractUrl(v);
      if(url) openLightbox(url.replace(/^"|"$/g,''));
    });
  });
  // Generic page header background
  document.querySelectorAll('.page-header').forEach(h=>{
    h.addEventListener('click', ()=>{
      const v = getComputedStyle(h).getPropertyValue('--page-header');
      const url = extractUrl(v) || extractUrl(getComputedStyle(h, '::before').backgroundImage);
      if(url) openLightbox(url.replace(/^"|"$/g,''));
    });
  });
})();
