// ================================================================
// admin.js — Admin Dashboard
// ================================================================
// Handles:
//   - Checking that the user is logged in (redirects to login.html if not)
//   - Loading and displaying all artworks in a table
//   - Updating stats at the top (total, published, on display, etc.)
//   - Publishing / un-publishing artworks with a checkbox
//   - Deleting artworks
//   - Adding a new artwork (with optional image upload)
//   - Adding a new artist
//   - Tab navigation between List, Add Artwork, and Add Artist
//   - Logout button
// ================================================================

// Cache the artwork list so updateStats can see it
let artworks = [];

// Read the admin token from localStorage — set by login.html
const TOKEN = localStorage.getItem('abbey_admin_token');

// Run everything once the page has loaded
document.addEventListener('DOMContentLoaded', function() {
  // If there is no token, this user is not logged in — send them to login
  if (!TOKEN) {
    window.location.href = 'login.html';
    return;
  }

  loadAll();
  setupAddForm();
  setupArtistForm();
  setupTabs();
  setupLogout();
});


// ----------------------------------------------------------------
// Helper: build the Authorization header for every write request
// ----------------------------------------------------------------
function authHeader() {
  // All POST / PATCH / DELETE requests must include this header
  return { 'Authorization': 'Bearer ' + TOKEN };
}


// ----------------------------------------------------------------
// Logout — clear the stored token and go to login page
// ----------------------------------------------------------------
function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;

  btn.addEventListener('click', function() {
    localStorage.removeItem('abbey_admin_token');
    window.location.href = 'login.html';
  });
}


// ----------------------------------------------------------------
// Load all artworks from the backend and refresh the table
// ----------------------------------------------------------------
async function loadAll() {
  try {
    // Fetch every artwork (published and draft) for the admin view
    const response = await fetch('http://localhost:3000/api/artworks');
    const result   = await response.json();
    artworks       = result.data;

    updateStats(artworks);
    renderTable(artworks);

  } catch (err) {
    showToast('Could not load artworks. Is the server running?', 'error');
  }
}


// ----------------------------------------------------------------
// Update the four stat numbers at the top of the dashboard
// ----------------------------------------------------------------
function updateStats(list) {
  let total     = list.length;
  let pub       = 0;
  let onDisplay = 0;
  let inStorage = 0;

  list.forEach(function(a) {
    if (a.is_published)            pub++;
    if (a.status === 'On Display') onDisplay++;
    if (a.status === 'In Storage') inStorage++;
  });

  document.getElementById('s-total').textContent   = total;
  document.getElementById('s-pub').textContent      = pub;
  document.getElementById('s-display').textContent  = onDisplay;
  document.getElementById('s-storage').textContent  = inStorage;
}


// ----------------------------------------------------------------
// Draw the artworks table — one row per artwork
// ----------------------------------------------------------------
function renderTable(list) {
  const tbody = document.getElementById('art-tbody');

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:3rem;color:var(--muted)">
          No artworks yet.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = '';

  list.forEach(function(art) {
    const statusPill = art.status
      ? `<span class="pill ${pillClass(art.status)}">${art.status}</span>`
      : '<span class="pill pill-muted">—</span>';

    const publishedLabel = art.is_published ? 'Live' : 'Draft';
    const checkedAttr    = art.is_published ? 'checked' : '';

    tbody.innerHTML += `
      <tr>
        <td style="font-family:var(--font-ui);font-size:.75rem;color:var(--muted)">
          ${art.accession_number}
        </td>
        <td>
          <div style="font-style:italic;font-size:1rem">${art.title}</div>
          <div style="font-family:var(--font-ui);font-size:.7rem;color:var(--gold)">${art.artist_name || '—'}</div>
        </td>
        <td style="font-family:var(--font-ui);font-size:.78rem">${art.medium || '—'}</td>
        <td>${statusPill}</td>
        <td>
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer">
            <input type="checkbox" ${checkedAttr}
                   onchange="togglePublish(${art.artwork_id}, this.checked)"
                   style="accent-color:var(--gold);width:16px;height:16px">
            <span style="font-family:var(--font-ui);font-size:.7rem;color:var(--muted)">
              ${publishedLabel}
            </span>
          </label>
        </td>
        <td>
          <div style="display:flex;gap:.4rem">
            <a href="artwork.html?id=${art.artwork_id}" class="btn btn-outline btn-sm" target="_blank">View</a>
            <button class="btn btn-danger btn-sm"
                    onclick="deleteArtwork(${art.artwork_id}, '${art.title.replace(/'/g, "\\'")}')">
              Delete
            </button>
          </div>
        </td>
      </tr>`;
  });
}


