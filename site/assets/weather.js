// DnD dice-driven weather generator
(function () {
  console.log('[Weather] weather.js loaded');

  // Ensure components.css is loaded on pages that don't include it
  function ensureComponentsCss() {
    try {
      if (!document.querySelector('link[href*="components.css"]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = '/assets/components.css?v=1';
        document.head.appendChild(l);
        console.log('[Weather] injected components.css');
      } else {
        console.log('[Weather] components.css already present');
      }
    } catch (e) { console.warn('[Weather] failed to inject components.css', e); }
  }
  ensureComponentsCss();
  const WEATHER_TYPES = [
    { id: 'clear', name: 'Clear', icon: '☀️', meta: 'Bright and clear' },
    { id: 'partly', name: 'Partly Cloudy', icon: '⛅', meta: 'Light clouds' },
    { id: 'cloudy', name: 'Cloudy', icon: '☁️', meta: 'Overcast' },
    { id: 'light_rain', name: 'Light Rain', icon: '🌦️', meta: 'Drizzle or light showers' },
    { id: 'heavy_rain', name: 'Heavy Rain', icon: '🌧️', meta: 'Heavy rain' },
    { id: 'thunder', name: 'Thunderstorms', icon: '⛈️', meta: 'Thunder and lightning' },
    { id: 'fog', name: 'Fog', icon: '🌫️', meta: 'Low visibility' },
    { id: 'snow', name: 'Snow', icon: '❄️', meta: 'Snowfall' }
  ];

  // SVG sprite-like icons (inline small icons)
  const SVG_ICONS = {
    sun: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="32" cy="32" r="12" fill="currentColor"/></svg>',
    sunCloud: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="currentColor"><circle cx="22" cy="22" r="8"/><path d="M40 30a8 8 0 10-1.5 15H46a8 8 0 000-16h-6z"/></g></svg>',
    cloud: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 40a10 10 0 010-20 12 12 0 0123 2 8 8 0 010 16H20z" fill="currentColor"/></svg>',
    rain: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 34a10 10 0 010-20 12 12 0 0123 2 8 8 0 010 16H20z" fill="currentColor"/><g fill="currentColor"><path d="M25 46l2 6-4 0z"/><path d="M33 46l2 6-4 0z"/><path d="M41 46l2 6-4 0z"/></g></svg>',
    heavyRain: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 32a12 12 0 0112-12 14 14 0 0128 2 10 10 0 010 20H18z" fill="currentColor"/><g fill="currentColor"><path d="M26 44l3 8-6 0z"/><path d="M36 44l3 8-6 0z"/></g></svg>',
    thunder: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 28a12 12 0 0112-12 14 14 0 0128 2 10 10 0 010 20H18z" fill="currentColor"/><path d="M34 36l6-8-8 2 4 10-8 0z" fill="currentColor"/></svg>',
    fog: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="10" y="30" width="44" height="6" rx="3" fill="currentColor"/><rect x="8" y="38" width="48" height="6" rx="3" fill="currentColor"/></svg>',
    snow: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="currentColor"><circle cx="24" cy="34" r="2"/><circle cx="32" cy="38" r="2"/><circle cx="40" cy="34" r="2"/></g></svg>'
  };

  // Stronger gradient map applied inline so the card background updates immediately
  const GRADIENTS = {
    // Muted gradients with safer contrast for text
    clear: { bg: 'linear-gradient(180deg,#f6e7c9 0%, #f1d9b0 100%)', color: '#08202a' },
    partly: { bg: 'linear-gradient(180deg,#f7efdb 0%, #efe3c8 100%)', color: '#08202a' },
    cloudy: { bg: 'linear-gradient(180deg,#e6edf2 0%, #cfd8de 100%)', color: '#061426' },
    light_rain: { bg: 'linear-gradient(180deg,#d7eaf8 0%, #c9e2f6 100%)', color: '#042033' },
    heavy_rain: { bg: 'linear-gradient(180deg,#b9d5ee 0%, #98bddf 100%)', color: '#05243a' },
    thunder: { bg: 'linear-gradient(180deg,#2b333c 0%, #162027 100%)', color: '#ffffff' },
    fog: { bg: 'linear-gradient(180deg,#eef3f4 0%, #e3e9ea 100%)', color: '#061426' },
    snow: { bg: 'linear-gradient(180deg,#f0f8ff 0%, #e1eefc 100%)', color: '#06202a' }
  };

  // Effects mapping: condition id -> array of text effects
  const EFFECTS = {
    heavy_rain: ['Stealth +2 (heavy rain masks sound)'],
    thunder: ['Stealth +2 (thunder masks sound)', 'Disadvantage on Perception checks relying on hearing'],
    fog: ['Ranged attacks have disadvantage at long range', 'Perception (sight) -2'],
    snow: ['Difficult terrain in deep snow', 'Cold exposure risk (DM discretion)'],
    // Additional common-condition effects for more frequent feedback
    clear: ['Hot sun: short rests feel less restful (DM may increase recovery needs)'],
    partly: ['Sun glare: ranged attacks at long range -1 (flair)'],
    cloudy: ['Dimmer light: Perception (sight) -1'],
    light_rain: ['Light rain: Stealth +1 (rain masks light noise)']
  };

  const storageKey = 'campaigndash_weather_v1';

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  // Simple dice roll: 1d20 -> map to weather types
  function rollWeatherDie() {
    const d = randInt(1, 20);
    // Map ranges to conditions (tunable)
    if (d >= 18) return 'clear';
    if (d >= 15) return 'partly';
    if (d >= 11) return 'cloudy';
    if (d >= 8) return 'light_rain';
    if (d >= 6) return 'heavy_rain';
    if (d >= 4) return 'thunder';
    if (d === 3) return 'fog';
    return 'snow';
  }

  function makeForecast() {
    // Now + 3 upcoming ticks (add a temperature value)
    const entries = [];
    for (let i = 0; i < 4; i++) {
      const id = rollWeatherDie();
      const type = WEATHER_TYPES.find(w => w.id === id) || WEATHER_TYPES[0];
      const temp = genTempFor(type.id);
      entries.push({ id: type.id, name: type.name, icon: type.icon, meta: type.meta, temp });
    }
    return entries;
  }

  function save(state) { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function load() { try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { return null } }

  function render(state) {
    const root = document.getElementById('weatherCard');
    if (!root) return;
    const now = state.entries[0];
    // No date/location labels per user's preference
    // Update main block with SVG icon
    const iconEl = root.querySelector('.weather-icon');
    if (iconEl) iconEl.innerHTML = svgFor(now.id);
    const condEl = root.querySelector('.weather-condition');
    if (condEl) condEl.textContent = now.name;
    const metaEl = root.querySelector('.weather-meta');
    if (metaEl) metaEl.textContent = now.meta;
    const tempEl = root.querySelector('.weather-temp');
    if (tempEl) tempEl.textContent = now.temp + '°';

    // Update gradient class by condition
    root.classList.remove('wc-clear','wc-partly','wc-cloudy','wc-light_rain','wc-heavy_rain','wc-thunder','wc-fog','wc-snow');
    root.classList.add('wc-' + now.id);
    // Apply inline gradient & color for a stronger top->down gradient that updates instantly
    const g = GRADIENTS[now.id] || GRADIENTS.clear;
      try {
        // set multiple properties to ensure the gradient shows (some browsers/readers prefer explicit background-image)
        root.style.background = g.bg;
        root.style.backgroundImage = g.bg;
        // also set a fallback background color using the last color stop if possible
        const fallback = g.bg.match(/#([0-9a-fA-F]{3,6})/g);
        if (fallback && fallback.length) root.style.backgroundColor = fallback[fallback.length - 1];
        // Decide on a safe content color. For very bright conditions force a dark
        // text color so content is always readable.
        const darkTextFor = ['clear','partly','cloudy','light_rain','snow','fog'];
        const forcedDark = darkTextFor.indexOf(now.id) !== -1;
        // Use a neutral dark gray for light/bright backgrounds to improve legibility
        const chosenColor = forcedDark ? '#333333' : (g.color || '#06202a');
        root.style.color = chosenColor;
        // Also explicitly set inline color on important inner nodes to override
        // any site-level rules that might force a pale/white color.
        try {
          const setColor = (sel) => { const el = root.querySelector(sel); if (el) el.style.color = chosenColor; };
          setColor('.weather-condition');
          setColor('.weather-meta');
          setColor('.weather-temp');
          setColor('.weather-icon');
          // forecast items
          const fTimes = root.querySelectorAll('.forecast-item .f-time');
          fTimes.forEach(n => n.style.color = chosenColor);
          const fTemps = root.querySelectorAll('.forecast-item .f-temp');
          fTemps.forEach(n => n.style.color = chosenColor);
        } catch (e) { /* ignore */ }
        // compute badge/bg colors based on text color luminance so badges contrast reliably
        try {
          function hexToRgb(hex) {
            const h = hex.replace('#','');
            const bigint = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
            return { r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255 };
          }
          function luminance(r,g,b){
            const a=[r,g,b].map(v=>{ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
            return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
          }
        const rgb = hexToRgb(chosenColor);
          const lum = luminance(rgb.r,rgb.g,rgb.b);
          // If text color is light (lum > 0.5), use dark badge bg, else light translucent badge bg
          if (lum > 0.5) {
            root.style.setProperty('--badge-bg', 'rgba(0,0,0,0.22)');
            root.style.setProperty('--badge-color', '#fff');
          } else {
            // For bright-card cases (where we've forced dark text) use a light
            // translucent badge background so dark badge text remains readable.
            const badgeBg = forcedDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)';
            root.style.setProperty('--badge-bg', badgeBg);
            root.style.setProperty('--badge-color', chosenColor || '#06202a');
          }
        } catch (e) { console.warn('[Weather] badge color calc failed', e); }
        console.log('[Weather] applied gradient for', now.id, g.bg);
      } catch (e) { console.warn('[Weather] failed to apply gradient', e); }

    const list = root.querySelector('.weather-forecast');
    list.innerHTML = '';
    const labels = ['Now', 'Soon', 'Later', 'Future'];
    state.entries.forEach((e, i) => {
      const li = document.createElement('div'); li.className = 'forecast-item';
      li.innerHTML = '<div class="f-time">' + labels[i] + '</div>' +
        '<div class="f-icon">' + svgFor(e.id,24) + '</div>' +
        '<div class="f-temp">' + e.temp + '°</div>' +
        '<div class="f-desc" style="font-size:11px;color:var(--muted);">' + e.name + '</div>';
      list.appendChild(li);
    });

    const effectsEl = root.querySelector('.weather-effects');
    const nowEffects = EFFECTS[now.id] || [];
    console.log('[Weather] condition:', now.id, 'effects count:', nowEffects.length, 'effects:', nowEffects);
    if (!effectsEl) console.warn('[Weather] no .weather-effects container found');
    if (nowEffects.length) {
      effectsEl.innerHTML = '';
      nowEffects.forEach(eff => {
        const b = document.createElement('div'); b.className = 'effect-badge'; b.textContent = eff;
        // ensure visible even if some page styles are restrictive
        b.style.display = 'inline-flex'; b.style.alignItems = 'center';
        effectsEl.appendChild(b);
      });
      effectsEl.style.display = 'flex';
    } else {
      effectsEl.innerHTML = '';
      effectsEl.style.display = 'none';
    }

    // Also render compact top strip if present
    renderStrip(state);
  }

  // Render compact weather strip at top of page (if present)
  function renderStrip(state) {
    const strip = document.getElementById('weatherStrip');
    if (!strip) return;
    const now = state.entries[0];
    strip.className = 'weather-strip wc-' + now.id;
    strip.innerHTML = '';
    const inner = document.createElement('div'); inner.className = 'weather-strip-inner';
    const icon = document.createElement('div'); icon.className = 'strip-icon'; icon.innerHTML = svgFor(now.id,30);
    const temp = document.createElement('div'); temp.className = 'strip-temp'; temp.textContent = now.temp + '°C';
    const effectsWrap = document.createElement('div'); effectsWrap.className = 'strip-effects';
    const nowEffects = EFFECTS[now.id] || [];
    console.log('[Weather] strip effects count:', nowEffects.length);
    nowEffects.forEach(eff => { const b = document.createElement('div'); b.className = 'effect-badge'; b.textContent = eff; effectsWrap.appendChild(b); });
    inner.appendChild(icon); inner.appendChild(temp); inner.appendChild(effectsWrap);
    strip.appendChild(inner);
  }

  // Observe the weather card for unexpected mutations that may remove badges
  // and re-apply them if necessary. This helps if other page scripts or
  // runtime template normalizers overwrite the content after render().
  function attachBadgeObserver() {
    const root = document.getElementById('weatherCard');
    if (!root) return;
    // only attach once
    if (root.__weatherBadgeObserverAttached) return;
    root.__weatherBadgeObserverAttached = true;
    let timer = null;
    const obs = new MutationObserver(muts => {
      // If badges were removed or the .weather-effects container was cleared,
      // debounce and re-render using the saved state in localStorage.
      const effectsCt = root.querySelectorAll('.effect-badge').length;
      const hasContainer = !!root.querySelector('.weather-effects');
      if (!hasContainer || effectsCt === 0) {
        console.log('[Weather] MutationObserver detected missing badges or container (count=' + effectsCt + '). Re-rendering shortly.');
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            const st = load();
            if (st && st.entries) {
              // temporarily disconnect to avoid loops
              obs.disconnect();
              render(st);
              // small reattach to keep watching future removals
              obs.observe(root, { childList: true, subtree: true, attributes: true });
              console.log('[Weather] MutationObserver re-rendered badges');
            }
          } catch (e) { console.warn('[Weather] observer re-render failed', e); }
        }, 120);
      }
    });
    obs.observe(root, { childList: true, subtree: true, attributes: true });
  }

  // Return inline SVG markup for a condition id; optional size param
  function svgFor(id, size) {
    size = size || 56;
    switch (id) {
      case 'clear': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.sun+'</div>';
      case 'partly': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.sunCloud+'</div>';
      case 'cloudy': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.cloud+'</div>';
      case 'light_rain': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.rain+'</div>';
      case 'heavy_rain': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.heavyRain+'</div>';
      case 'thunder': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.thunder+'</div>';
      case 'fog': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.fog+'</div>';
      case 'snow': return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.snow+'</div>';
      default: return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;color:currentColor">'+SVG_ICONS.sun+'</div>';
    }
  }

  // Temperature generator by weather type (simple ranges)
  function genTempFor(typeId) {
    switch (typeId) {
      case 'clear': return randInt(18, 30);
      case 'partly': return randInt(16, 25);
      case 'cloudy': return randInt(14, 22);
      case 'light_rain': return randInt(12, 20);
      case 'heavy_rain': return randInt(10, 18);
      case 'thunder': return randInt(8, 16);
      case 'fog': return randInt(5, 12);
      case 'snow': return randInt(-8, 2);
      default: return randInt(10, 20);
    }
  }

  function init() {
    // Ensure the weather card exists in the sidebar. Many pages are pre-built
    // from partials; to keep markup consistent we normalize the card HTML
    // whether it was added at build time or not.
    let root = document.getElementById('weatherCard');
    const sidebar = document.querySelector('.left .sidebar') || document.querySelector('.left');
    const tplInner = `
        <div style="padding:12px">
          <div class="weather-header">
            <div class="weather-title">Weather</div>
            <button id="rollWeather" class="chip" title="Roll weather">Roll</button>
          </div>
        </div>
        <div class="weather-now" aria-live="polite">
            <div class="weather-icon">${svgFor('clear')}</div>
            <div class="weather-main">
                <div class="weather-condition">Unknown</div>
                <div style="display:flex;gap:8px;align-items:center;"><div class="weather-temp">--</div><div class="weather-meta">--</div></div>
            </div>
        </div>
        <div class="weather-stats" style="padding:0 12px"></div>
        <div class="weather-forecast" role="list"></div>
        <div class="weather-effects" aria-hidden="false" style="padding:0 12px 12px 12px"></div>
    `;
    if (!root && sidebar) {
      // not present at all, append full wrapper
      sidebar.insertAdjacentHTML('beforeend', '<div id="weatherCard" class="card weather-card" aria-label="Weather">' + tplInner + '</div>');
      root = document.getElementById('weatherCard');
    } else if (root) {
      // normalize existing card inner HTML to our template (remove date/location)
      root.classList.add('weather-card');
      root.innerHTML = tplInner;
    }
    if (!root) return;
    let state = load();
    if (!state) {
      state = { entries: makeForecast(), ts: Date.now() };
      save(state);
    }
    render(state);

    const btn = document.getElementById('rollWeather');
    if (btn) {
      btn.addEventListener('click', () => {
      const newState = { entries: makeForecast(), ts: Date.now() };
      save(newState);
      render(newState);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.campaigndashWeather = { makeForecast, rollWeatherDie };

})();
