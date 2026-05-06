// ================================================================
// seed_more.js — Add more artworks to the registry
// ================================================================
// Run once:  node backend/seed_more.js
// Safe to run multiple times — checks accession numbers first
// so it will never insert a duplicate.
// ================================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../artwork_registry.db'));
db.exec('PRAGMA foreign_keys = ON');

// ---- Helpers ----
function artist(name, location, bio) {
  // Insert or skip if the name already exists
  const existing = db.prepare('SELECT artist_id FROM artist WHERE name = ?').get(name);
  if (existing) return existing.artist_id;
  const r = db.prepare('INSERT INTO artist (name, location, bio) VALUES (?,?,?)').run(name, location, bio);
  return r.lastInsertRowid;
}

function artwork(accession, title, artistId, date, dims, medium, desc, published) {
  // Skip if accession number already exists
  const existing = db.prepare('SELECT artwork_id FROM artwork WHERE accession_number = ?').get(accession);
  if (existing) {
    console.log('  skip (exists):', accession, title);
    return null;
  }
  const r = db.prepare(`
    INSERT INTO artwork (accession_number, title, artist_id, date_created, dimensions, medium, description, is_published)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(accession, title, artistId, date, dims, medium, desc, published ? 1 : 0);
  return r.lastInsertRowid;
}

function location(artworkId, place, status) {
  db.prepare('INSERT INTO location (artwork_id, current_location, status) VALUES (?,?,?)').run(artworkId, place, status);
}

function provenance(artworkId, method, donor, dateAcquired) {
  db.prepare('INSERT INTO provenance (artwork_id, acquisition_method, donor, date_acquired) VALUES (?,?,?,?)').run(artworkId, method, donor, dateAcquired);
}

function financial(artworkId, value, cost) {
  db.prepare('INSERT INTO financial (artwork_id, value, cost) VALUES (?,?,?)').run(artworkId, value, cost);
}

function condition(artworkId, text) {
  db.prepare('INSERT INTO condition_report (artwork_id, condition_text) VALUES (?,?)').run(artworkId, text);
}

// ================================================================
// BEGIN
// ================================================================
db.exec('BEGIN');
try {

  // ---- Artists ----
  const frThomas   = artist('Fr. Thomas Mackey, O.S.B.',  "Saint Martin's Abbey, WA", 'Benedictine monk and wood carver. His devotional pieces draw on Romanesque forms and the forest landscape surrounding the abbey.');
  const margaret   = artist('Margaret Ellison',            'Olympia, WA',              'Watercolourist and longtime friend of the abbey. Her luminous washes explore the Pacific Northwest coastline and monastic interiors.');
  const robert     = artist('Robert Ingram',               'Tacoma, WA',               'Oil painter specialising in Washington state landscapes. Ingram has donated several works to the abbey over three decades.');
  const yolanda    = artist('Dr. Yolanda Ferreira',        'Seattle, WA',              'Ceramicist and mixed-media artist. Her vessel series explores sacred geometry and the Benedictine tradition of craft as prayer.');
  const sooYeon    = artist('Soo-Yeon Park',               'Tacoma, WA',               'Fine art photographer focused on sacred architecture and light.'); // already exists — will be skipped
  const anne       = artist('Sister Anne Marguerite, O.S.B.', "Saint Martin's Abbey, WA", 'Benedictine artist working in mixed media and sacred iconography.'); // already exists

  // ---- Artworks ----

  // Fr. Thomas — wood carving
  let id = artwork('2019-001', 'Ora et Labora', frThomas, '2019', '38 x 12 x 8 cm', 'Carved cedarwood',
    'A hand-carved cedar panel bearing the Benedictine motto "Pray and Work". The lettering is inlaid with beeswax and pigment gathered from the abbey garden.', true);
  if (id) { location(id, 'Abbey Church – Narthex', 'On Display');   provenance(id, 'Gift', 'Fr. Thomas Mackey, O.S.B.', '2019-03-20'); financial(id, 2200, 0); condition(id, 'Excellent. Wax finish intact, no cracking.'); }

  id = artwork('2022-003', 'The Rule', frThomas, '2022', '25 x 18 x 5 cm', 'Carved walnut',
    'A relief carving of an open codex — an evocation of the Rule of St. Benedict read aloud each morning in the chapter room.', true);
  if (id) { location(id, 'Chapter Room', 'On Display'); provenance(id, 'Gift', 'Fr. Thomas Mackey, O.S.B.', '2022-09-01'); financial(id, 1800, 0); condition(id, 'Excellent.'); }

  // Margaret Ellison — watercolours
  id = artwork('2020-001', 'Morning Lauds', margaret, '2020', '56 x 38 cm', 'Watercolour on Arches paper',
    'Pale gold and grey washes suggest the abbey chapel before dawn, candlelight dissolving into morning. Painted during a retreat at the abbey in January 2020.', true);
  if (id) { location(id, 'Guest House – Common Room', 'On Display'); provenance(id, 'Gift', 'Margaret Ellison', '2020-06-15'); financial(id, 3400, 0); condition(id, 'Good. Slight wave in paper — recommend mounting.'); }

  id = artwork('2024-002', 'Rain on the Cloister', margaret, '2024', '40 x 30 cm', 'Watercolour on cotton rag',
    'A rainy afternoon rendered in soft blues and greys. The cloister arcade frames a small garden, its stones dark with November rain.', true);
  if (id) { location(id, 'Cloister Walk Gallery', 'On Display'); provenance(id, 'Gift', 'Margaret Ellison', '2024-01-20'); financial(id, 2900, 0); condition(id, 'Excellent.'); }

  // Robert Ingram — oil paintings
  id = artwork('2018-001', 'Mount Rainier from the East Pasture', robert, '2018', '90 x 120 cm', 'Oil on canvas',
    'A wide-format landscape painted en plein air from the abbey\'s east pasture. The mountain rises above a pale summer haze, the foreground bright with field grass and clover.', true);
  if (id) { location(id, 'Abbey Church Gallery – South Wall', 'On Display'); provenance(id, 'Gift', 'Robert Ingram', '2018-05-10'); financial(id, 6800, 0); condition(id, 'Good. Varnish yellowing slightly — conservation scheduled 2026.'); }

  id = artwork('2021-002', 'Puget Sound at Vespers', robert, '2021', '60 x 80 cm', 'Oil on linen',
    'The sound at low tide, painted in the warm amber light of late afternoon. Dedicated to the abbey in memory of the artist\'s father, a long-time concert attendee.', true);
  if (id) { location(id, 'Library Reading Room', 'On Display'); provenance(id, 'Bequest', 'Robert Ingram (in memory of James Ingram)', '2021-11-01'); financial(id, 5200, 0); condition(id, 'Excellent.'); }

  id = artwork('2016-001', 'Lacey in Autumn', robert, '2015', '45 x 60 cm', 'Oil on board',
    'An autumn scene of Lacey streets and maple trees, painted the year before a major commission brought Ingram to the abbey for the first time.', false);
  if (id) { location(id, 'Storage Room A', 'In Storage'); provenance(id, 'Purchase', null, '2016-03-14'); financial(id, 3100, 2800); condition(id, 'Good. Minor impasto crack upper-right corner.'); }

  // Dr. Yolanda Ferreira — ceramics
  id = artwork('2023-003', 'Vessel for Silence', yolanda, '2023', '28 cm height, 18 cm diameter', 'Stoneware, wood-fired',
    'A tall vessel with a matte iron oxide glaze, thrown and wood-fired in the Benedictine tradition of purposeful craft. The irregular surface recalls the texture of medieval stonework.', true);
  if (id) { location(id, 'Abbey Church Gallery – Plinth 1', 'On Display'); provenance(id, 'Commission', null, '2023-04-01'); financial(id, 2600, 2200); condition(id, 'Excellent. No chips or cracks.'); }

  id = artwork('2025-001', 'Seven Bowls', yolanda, '2025', 'Set of 7 · 12 cm diameter each', 'Porcelain, celadon glaze',
    'Seven small celadon bowls thrown to identical dimensions — an homage to the seven canonical hours of the Benedictine liturgy. Each is inscribed with a single Latin word from the Divine Office.', true);
  if (id) { location(id, 'Chapter Room – Cabinet', 'On Display'); provenance(id, 'Gift', 'Dr. Yolanda Ferreira', '2025-01-15'); financial(id, 4200, 0); condition(id, 'Excellent.'); }

  // Soo-Yeon Park — more photography
  id = artwork('2022-001', 'Choir Stalls, 4:40 AM', sooYeon, '2022', '60 x 80 cm', 'Archival inkjet print',
    'The choir stalls minutes before Vigils. Available light only — the single lamp above the lectern illuminates worn wood and an open psalter.', true);
  if (id) { location(id, 'Guest House – Corridor', 'On Display'); provenance(id, 'Gift', 'Soo-Yeon Park', '2022-06-20'); financial(id, 2000, 0); condition(id, 'Excellent. Print protected behind UV glass.'); }

  id = artwork('2024-003', 'Stations of Light', sooYeon, '2024', '30 x 90 cm (triptych)', 'Archival inkjet print',
    'A triptych following light across the Abbey Church floor at three times of day — morning, noon, and compline. Each panel is a long exposure, the pew shadows shifting like sundial hands.', true);
  if (id) { location(id, 'Abbey Church Gallery – East Corridor', 'On Display'); provenance(id, 'Commission', null, '2024-05-01'); financial(id, 3500, 3000); condition(id, 'Excellent.'); }

  // Sister Anne — additional works
  id = artwork('2022-002', 'Icon of Saint Benedict', anne, '2022', '30 x 40 cm', 'Egg tempera and gold leaf on gessoed panel',
    'A devotional icon of Saint Benedict in the Byzantine tradition, painted in the monastery scriptorium. The gold-leaf halo was applied during the Great Silence.', true);
  if (id) { location(id, 'Abbey Church – Sacristy Anteroom', 'On Display'); provenance(id, 'Gift', 'Sister Anne Marguerite, O.S.B.', '2022-12-27'); financial(id, 5500, 0); condition(id, 'Excellent.'); }

  // Brother Paul — additional work (use his looked-up artist_id, not a hardcoded number)
  const brotherPaul = db.prepare("SELECT artist_id FROM artist WHERE name = 'Brother Paul Chen'").get();
  id = artwork('2023-004', 'Advent Darkness', brotherPaul ? brotherPaul.artist_id : null, '2023', '50 x 65 cm', 'Encaustic on board',
    'Deep violet and indigo encaustic layers build the long darkness of Advent. A single gold vertical holds the centre — the candle that will not be extinguished.', true);
  if (id) { location(id, 'Abbey Church Gallery – West Alcove', 'On Display'); provenance(id, 'Gift', 'Br. Paul Chen', '2023-12-01'); financial(id, 3800, 0); condition(id, 'Excellent.'); }

  db.exec('COMMIT');
  console.log('✅  Seed complete — artworks added.');

} catch (err) {
  db.exec('ROLLBACK');
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
}

// Print final counts
const artCount    = db.prepare('SELECT COUNT(*) as c FROM artwork').get().c;
const artistCount = db.prepare('SELECT COUNT(*) as c FROM artist').get().c;
console.log(`   Artists: ${artistCount}   Artworks: ${artCount}`);
