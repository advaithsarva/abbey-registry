// ================================================================
// artists.js — Artists Page
// ================================================================
// Shows all artists as image cards (grid) or rows (list).
// Clicking an artist opens a popup with their bio and artworks.
// Users can sort and switch between grid/list view.
// ================================================================

// Store artists after first load so sorting doesn't need a new fetch
let allArtists = [];

// Track which view and sort are currently active
let currentView = 'grid';
let currentSort = 'name-asc';

// Run everything once the page has loaded
document.addEventListener('DOMContentLoaded', function() {
  loadArtists();
  setupSortDropdown();
  setupViewToggle();
  setupModalClose();
});


// ----------------------------------------------------------------
// Load all artists from the backend
// ----------------------------------------------------------------
async function loadArtists() {
  // Show a spinner while we wait for the data
  document.getElementById('artists-container').innerHTML =
    '<div class="spinner-wrap"><div class="spinner"></div></div>';

  try {
    // Fetch artists — this endpoint also returns artwork count + sample image
    const response = await fetch('/api/artists/with-artworks');
    const result   = await response.json();
    allArtists     = result.data;

    // Update the count text above the grid
    const count = allArtists.length;
    document.getElementById('artist-count').textContent =
      count + ' artist' + (count !== 1 ? 's' : '') + ' in the collection';

    // Draw the artists on screen
    renderArtists();

  } catch (err) {
    // If the server is not running show a friendly message
    document.getElementById('artists-container').innerHTML = `
      <div class="empty-state">
        <div class="icon">👤</div>
        <p>Could not load artists. Is the server running?</p>
      </div>`;
  }
}


// ----------------------------------------------------------------
// Draw the artists — either as cards (grid) or rows (list)
// ----------------------------------------------------------------
function renderArtists() {
  // Sort a copy of the array — never modify the original
  const sorted    = sortArtistList(allArtists, currentSort);
  const container = document.getElementById('artists-container');

  // ---- GRID VIEW — portrait cards with image background ----
  if (currentView === 'grid') {
    container.className = 'artist-grid';
    container.innerHTML = '';

    sorted.forEach(function(artist) {
      // Show the artwork image, or a grey placeholder if there is none
      const imageHTML = artist.sample_image
        ? `<img src="${artist.sample_image}" alt="${artist.name}" loading="lazy">`
        : `<div class="artist-no-img">👤</div>`;

      // Build the caption: "Seattle, WA · 3 works"
      const workLabel = artist.artwork_count === 1 ? '1 work' : artist.artwork_count + ' works';
      const caption   = [artist.location, workLabel].filter(Boolean).join(' · ');

      container.innerHTML += `
        <div class="artist-card" onclick="openArtistModal(${artist.artist_id})">
          <div class="artist-card-img">
            ${imageHTML}
            <div class="artist-card-overlay">
              <div class="artist-card-name">${artist.name}</div>
              <div class="artist-card-meta">${caption}</div>
            </div>
          </div>
        </div>`;
    });

  // ---- LIST VIEW — horizontal row with circular thumbnail ----
  } else {
    container.className = 'artist-list';
    container.innerHTML = '';

    sorted.forEach(function(artist) {
      // Circular thumbnail on the left
      const thumbHTML = artist.sample_image
        ? `<img src="${artist.sample_image}" alt="${artist.name}">`
        : `<span>👤</span>`;

      // Cut long bios short so rows stay a consistent height
      const bioPreview = artist.bio && artist.bio.length > 110
        ? artist.bio.slice(0, 110) + '…'
        : (artist.bio || '');

      const workCount = artist.artwork_count;

      container.innerHTML += `
        <div class="artist-row" onclick="openArtistModal(${artist.artist_id})">
          <div class="artist-row-thumb">${thumbHTML}</div>
          <div class="artist-row-info">
            <div class="artist-row-name">${artist.name}</div>
            ${artist.location ? `<div class="artist-row-loc">${artist.location}</div>` : ''}
            ${bioPreview      ? `<div class="artist-row-bio">${bioPreview}</div>`       : ''}
          </div>
          <div class="artist-row-count">
            <div class="count-num">${workCount}</div>
            <div class="count-lbl">Work${workCount !== 1 ? 's' : ''}</div>
          </div>
        </div>`;
    });
  }
}


