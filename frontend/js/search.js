// ================================================================
// search.js — NLP Search Page
// ================================================================
// Sends the user's query to the backend search endpoint.
// The backend tries Python NLP first, then falls back to
// a simple SQL keyword scorer.
// Shows results as cards with relevance scores.
// ================================================================

// Run everything once the page has loaded
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('search-input');
  const btn   = document.getElementById('search-btn');

  // Search when the button is clicked or Enter is pressed
  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doSearch();
  });

  // Clicking a suggested chip fills the box and searches automatically
  document.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      input.value = chip.textContent;
      doSearch();
    });
  });

  // If a query was already in the URL (e.g. arriving from another page)
  // pre-fill the box and run the search straight away
  const q = new URLSearchParams(window.location.search).get('q');
  if (q) {
    input.value = q;
    doSearch();
  }
});


// ----------------------------------------------------------------
// Run a search and show the results
// ----------------------------------------------------------------
async function doSearch() {
  const query = document.getElementById('search-input').value.trim();

  // Do nothing if the box is empty
  if (!query) {
    showToast('Please type something first', 'error');
    return;
  }

  // Update the URL so the search is bookmarkable and shareable
  history.pushState({}, '', '?q=' + encodeURIComponent(query));

  // Show the results section and a loading state
  document.getElementById('results-area').style.display = 'block';
  document.getElementById('status-text').textContent = 'Searching for "' + query + '"…';
  document.getElementById('engine-badge').style.display = 'none';
  showSkeletons('#results-grid', 4);

  try {
    // Ask the backend to search by keyword/NLP and return ranked artworks
    const response = await fetch('http://localhost:3000/api/search?q=' + encodeURIComponent(query));
    const result   = await response.json();

    // result has: { data: [...artworks], source: 'nlp'|'keyword', query: '...' }
    renderResults(result.data, result.source, result.query);

  } catch (err) {
    document.getElementById('status-text').textContent = 'Search failed.';
    showEmpty('#results-grid', 'Could not reach the server. Is it running?');
  }
}


// ----------------------------------------------------------------
// Draw the search results on screen
// ----------------------------------------------------------------
function renderResults(data, source, query) {
  const count = data.length;

  // Update the status line above the results grid
  if (count) {
    document.getElementById('status-text').textContent =
      count + ' result' + (count !== 1 ? 's' : '') + ' for "' + query + '"';
  } else {
    document.getElementById('status-text').textContent = 'No results for "' + query + '"';
  }

  // Show a badge indicating whether NLP or keyword matching was used
  const badge = document.getElementById('engine-badge');
  badge.style.display = 'inline-block';
  if (source === 'nlp') {
    badge.textContent = '🧠 NLP Search';
    badge.className   = 'pill pill-green';
  } else {
    badge.textContent = '🔍 Keyword Fallback';
    badge.className   = 'pill pill-gold';
  }

  // Show a message if no results were found
  if (!count) {
    showEmpty('#results-grid', 'Try different words, or browse the full gallery.');
    return;
  }

  // Build a card for each result
  const grid = document.getElementById('results-grid');
  grid.innerHTML = '';

  data.forEach(function(art, i) {
    // Show the image or a placeholder icon
    const imgHTML = art.primary_image
      ? `<img src="${art.primary_image}" alt="${art.title}" loading="lazy">`
      : `<span style="opacity:.2">🖼️</span>`;

    // Show the relevance score if the backend sent one
    const scoreHTML = art.relevance_score !== undefined
      ? `<div style="float:right"><span class="pill pill-gold">Score: ${art.relevance_score}</span></div>`
      : '';

    grid.innerHTML += `
      <div class="card" onclick="window.location='artwork.html?id=${art.artwork_id}'"
           style="animation-delay:${i * 0.06}s">
        <div class="card-image">${imgHTML}</div>
        <div class="card-body">
          ${scoreHTML}
          <div class="card-tag">${art.medium || 'Artwork'}</div>
          <div class="card-title">${art.title}</div>
          <div class="card-sub">${art.artist_name || ''} · ${art.date_created || ''}</div>
        </div>
      </div>`;
  });
}
