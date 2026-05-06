// ================================================================
// api.js  —  Shared API Functions + UI Helpers
// ================================================================
// Every HTML page loads this file.
// It provides:
//   - API call functions (fetch from backend)
//   - Toast notifications
//   - Skeleton / empty-state helpers
//   - Navbar: scroll effect, mobile menu, search widget
// ================================================================

const API = 'http://localhost:3000/api';


// ================================================================
// ARTWORK API CALLS
// ================================================================

async function apiGetAll() {
  const r = await fetch(`${API}/artworks`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.data;
}

async function apiGetPublished() {
  const r = await fetch(`${API}/artworks/published`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.data;
}

async function apiGetOne(id) {
  const r = await fetch(`${API}/artworks/${id}`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.data;
}

async function apiCreate(data) {
  const r = await fetch(`${API}/artworks`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data)
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.artwork_id;
}

async function apiPublish(id, val) {
  const r = await fetch(`${API}/artworks/${id}/publish`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ is_published: val })
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
}

async function apiDelete(id) {
  const r = await fetch(`${API}/artworks/${id}`, { method: 'DELETE' });
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
}

async function apiUploadImage(artworkId, file, isPrimary = false) {
  const form = new FormData();
  form.append('image', file);
  form.append('is_primary', isPrimary);
  const r = await fetch(`${API}/artworks/${artworkId}/image`, { method: 'POST', body: form });
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.image_url;
}


// ================================================================
// ARTIST API CALLS
// ================================================================

async function apiGetArtists() {
  const r = await fetch(`${API}/artists`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.data;
}

async function apiGetArtistsWithArtworks() {
  const r = await fetch(`${API}/artists/with-artworks`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.data;
}

async function apiGetArtist(id) {
  const r = await fetch(`${API}/artists/${id}`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.data;
}

async function apiCreateArtist(name, location, bio) {
  const r = await fetch(`${API}/artists`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, location, bio })
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d.artist_id;
}


// ================================================================
// SEARCH API CALL
// ================================================================

async function apiSearch(query) {
  const r = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
  return d;  // { data, source, query }
}


// ================================================================
// UI HELPERS
// ================================================================

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = type === 'error' ? 'error show' : 'show';
  setTimeout(() => { t.className = ''; }, 3500);
}

function showSpinner(selector) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
}

function showSkeletons(selector, count = 6) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = Array(count).fill(`
    <div class="card card-skeleton">
      <div class="card-image"></div>
      <div class="card-body">
        <div class="skeleton-line" style="width:40%"></div>
        <div class="skeleton-line" style="width:80%"></div>
        <div class="skeleton-line" style="width:55%"></div>
      </div>
    </div>`).join('');
}

function showEmpty(selector, msg = 'No results found.') {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = `
    <div class="empty-state">
      <div class="icon">🖼️</div>
      <p>${msg}</p>
    </div>`;
}

function money(val) {
  if (!val) return '—';
  return '$' + parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2 });
}


// ================================================================
// NAVBAR — runs on every page
// ================================================================
document.addEventListener('DOMContentLoaded', () => {

  // Mark the active nav link based on current filename
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  // Hamburger toggle (mobile menu)
  const burger = document.getElementById('hamburger');
  const links  = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', () => {
      links.classList.toggle('open');
      burger.classList.toggle('open');
    });
  }

  setupNavSearch();
});


// ================================================================
// NAVBAR SEARCH — live dropdown on every page
// ================================================================
function setupNavSearch() {
  const wrap   = document.getElementById('nav-search');
  const toggle = document.getElementById('nav-search-toggle');
  const input  = document.getElementById('nav-search-input');
  const drop   = document.getElementById('nav-search-dropdown');
  if (!wrap || !toggle || !input || !drop) return;

  let timer;

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    input.focus();
  });

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
    drop.innerHTML = '<div class="ns-status">Searching…</div>';
    drop.classList.add('open');
    positionDrop();
    timer = setTimeout(() => fetchResults(q), 320);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target) && !drop.contains(e.target)) closeSearch();
  });

  async function fetchResults(q) {
    try {
      const result = await apiSearch(q);
      renderDrop(result.data);
    } catch {
      drop.innerHTML = '<div class="ns-status">Could not connect to server.</div>';
    }
  }

  function renderDrop(data) {
    if (!data.length) {
      drop.innerHTML = '<div class="ns-status">No results found.</div>';
      return;
    }
    drop.innerHTML = data.slice(0, 8).map(art => `
      <a class="ns-result" href="artwork.html?id=${art.artwork_id}">
        <div class="ns-thumb">
          ${art.primary_image ? `<img src="${art.primary_image}" alt="">` : '🖼'}
        </div>
        <div class="ns-info">
          <div class="ns-title">${art.title}</div>
          <div class="ns-meta">${[art.artist_name, art.medium].filter(Boolean).join(' · ')}</div>
        </div>
      </a>
    `).join('');
  }

  function positionDrop() {
    const rect = wrap.getBoundingClientRect();
    drop.style.right = (window.innerWidth - rect.right) + 'px';
  }

  function closeSearch() {
    wrap.classList.remove('open');
    drop.classList.remove('open');
    drop.innerHTML = '';
    input.value = '';
    clearTimeout(timer);
  }
}
