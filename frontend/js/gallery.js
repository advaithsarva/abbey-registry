// ================================================================
// gallery.js — Public Gallery Page
// ================================================================
// 1. Load all published artworks from the backend when the page opens
// 2. Display them as image cards in a grid
// 3. Filter by medium when the user clicks a filter button
// 4. Search the collection using the search bar
// 5. Open a detail popup when the user clicks a card
// ================================================================

// Store all artworks after the first load so filtering doesn't
// need to hit the server again — just filter the saved array
let allArtworks = [];

// Run everything once the page has fully loaded
document.addEventListener('DOMContentLoaded', function() {
  loadGallery();
  setupFilters();
  setupModal();
  setupSearch();
});


// ----------------------------------------------------------------
// Load all published artworks from the backend
// ----------------------------------------------------------------
async function loadGallery(filter) {
  // Default to showing everything if no filter was passed
  if (filter === undefined) {
    filter = 'all';
  }

  // Show placeholder skeleton cards while we wait for data
  showSkeletons('#gallery-grid', 6);

  try {
    // Only fetch from the server once — after that use the cached array
    if (allArtworks.length === 0) {
      const response = await fetch('http://localhost:3000/api/artworks/published');
      const result   = await response.json();
      allArtworks    = result.data;
    }

    // Filter down to the chosen medium (or keep all if filter is 'all')
    let filtered = [];
    if (filter === 'all') {
      filtered = allArtworks;
    } else {
      allArtworks.forEach(function(art) {
        if ((art.medium || '').toLowerCase().includes(filter)) {
          filtered.push(art);
        }
      });
    }

    // Draw the cards
    renderCards(filtered);

  } catch (err) {
    showEmpty('#gallery-grid', 'Could not load artworks. Is the server running?');
  }
}


// ----------------------------------------------------------------
// Draw artwork cards into the grid
// ----------------------------------------------------------------
function renderCards(artworks) {
  const grid = document.getElementById('gallery-grid');

  // Show a message if there's nothing to display
  if (!artworks.length) {
    showEmpty('#gallery-grid', 'No artworks found for this category.');
    return;
  }

  grid.innerHTML = '';

  // Build a card for each artwork using string concatenation
  artworks.forEach(function(art, i) {
    // Show the artwork image or a placeholder icon
    // onerror hides the broken img and shows the emoji fallback instead
    const imgHTML = art.primary_image
      ? `<img src="${art.primary_image}" alt="${art.title}" loading="lazy"
              onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'opacity:.2;font-size:3rem\\'>🖼️</span>'">`
      : `<span style="opacity:.2;font-size:3rem">🖼️</span>`;

    // Add a status pill (On Display / In Storage / On Loan)
    const pillHTML = art.status
      ? `<div class="mt-1"><span class="pill ${pillClass(art.status)}">${art.status}</span></div>`
      : '';

    grid.innerHTML += `
      <div class="card" onclick="openModal(${art.artwork_id})"
           style="animation-delay: ${i * 0.07}s">
        <div class="card-image">${imgHTML}</div>
        <div class="card-body">
          <div class="card-tag">${art.medium || 'Artwork'}</div>
          <div class="card-title">${art.title}</div>
          <div class="card-sub">${art.artist_name || '—'} · ${art.date_created || ''}</div>
          ${pillHTML}
        </div>
      </div>`;
  });
}


// ----------------------------------------------------------------
// Filter buttons — each button filters by medium
// ----------------------------------------------------------------
function setupFilters() {
  const buttons = document.querySelectorAll('.filter-btn');

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      // Remove active style from all buttons, then highlight the clicked one
      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      // Reload with the chosen filter
      loadGallery(btn.dataset.filter);
    });
  });
}