// ----------------------------------------------------------------
// Sort the artist list by the chosen option
// ----------------------------------------------------------------
function sortArtistList(artists, sortBy) {
  // Slice() makes a copy — we don't want to change the original order
  const copy = artists.slice();

  if (sortBy === 'name-asc') {
    // Alphabetical A to Z
    copy.sort(function(a, b) { return a.name.localeCompare(b.name); });

  } else if (sortBy === 'name-desc') {
    // Alphabetical Z to A
    copy.sort(function(a, b) { return b.name.localeCompare(a.name); });

  } else if (sortBy === 'works-desc') {
    // Artists with the most artworks come first
    copy.sort(function(a, b) { return b.artwork_count - a.artwork_count; });

  } else if (sortBy === 'location') {
    // Alphabetical by where the artist is from
    copy.sort(function(a, b) {
      return (a.location || '').localeCompare(b.location || '');
    });
  }

  return copy;
}


// ----------------------------------------------------------------
// Sort dropdown — change sort and redraw when user picks an option
// ----------------------------------------------------------------
function setupSortDropdown() {
  document.getElementById('sort-select').addEventListener('change', function() {
    currentSort = this.value;
    renderArtists();
  });
}


// ----------------------------------------------------------------
// View toggle — switch between Grid and List
// ----------------------------------------------------------------
function setupViewToggle() {
  const buttons = document.querySelectorAll('.view-toggle-btn');

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      // Remove active style from all buttons then add it to the clicked one
      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      // Update the view and redraw
      currentView = btn.dataset.view;
      renderArtists();
    });
  });
}


// ----------------------------------------------------------------
// Open the artist popup when a card or row is clicked
// ----------------------------------------------------------------
async function openArtistModal(artistId) {
  const modal = document.getElementById('artist-modal');
  const body  = document.getElementById('artist-modal-body');

  // Open the modal and show a loading spinner straight away
  modal.classList.add('open');
  body.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  try {
    // Fetch the artist's full profile + their published artworks
    const response = await fetch('/api/artists/' + artistId);
    const result   = await response.json();
    const artist   = result.data;

    // Use the first artwork image as the artist portrait (no official portrait field yet)
    const hasPortrait = artist.artworks && artist.artworks[0] && artist.artworks[0].primary_image;
    const portraitHTML = hasPortrait
      ? `<img src="${artist.artworks[0].primary_image}" alt="${artist.name}">`
      : '👤';

    // Build artwork thumbnails if the artist has published works
    let worksHTML = '';

    if (artist.artworks && artist.artworks.length > 0) {
      // Build a small card for each artwork
      let thumbsHTML = '';
      artist.artworks.forEach(function(work) {
        const imgHTML = work.primary_image
          ? `<img src="${work.primary_image}" alt="${work.title}" loading="lazy">`
          : `<div class="artist-work-placeholder">🖼️</div>`;

        thumbsHTML += `
          <a class="artist-work-card" href="artwork.html?id=${work.artwork_id}">
            <div class="artist-work-img">${imgHTML}</div>
            <div class="artist-work-title">${work.title}</div>
            <div class="artist-work-meta">${work.medium || ''}</div>
          </a>`;
      });

      worksHTML = `
        <div class="divider" style="margin:1.8rem 0"></div>
        <p class="label" style="margin-bottom:1rem">Works in the Collection</p>
        <div class="artist-works-grid">${thumbsHTML}</div>`;

    } else {
      worksHTML = `<p style="color:var(--muted);margin-top:1.5rem;font-size:.9rem">
        No published works in the collection yet.</p>`;
    }

    // Build the full modal HTML and insert it
    body.innerHTML = `
      <div class="artist-modal-header">
        <div class="artist-modal-portrait">${portraitHTML}</div>
        <div class="artist-modal-meta">
          ${artist.location ? `<p class="label" style="margin-bottom:.4rem">${artist.location}</p>` : ''}
          <h2 style="font-size:1.65rem;font-weight:600;letter-spacing:-.02em;
                     line-height:1.2;margin-bottom:.7rem">${artist.name}</h2>
          ${artist.bio
            ? `<p style="color:var(--muted);line-height:1.8;font-size:.93rem">${artist.bio}</p>`
            : ''}
        </div>
      </div>
      ${worksHTML}`;

  } catch (err) {
    body.innerHTML = `<p style="color:var(--red);padding:1rem">Could not load artist details.</p>`;
  }
}


// ----------------------------------------------------------------
// Close the popup — three ways to close it
// ----------------------------------------------------------------
function setupModalClose() {
  const modal = document.getElementById('artist-modal');

  // 1. Click the X button
  document.getElementById('artist-modal-close').addEventListener('click', function() {
    modal.classList.remove('open');
  });

  // 2. Click the dark backdrop behind the popup
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  });

  // 3. Press the Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      modal.classList.remove('open');
    }
  });
}
