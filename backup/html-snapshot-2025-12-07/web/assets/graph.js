(async function(){
  const root = document.getElementById('globalGraph');
  if (!root) return;

  const G = await fetch('/graph.json').then(r=>r.json());
  const chips = (document.getElementById('drawerTop')||document).querySelectorAll('.chip[data-filter]');
  const active = new Set();

  function filtered(){
    if (active.size === 0) return G;
    const nodes = G.nodes.filter(n => (
      (active.has('pc') && n.tags.includes('pc')) ||
      (active.has('npc') && n.tags.includes('npc')) ||
      (active.has('location') && n.tags.includes('location')) ||
      (active.has('arc') && (n.tags.includes('arc') || n.tags.includes('planning')))
    ));
    const ids = new Set(nodes.map(n=>n.id));
    const edges = G.edges.filter(e => ids.has(e.source) && ids.has(e.target));
    return { nodes, edges };
  }

  chips.forEach(c => c.addEventListener('click', () => {
    c.classList.toggle('active');
    const f = c.dataset.filter;
    if (active.has(f)) active.delete(f); else active.add(f);
    render();
  }));

  function render(){
    const g = filtered();
    renderForceGraph(root, g.nodes, g.edges, { onClick: onNodeClick, onHover: onNodeHover });
  }

  // Tooltip
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);
  function onNodeHover(node, x, y){
    if (!node) { tip.style.display='none'; return; }
    tip.textContent = node.title;
    tip.style.left = (x+12)+'px';
    tip.style.top  = (y+12)+'px';
    tip.style.display = 'block';
  }

  // Right panel: preview + recent
  const previewEl = document.getElementById('graphPreview');
  const recentEl = document.getElementById('graphRecent');
  // Drawer controls
  (function setupDrawer(){
    const right = document.querySelector('.right');
    const toggle = document.getElementById('drawerToggle');
    const pin = document.getElementById('drawerPin');
    const KEY='drawerPinned';
    const pinned = JSON.parse(localStorage.getItem(KEY)||'true');
    if(!pinned) right.classList.add('collapsed');
    pin.textContent = pinned? 'Unpin' : 'Pin';
    toggle?.addEventListener('click', ()=>{ right.classList.toggle('collapsed'); });
    pin?.addEventListener('click', ()=>{ const now = !JSON.parse(localStorage.getItem(KEY)||'true'); localStorage.setItem(KEY, JSON.stringify(now)); pin.textContent = now? 'Unpin' : 'Pin'; });
  })();
  function hrefFor(id){ return '/' + id.replace(/\\/g,'/').replace(/\.md$/i, '.html').split('/').map(encodeURIComponent).join('/'); }
  function tagChip(t){ const m = (t==='pc'?'tag-pc': t==='npc'?'tag-npc': t==='location'?'tag-location': (t==='arc'||t==='planning')?'tag-arc':''); return '<span class="tag '+m+'">#'+t+'</span>'; }
  function setPreview(n){
    const tags = (n.tags||[]).map(tagChip).join(' ');
    previewEl.innerHTML = '<strong>'+n.title+'</strong>'+
      '<div class="meta">'+tags+'</div>'+
      '<div class="meta" style="margin-top:6px"><a href="'+hrefFor(n.id)+'">Open</a></div>';
  }
  function addRecent(n){
    const key='graphRecent';
    const arr = JSON.parse(localStorage.getItem(key)||'[]');
    const id = n.id; const i = arr.indexOf(id);
    if (i>=0) arr.splice(i,1);
    arr.unshift(id);
    while(arr.length>12) arr.pop();
    localStorage.setItem(key, JSON.stringify(arr));
    renderRecent();
  }
  async function renderRecent(){
    const key='graphRecent';
    const arr = JSON.parse(localStorage.getItem(key)||'[]');
    if (!arr.length) { recentEl.innerHTML='<div class="meta">No recent</div>'; return; }
    const notes = await fetch('/notes.json').then(r=>r.json());
    const items = arr.map(id=>notes.find(n=>n.id===id)).filter(Boolean)
      .map(n=>'<div class="recent-item"><a href="#" data-id="'+n.id+'">'+n.title+'</a></div>')
      .join('');
    recentEl.innerHTML = items;
    recentEl.querySelectorAll('a[data-id]').forEach(a=>a.addEventListener('click', (e)=>{
      e.preventDefault(); const id=a.getAttribute('data-id'); const n=notes.find(nn=>nn.id===id); if(n) setPreview(n);
    }));
  }
  function onNodeClick(n){ setPreview(n); addRecent(n); }

  render();
  renderRecent();

  // To-Do list (localStorage)
  (function setupTodos(){
    const FORM = document.getElementById('todoForm');
    const INPUT = document.getElementById('todoInput');
    const LIST = document.getElementById('todoList');
    const CLEAR = document.getElementById('todoClearDone');
    const KEY='graphTodos';
    function load(){ return JSON.parse(localStorage.getItem(KEY)||'[]'); }
    function save(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
    function itemTemplate(it,i){
      const id='todo_'+i;
      const cls = 'todo-text' + (it.done?' done':'');
      return '<li class="todo-item" role="listitem">'
        + '<input id="'+id+'" class="todo-check" type="checkbox" data-i="'+i+'" '+(it.done?'checked':'')+' aria-label="Mark task as done">'
        + '<label class="'+cls+'" for="'+id+'" data-i="'+i+'">'+escapeHtml(it.text)+'</label>'
        + '<div class="todo-actions-row">'
        +   '<button class="todo-btn" data-edit="'+i+'" title="Edit">Edit</button>'
        +   '<button class="todo-btn" data-del="'+i+'" title="Delete">Delete</button>'
        + '</div>'
      + '</li>';
    }
    function render(){
      const items=load();
      if(!items.length){ LIST.innerHTML='<li class="meta">No tasks yet</li>'; return; }
      LIST.innerHTML = items.map(itemTemplate).join('');
      LIST.querySelectorAll('input.todo-check').forEach(cb=>cb.addEventListener('change',()=>{ const items=load(); const i=parseInt(cb.getAttribute('data-i')); items[i].done = cb.checked; save(items); render(); }));
      LIST.querySelectorAll('button[data-del]').forEach(b=>b.addEventListener('click',()=>{ const items=load(); const i=parseInt(b.getAttribute('data-del')); items.splice(i,1); save(items); render(); }));
      LIST.querySelectorAll('button[data-edit]').forEach(b=>b.addEventListener('click',()=>{ startEdit(parseInt(b.getAttribute('data-edit'))); }));
    }
    function startEdit(i){
      const items=load(); const it=items[i];
      const li = LIST.children[i]; if(!li) return;
      const label = li.querySelector('label.todo-text');
      const current = it.text;
      label.outerHTML = '<input class="todo-edit" data-i="'+i+'" value="'+escapeHtml(current)+'" aria-label="Edit task">';
      const editor = li.querySelector('input.todo-edit');
      editor.focus(); editor.select();
      function commit(saveIt){ const items=load(); if(saveIt){ const v=editor.value.trim(); items[i].text = v||current; } save(items); render(); }
      editor.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); commit(true);} if(e.key==='Escape'){ e.preventDefault(); commit(false);} });
      editor.addEventListener('blur',()=>commit(true));
    }
    CLEAR?.addEventListener('click',()=>{ const items=load().filter(it=>!it.done); save(items); render(); });
    FORM?.addEventListener('submit',(e)=>{ e.preventDefault(); const t=(INPUT.value||'').trim(); if(!t) return; const items=load(); items.unshift({text:t,done:false}); save(items); INPUT.value=''; render(); });
    function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]||c)); }
    render();
  })();
})();