// ----------------------------------------------------------------
// Gallery search bar — sends query to the search endpoint
// ----------------------------------------------------------------
function setupSearch() {
  const input = document.getElementById('gallery-search');
  const btn   = document.getElementById('search-btn');
  if (!input || !btn) return;

  // Search when the button is clicked
  btn.addEventListener('click', runSearch);

  // Also search when the user presses Enter
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') runSearch();
  });

  async function runSearch() {
    const query = input.value.trim();

    // If the search box is empty just reload the full gallery
    if (!query) {
      loadGallery();
      return;
    }

    showSkeletons('#gallery-grid', 4);

    try {
      // Ask the server to search and return ranked results
      const response = await fetch('http://localhost:3000/api/search?q=' + encodeURIComponent(query));
      const result   = await response.json();
      renderCards(result.data);
    } catch (err) {
      showEmpty('#gallery-grid', 'Search failed. Is the server running?');
    }
  }
}


// ----------------------------------------------------------------
// Open the artwork detail popup when a card is clicked
// ----------------------------------------------------------------
async function openModal(id) {
  const modal = document.getElementById('artwork-modal');
  const body  = document.getElementById('modal-body');

  // Open the modal and show a spinner while we load the details
  modal.classList.add('open');
  body.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  try {
    // Fetch the full artwork record including images and location
    const response = await fetch('http://localhost:3000/api/artworks/' + id);
    const result   = await response.json();
    const art      = result.data;

    // Find the primary image (or fall back to the first image)
    let img = null;
    if (art.images && art.images.length > 0) {
      art.images.forEach(function(i) {
        if (i.is_primary) img = i;
      });
      if (!img) img = art.images[0];
    }

    // Build the image or a placeholder box
    const imageHTML = img
      ? `<img src="${img.image_url}" alt="${art.title}" style="width:100%;border:1px solid rgba(184,150,90,.15)">`
      : `<div style="background:var(--cream);aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;font-size:5rem;opacity:.2">🖼️</div>`;

    // Current location if we have one
    const locationVal = art.location && art.location[0] ? art.location[0].current_location : null;

    // Build the modal content
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:2.5rem;align-items:start">
        <div>${imageHTML}</div>
        <div>
          <div class="label">${art.accession_number}</div>
          <h2 style="font-family:var(--font-display);font-size:1.9rem;font-weight:400;margin:.5rem 0 .3rem">${art.title}</h2>
          <p style="color:var(--gold);font-family:var(--font-ui);font-size:.85rem">${art.artist_name || ''}</p>
          <div class="divider"></div>
          <dl style="display:grid;grid-template-columns:1fr 1fr;gap:1rem 2rem;margin:1.5rem 0">
            ${dRow('Medium',     art.medium)}
            ${dRow('Date',       art.date_created)}
            ${dRow('Dimensions', art.dimensions)}
            ${dRow('Location',   locationVal)}
          </dl>
          ${art.description ? `<p style="color:var(--body-text);line-height:1.9">${art.description}</p>` : ''}
          <div style="margin-top:1.5rem">
            <a href="artwork.html?id=${art.artwork_id}" class="btn btn-gold btn-sm">View Full Detail →</a>
          </div>
        </div>
      </div>`;

  } catch (err) {
    body.innerHTML = `<p style="color:var(--rust)">Could not load artwork details.</p>`;
  }
}


// ----------------------------------------------------------------
// Close the popup — three ways to close it
// ----------------------------------------------------------------
function setupModal() {
  const modal = document.getElementById('artwork-modal');
  if (!modal) return;

  // 1. Click the X button
  document.getElementById('modal-close').addEventListener('click', function() {
    modal.classList.remove('open');
  });

  // 2. Click the dark backdrop behind the popup
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.classList.remove('open');
  });

  // 3. Press the Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') modal.classList.remove('open');
  });
}


// ----------------------------------------------------------------
// Helper: build a definition list row (label + value)
// ----------------------------------------------------------------
function dRow(label, val) {
  if (!val) return '';
  return `<div>
    <dt style="font-family:var(--font-ui);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.2rem">${label}</dt>
    <dd>${val}</dd>
  </div>`;
}


// ----------------------------------------------------------------
// Helper: pick the right CSS pill colour for a status string
// ----------------------------------------------------------------
function pillClass(status) {
  if (!status) return 'pill-muted';
  const s = status.toLowerCase();
  if (s.includes('display')) return 'pill-green';
  if (s.includes('storage')) return 'pill-gold';
  if (s.includes('loan'))    return 'pill-blue';
  return 'pill-muted';
}
