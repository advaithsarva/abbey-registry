// ================================================================
// artwork.js — Single Artwork Detail Page
// ================================================================
// Reads the artwork ID from the URL (?id=3), fetches that artwork
// from the backend, and builds the full detail page on screen.
// Also handles clicking thumbnail images to swap the main photo.
// ================================================================

// Run everything once the page has fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Read the artwork ID from the URL query string
  const id = new URLSearchParams(window.location.search).get('id');

  // If no ID was given show an error and stop
  if (!id) {
    document.getElementById('artwork-content').innerHTML =
      '<p style="padding:4rem;color:var(--rust)">No artwork ID in URL. Go back to the gallery.</p>';
    return;
  }

  // Load and display the artwork
  loadArtwork(id);
});


// ----------------------------------------------------------------
// Fetch the artwork from the server and render it
// ----------------------------------------------------------------
async function loadArtwork(id) {
  // Show a spinner while we wait for the data
  showSpinner('#artwork-content');

  try {
    // Fetch the full artwork record (includes images, location, condition, artist bio)
    const response = await fetch('http://localhost:3000/api/artworks/' + id);
    const result   = await response.json();
    const art      = result.data;

    renderArtwork(art);

  } catch (err) {
    document.getElementById('artwork-content').innerHTML =
      `<p style="padding:4rem;color:var(--rust)">${err.message}</p>`;
  }
}


// ----------------------------------------------------------------
// Build the full artwork detail page HTML
// ----------------------------------------------------------------
function renderArtwork(art) {
  // Find the primary image — fall back to the first image if none is marked primary
  let mainImg = null;
  if (art.images && art.images.length > 0) {
    art.images.forEach(function(img) {
      if (img.is_primary) mainImg = img;
    });
    if (!mainImg) mainImg = art.images[0];
  }

  // Build the main image or a large placeholder icon
  const mainImageHTML = mainImg
    ? `<img id="main-img" src="${mainImg.image_url}" alt="${art.title}"
           style="width:100%;max-height:580px;object-fit:contain;transition:opacity .3s">`
    : `<span style="font-size:6rem;opacity:.15">🖼️</span>`;

  // Build the row of thumbnail images (only shown if there is more than one image)
  let thumbsHTML = '';
  if (art.images && art.images.length > 1) {
    art.images.forEach(function(img) {
      thumbsHTML += `
        <img src="${img.image_url}" alt="thumbnail"
             onclick="switchImage('${img.image_url}')"
             style="width:70px;height:70px;object-fit:cover;cursor:pointer;border:2px solid transparent;transition:.2s;opacity:.7"
             onmouseover="this.style.opacity='1';this.style.borderColor='var(--gold)'"
             onmouseout="this.style.opacity='.7';this.style.borderColor='transparent'">`;
    });
  }
  const thumbnailRowHTML = thumbsHTML
    ? `<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">${thumbsHTML}</div>`
    : '';

  // Build the location box (shown only if location data exists)
  let locationHTML = '';
  if (art.location && art.location[0]) {
    const loc = art.location[0];
    const statusPill = loc.status
      ? `<span class="pill pill-green" style="margin-top:.4rem;display:inline-block">${loc.status}</span>`
      : '';
    locationHTML = `
      <div style="padding:1.2rem 1.5rem;background:var(--cream);border-left:3px solid var(--gold);margin-bottom:1.5rem">
        <div class="label" style="margin-bottom:.4rem">Location</div>
        <p style="font-size:1rem">${loc.current_location || '—'}</p>
        ${statusPill}
      </div>`;
  }

  // Build the condition box (shown only if condition notes exist)
  let conditionHTML = '';
  if (art.condition && art.condition[0] && art.condition[0].condition_text) {
    conditionHTML = `
      <div style="padding:1.2rem 1.5rem;background:#f2f0ea;border-left:3px solid var(--sage)">
        <div class="label" style="color:var(--sage);margin-bottom:.4rem">Condition</div>
        <p style="font-size:.95rem;color:var(--body-text)">${art.condition[0].condition_text}</p>
      </div>`;
  }

  // Build the artist bio section at the bottom (shown only if bio exists)
  let artistBioHTML = '';
  if (art.artist_bio) {
    artistBioHTML = `
      <div style="background:var(--ink);padding:5rem 2rem">
        <div class="container" style="max-width:740px">
          <div class="label" style="margin-bottom:1rem">About the Artist</div>
          <h2 style="font-family:var(--font-display);font-size:1.8rem;font-weight:400;color:var(--parchment);margin-bottom:1.5rem">${art.artist_name}</h2>
          <p style="color:rgba(247,242,234,.6);line-height:1.9">${art.artist_bio}</p>
        </div>
      </div>`;
  }

  // Put it all together and insert into the page
  document.getElementById('artwork-content').innerHTML = `
    <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:5rem;padding:5rem 2rem;align-items:start">

      <!-- Left column: main image + thumbnail strip -->
      <div>
        <div style="background:var(--cream);border:1px solid rgba(184,150,90,.15);min-height:360px;display:flex;align-items:center;justify-content:center;overflow:hidden">
          ${mainImageHTML}
        </div>
        ${thumbnailRowHTML}
      </div>

      <!-- Right column: title, artist, metadata, description -->
      <div style="animation:fadeUp .7s .2s both">
        <div class="label">${art.accession_number}</div>
        <h1 style="font-family:var(--font-display);font-size:2.4rem;font-weight:400;line-height:1.15;margin:.5rem 0 .3rem">${art.title}</h1>
        <p style="color:var(--gold);font-family:var(--font-ui);margin-bottom:2rem">${art.artist_name || 'Unknown Artist'}</p>
        <div class="divider"></div>

        <dl style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem 2rem;margin:2rem 0">
          ${row('Medium',      art.medium)}
          ${row('Date',        art.date_created)}
          ${row('Dimensions',  art.dimensions)}
          ${row('Artist From', art.artist_location)}
        </dl>

        ${art.description ? `<p style="color:var(--body-text);line-height:1.9;margin-bottom:1.8rem">${art.description}</p>` : ''}

        ${locationHTML}
        ${conditionHTML}

        <div style="margin-top:2.5rem">
          <a href="gallery.html" class="btn btn-outline">← Back to Gallery</a>
        </div>
      </div>
    </div>

    ${artistBioHTML}
  `;
}


// ----------------------------------------------------------------
// Swap the main image when the user clicks a thumbnail
// ----------------------------------------------------------------
function switchImage(url) {
  const img = document.getElementById('main-img');
  if (!img) return;

  // Fade out, swap the src, fade back in
  img.style.opacity = '0';
  setTimeout(function() {
    img.src = url;
    img.style.opacity = '1';
  }, 200);
}


// ----------------------------------------------------------------
// Helper: build a definition list row (label + value pair)
// ----------------------------------------------------------------
function row(label, val) {
  if (!val) return '';
  return `<div>
    <dt style="font-family:var(--font-ui);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.2rem">${label}</dt>
    <dd style="font-size:1rem">${val}</dd>
  </div>`;
}
