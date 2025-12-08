(async function(){
  const list=document.getElementById('tagList'); const out=document.getElementById('tagResults');
  const idx=await fetch('/search-index.json').then(r=>r.json());
  const set=new Set(); idx.forEach(it=> (it.tags||[]).forEach(t=>set.add(t)));
  const tags=Array.from(set).sort();
  function urlFor(id){ return '/' + id.replace(/\\/g,'/').replace(/\.md$/i,'.html').split('/').map(encodeURIComponent).join('/'); }
  list.innerHTML = tags.map(function(t){ return '<a class="tag" href="#'+t+'">#'+t+'</a>'; }).join(' ');
  function render(tag){
    const hits=idx.filter(function(it){ return (it.tags||[]).includes(tag); });
    const listHtml = hits.length ? ('<ul>' + hits.map(function(h){ return '<li><a href="' + urlFor(h.id) + '">' + h.title + '</a></li>'; }).join('') + '</ul>') : '<div class="meta">No notes</div>';
    out.innerHTML = '<h3>#'+tag+'</h3>' + listHtml;
  }
  if(location.hash){ render(location.hash.slice(1)); }
  window.addEventListener('hashchange', function(){ render(location.hash.slice(1)); });
})();