// ----------------------------------------------------------------
// Toggle an artwork between published (live) and draft
// ----------------------------------------------------------------
async function togglePublish(id, isPublished) {
  try {
    const response = await fetch('http://localhost:3000/api/artworks/' + id + '/publish', {
      method:  'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
      body:    JSON.stringify({ is_published: isPublished })
    });

    // If the token expired or was rejected, send to login
    if (response.status === 401) {
      localStorage.removeItem('abbey_admin_token');
      window.location.href = 'login.html';
      return;
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showToast(isPublished ? 'Published ✓' : 'Set to draft');
    loadAll();

  } catch (err) {
    showToast('Failed to update.', 'error');
  }
}


// ----------------------------------------------------------------
// Delete an artwork after confirmation
// ----------------------------------------------------------------
async function deleteArtwork(id, title) {
  if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;

  try {
    const response = await fetch('http://localhost:3000/api/artworks/' + id, {
      method:  'DELETE',
      headers: authHeader()
    });

    if (response.status === 401) {
      localStorage.removeItem('abbey_admin_token');
      window.location.href = 'login.html';
      return;
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showToast('Deleted.');
    loadAll();

  } catch (err) {
    showToast('Delete failed.', 'error');
  }
}


// ----------------------------------------------------------------
// Add artwork form — reads all the fields and sends to the server
// ----------------------------------------------------------------
function setupAddForm() {
  const form = document.getElementById('add-form');
  if (!form) return;

  loadArtistDropdown();

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = form.querySelector('[type=submit]');
    btn.textContent = 'Saving…';
    btn.disabled    = true;

    try {
      const data = {
        accession_number:   form.accession_number.value.trim(),
        title:              form.title.value.trim(),
        artist_id:          form.artist_id.value || null,
        date_created:       form.date_created.value,
        medium:             form.medium.value.trim(),
        dimensions:         form.dimensions.value.trim(),
        description:        form.description.value.trim(),
        is_published:       form.is_published.checked,
        current_location:   form.current_location.value.trim(),
        status:             form.status.value,
        value:              form.value.value  || null,
        cost:               form.cost.value   || null,
        acquisition_method: form.acquisition_method.value,
        donor:              form.donor.value.trim(),
        date_acquired:      form.date_acquired.value || null,
        condition_text:     form.condition_text.value.trim()
      };

      // Create the artwork record — requires admin token
      const createResponse = await fetch('http://localhost:3000/api/artworks', {
        method:  'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
        body:    JSON.stringify(data)
      });

      if (createResponse.status === 401) {
        localStorage.removeItem('abbey_admin_token');
        window.location.href = 'login.html';
        return;
      }

      const createResult = await createResponse.json();
      if (!createResult.success) throw new Error(createResult.error);

      const newId = createResult.artwork_id;

      // Upload the image if one was chosen
      const imageFile = form.image_file.files[0];
      if (imageFile) {
        const formData = new FormData();
        formData.append('image',      imageFile);
        formData.append('is_primary', true);

        const imgResponse = await fetch('http://localhost:3000/api/artworks/' + newId + '/image', {
          method:  'POST',
          headers: authHeader(),   // no Content-Type — multipart is set automatically
          body:    formData
        });
        const imgResult = await imgResponse.json();
        if (!imgResult.success) throw new Error(imgResult.error);
      }

      showToast('Artwork added! ✓');
      form.reset();
      showTab('tab-list');
      loadAll();

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.textContent = 'Add Artwork';
      btn.disabled    = false;
    }
  });
}


// ----------------------------------------------------------------
// Fill the "Select Artist" dropdown with all artists
// ----------------------------------------------------------------
async function loadArtistDropdown() {
  const sel = document.getElementById('artist-select');
  if (!sel) return;

  try {
    const response = await fetch('http://localhost:3000/api/artists');
    const result   = await response.json();
    const artists  = result.data;

    sel.innerHTML = '<option value="">— Select Artist —</option>';
    artists.forEach(function(a) {
      sel.innerHTML += `<option value="${a.artist_id}">${a.name}</option>`;
    });

  } catch (err) {
    // Not critical if artist list fails to load
  }
}


// ----------------------------------------------------------------
// Add artist form — name, location, and bio
// ----------------------------------------------------------------
function setupArtistForm() {
  const form = document.getElementById('artist-form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/api/artists', {
        method:  'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
        body:    JSON.stringify({
          name:     form.artist_name.value.trim(),
          location: form.artist_location.value.trim(),
          bio:      form.artist_bio.value.trim()
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('abbey_admin_token');
        window.location.href = 'login.html';
        return;
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      showToast('Artist added! ✓');
      form.reset();
      loadArtistDropdown();

    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}


// ----------------------------------------------------------------
// Tab navigation — List | Add Artwork | Add Artist
// ----------------------------------------------------------------
function setupTabs() {
  document.querySelectorAll('[data-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      showTab(btn.dataset.tab);
    });
  });
}

function showTab(id) {
  document.querySelectorAll('.tab-panel').forEach(function(p) {
    p.style.display = 'none';
  });

  const panel = document.getElementById(id);
  if (panel) panel.style.display = 'block';

  document.querySelectorAll('[data-tab]').forEach(function(b) {
    if (b.dataset.tab === id) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  if (id === 'tab-list') loadAll();
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
