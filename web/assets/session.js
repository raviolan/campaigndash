(async function(){
  const notes=await fetch('/notes.json').then(r=>r.json());
  const quick=document.getElementById('quick'); const pinned=document.getElementById('pinned');
  const urlFor=(id)=>'/' + id.replace(/\\/g,'/').replace(/\.md$/i,'.html').split('/').map(encodeURIComponent).join('/');
  function card(n){ return '<div class="card"><a href="' + urlFor(n.id) + '">' + n.title + '</a><div class="meta">' + ((n.tags||[]).map(function(t){return '#'+t}).join(' ')) + '</div></div>'; }
  const picks=notes.filter(function(n){ return /^(00_Campaign|01_Arcs|02_World|03_PCs)\//.test(n.id); }).slice(0,24);
  quick.innerHTML=picks.map(card).join('');
  function renderPins(){ const pins=JSON.parse(localStorage.getItem('pins')||'[]'); const items=pins.map(function(id){ return notes.find(function(n){ return n.id===id; }); }).filter(Boolean); pinned.innerHTML = items.length? items.map(card).join('') : '<div class="meta">Pin notes from their pages (star next to title).</div>'; }
  renderPins();
  const I=document.getElementById('diceInput'); const O=document.getElementById('diceOut'); document.getElementById('rollBtn').onclick=function(){ O.textContent=rollDice(I.value||'1d20'); };
})();

// Session editor local storage + Cmd/Ctrl+S save hook
(function(){
  const editor = document.getElementById('sessionEditor');
  if(!editor) return;
  const KEY='sessionNotes';
  // restore
  try{ editor.value = localStorage.getItem(KEY)||''; }catch{}
  // autosave on input
  editor.addEventListener('input', ()=>{ try{ localStorage.setItem(KEY, editor.value); }catch{} });
  // cmd/ctrl+S to save file
  document.addEventListener('keydown', async (e)=>{
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){
      e.preventDefault(); await window.saveSessionSnapshot?.();
    }
  });
})();

function rollDice(expr){
  try {
    const m = expr.replace(/\s+/g,'').match(/(\d*)d(\d+)(kh\d+|kl\d+)?([+-]\d+)?/i);
    if(!m) return 'Invalid';
    const cnt = parseInt(m[1]||'1',10), sides = parseInt(m[2],10);
    const mod = m[4] ? parseInt(m[4],10) : 0;
    const keep = m[3];
    const rolls = Array.from({length:cnt}, () => 1+Math.floor(Math.random()*sides));
    let used = rolls.slice();
    if(keep){
      const k = parseInt(keep.slice(2),10);
      used = rolls.slice().sort((a,b)=> keep.startsWith('kh')? (b-a):(a-b)).slice(0,k);
    }
    const total = used.reduce((a,b)=>a+b,0) + mod;
    return expr + ' => [' + rolls.join(', ') + '] ' + (keep?('=> keep ['+used.join(', ')+'] '):'') + (mod? ((mod>0?'+':'')+mod) : '') + '= ' + total;
  } catch(e) {
    return 'Error';
  }
}
