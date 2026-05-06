document.addEventListener('DOMContentLoaded', loadExhibitions);

async function loadExhibitions() {
  const list = document.getElementById('ex-list');
  list.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  try {
    const res    = await fetch('/api/exhibitions');
    const result = await res.json();
    render(result.data, list);
  } catch {
    list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:3rem">Could not load exhibitions. Is the server running?</p>';
  }
}

function render(exhibitions, list) {
  if (!exhibitions.length) {
    list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:3rem">No exhibitions found.</p>';
    return;
  }

  list.innerHTML = exhibitions.map(ex => {
    const pillClass = ex.status === 'current'  ? 'pill-green'
                    : ex.status === 'upcoming' ? 'pill-gold'
                    : 'pill-muted';
    const pillLabel = ex.status === 'current'  ? 'Now Showing'
                    : ex.status === 'upcoming' ? 'Upcoming'
                    : 'Past';

    const dateRange = [ex.date_start, ex.date_end]
      .filter(Boolean)
      .map(d => formatDate(d))
      .join(' – ');
    const dateLine = [dateRange, ex.venue].filter(Boolean).join(' · ');

    const isPast = ex.status === 'past';

    const actionHTML = ex.status === 'current'
      ? `<a href="gallery.html" class="btn btn-primary">Browse Related Works</a>`
      : ex.status === 'upcoming'
      ? `<button class="btn btn-outline" onclick="showToast('Contact events@stmartinsabbey.org to be notified.')">Get Notified</button>`
      : `<a href="gallery.html" class="btn btn-outline">View Archive</a>`;

    return `
      <div class="ex-item${isPast ? ' past' : ''}">
        <div class="ex-vis">
          ${ex.icon || '🖼️'}
          <div class="badge"><span class="pill ${pillClass}">${pillLabel}</span></div>
        </div>
        <div class="ex-inf">
          ${ex.subtitle ? `<p class="label">${ex.subtitle}</p>` : ''}
          <h2>${ex.title}</h2>
          ${dateLine ? `<p class="ex-dates">${dateLine}</p>` : ''}
          ${ex.description ? `<p>${ex.description}</p>` : ''}
          ${actionHTML}
        </div>
      </div>`;
  }).join('');
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