function renderForceGraph(container, nodes, edges, handlers){
  const W = container.clientWidth, H = container.clientHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  container.innerHTML = '';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const pos = new Map(nodes.map(n => [n.id, {x:Math.random()*W, y:Math.random()*H, vx:0, vy:0} ]));
  let scale=1, tx=0, ty=0; let dragging=false, lx=0, ly=0; let hoverNode=null;
  // initial centering
  (function center(){ let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity; pos.forEach(p=>{ if(p.x<minx)minx=p.x; if(p.x>maxx)maxx=p.x; if(p.y<miny)miny=p.y; if(p.y>maxy)maxy=p.y; }); const cx=(minx+maxx)/2, cy=(miny+maxy)/2; tx = W/2 - cx*scale; ty = H/2 - cy*scale; })();
  const tagColor=(tags=[])=>{
    if(tags.includes('pc')) return '#22d3ee';
    if(tags.includes('npc')) return '#f472b6';
    if(tags.includes('location')) return '#a3e635';
    if(tags.includes('arc')||tags.includes('planning')) return '#f59e0b';
    return '#7cc7ff';
  };
  const worldToScreen = (p) => ({ x: p.x*scale+tx, y: p.y*scale+ty });
  const screenToWorld = (x,y) => ({ x:(x-tx)/scale, y:(y-ty)/scale });

  function step(){
    for(const e of edges){
      const a=pos.get(e.source), b=pos.get(e.target);
      const dx=b.x-a.x, dy=b.y-a.y; const d=Math.hypot(dx,dy)||0.01; const k=0.01*(d-90);
      const fx=k*dx/d, fy=k*dy/d; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
    }
    for(const p of pos.values()){
      for(const q of pos.values()) if(p!==q){ const dx=p.x-q.x, dy=p.y-q.y; const d2=dx*dx+dy*dy; if(d2<1) continue; const f=45/d2; p.vx+=dx*f; p.vy+=dy*f; }
      p.vx*=0.85; p.vy*=0.85; p.x+=p.vx; p.y+=p.vy;
    }
  }
  function draw(){
    ctx.clearRect(0,0,W,H); ctx.lineWidth=1; ctx.globalAlpha=0.7; ctx.strokeStyle='#2a2f3f';
    for(const e of edges){ const a=worldToScreen(pos.get(e.source)), b=worldToScreen(pos.get(e.target)); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
    for(const n of nodes){ const p=worldToScreen(pos.get(n.id)); const r=4; ctx.beginPath(); ctx.fillStyle=tagColor(n.tags); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); }
  }
  (function loop(){ step(); draw(); requestAnimationFrame(loop); })();

  canvas.addEventListener('mousedown',(e)=>{ dragging=true; lx=e.clientX; ly=e.clientY; });
  canvas.addEventListener('mouseup',()=>{ dragging=false; });
  canvas.addEventListener('mouseleave',()=>{ dragging=false; handlers&&handlers.onHover&&handlers.onHover(null,0,0); });
  canvas.addEventListener('mousemove',(e)=>{
    if(dragging){ tx += (e.clientX-lx); ty += (e.clientY-ly); lx=e.clientX; ly=e.clientY; }
    const rect=canvas.getBoundingClientRect(); const x=e.clientX-rect.left, y=e.clientY-rect.top; const w=screenToWorld(x,y);
    let hit=null; for(const n of nodes){ const p=pos.get(n.id); const d=Math.hypot(p.x-w.x,p.y-w.y); if(d<8){ hit=n; break; } }
    hoverNode=hit; handlers&&handlers.onHover&&handlers.onHover(hit, e.pageX, e.pageY);
  });
  canvas.addEventListener('wheel',(e)=>{
    e.preventDefault();
    const rect=canvas.getBoundingClientRect(); const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const before=screenToWorld(mx,my);
    const delta = -e.deltaY * 0.001 * (e.ctrlKey? 2 : 1);
    const s = Math.exp(delta);
    scale = Math.min(5, Math.max(0.2, scale * s));
    const after=screenToWorld(mx,my);
    tx += (mx - (after.x*scale)) - (mx - (before.x*scale));
    ty += (my - (after.y*scale)) - (my - (before.y*scale));
  }, { passive:false });

  canvas.addEventListener('click',()=>{ if(!hoverNode) return; handlers&&handlers.onClick&&handlers.onClick(hoverNode); });
}
