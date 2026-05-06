// ================================================================
// db.js  —  Database Connection (SQLite via built-in node:sqlite)
// ================================================================
// Uses Node.js 22's built-in sqlite module — no npm install needed.
// Creates the database file and seeds it automatically on first run.
// ================================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '../artwork_registry.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON');

// ---- Create all tables (safe: IF NOT EXISTS) ----
db.exec(`
  CREATE TABLE IF NOT EXISTS artist (
    artist_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    location   TEXT,
    bio        TEXT
  );

  CREATE TABLE IF NOT EXISTS artwork (
    artwork_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    accession_number TEXT UNIQUE NOT NULL,
    title            TEXT NOT NULL,
    artist_id        INTEGER,
    date_created     TEXT,
    dimensions       TEXT,
    medium           TEXT,
    description      TEXT,
    is_published     INTEGER DEFAULT 0,
    FOREIGN KEY (artist_id) REFERENCES artist(artist_id)
  );

  CREATE TABLE IF NOT EXISTS image (
    image_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id INTEGER,
    image_url  TEXT,
    is_primary INTEGER DEFAULT 0,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
  );

  CREATE TABLE IF NOT EXISTS location (
    location_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id       INTEGER,
    current_location TEXT,
    status           TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
  );

  CREATE TABLE IF NOT EXISTS provenance (
    provenance_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id         INTEGER,
    date_appraised     TEXT,
    acquisition_method TEXT,
    donor              TEXT,
    date_acquired      TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
  );

  CREATE TABLE IF NOT EXISTS financial (
    financial_id INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id   INTEGER,
    value        REAL,
    cost         REAL,
    sale_details TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
  );

  CREATE TABLE IF NOT EXISTS condition_report (
    condition_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id      INTEGER,
    condition_text  TEXT,
    condition_image TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
  );

  CREATE TABLE IF NOT EXISTS documentation (
    doc_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id INTEGER,
    file_url   TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
  );

  CREATE TABLE IF NOT EXISTS exhibition (
    exhibition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    subtitle      TEXT,
    description   TEXT,
    venue         TEXT,
    date_start    TEXT,
    date_end      TEXT,
    season        TEXT,
    status        TEXT NOT NULL DEFAULT 'upcoming',
    icon          TEXT,
    sort_order    INTEGER DEFAULT 0
  );
`);

// ---- Seed sample data on first run ----
const { c: artistCount } = db.prepare('SELECT COUNT(*) as c FROM artist').get();
if (artistCount === 0) {
  const insArtist  = db.prepare('INSERT INTO artist  (name, location, bio) VALUES (?, ?, ?)');
  const insArtwork = db.prepare(`
    INSERT INTO artwork (accession_number, title, artist_id, date_created, dimensions, medium, description, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insImage    = db.prepare('INSERT INTO image    (artwork_id, image_url, is_primary) VALUES (?, ?, ?)');
  const insLocation = db.prepare('INSERT INTO location (artwork_id, current_location, status) VALUES (?, ?, ?)');
  const insProv     = db.prepare('INSERT INTO provenance (artwork_id, acquisition_method, donor, date_acquired) VALUES (?, ?, ?, ?)');
  const insFin      = db.prepare('INSERT INTO financial  (artwork_id, value, cost) VALUES (?, ?, ?)');
  const insCond     = db.prepare('INSERT INTO condition_report (artwork_id, condition_text) VALUES (?, ?)');

  db.exec('BEGIN');
  try {
    const a1 = insArtist.run('Sister Anne Marguerite OSB', "Saint Martin's Abbey, WA", 'Benedictine artist working in mixed media and sacred iconography.');
    const a2 = insArtist.run('Brother Paul Chen',          "Saint Martin's Abbey, WA", 'Monk and painter specialising in oil and encaustic works.');
    const a3 = insArtist.run('Elena Vasquez',              'Seattle, WA',              'Contemporary painter exploring nature and contemplative themes.');
    const a4 = insArtist.run('Soo-Yeon Park',              'Tacoma, WA',               'Fine art photographer focused on sacred architecture and light.');

    const w1 = insArtwork.run('2023-001', 'Illuminated Vespers', a1.lastInsertRowid, '2023', '92 x 73 cm',  'Mixed media on linen',          'A luminous meditation on evening prayer, combining gold leaf and pigment.', 1);
    const w2 = insArtwork.run('2021-001', 'Lectio Divina',       a2.lastInsertRowid, '2021', '60 x 80 cm',  'Oil on board',                   'A quiet depiction of monastic reading practice and sacred silence.',       1);
    const w3 = insArtwork.run('2024-001', 'Forest Compline',     a3.lastInsertRowid, '2024', '120 x 90 cm', 'Acrylic on canvas',              'The forest at nightfall echoing the final prayer of the day.',             1);
    const w4 = insArtwork.run('2023-002', 'Bell Tower at Dusk',  a4.lastInsertRowid, '2023', '50 x 70 cm',  'Archival photographic print',   'Long-exposure photograph of the Abbey bell tower at golden hour.',         1);

    for (const w of [w1, w2, w3, w4])
      insImage.run(w.lastInsertRowid, '/uploads/placeholder.jpg', 1);

    insLocation.run(w1.lastInsertRowid, 'Abbey Church Gallery – North Wall', 'On Display');
    insLocation.run(w2.lastInsertRowid, 'Cloister Walk Gallery',             'On Display');
    insLocation.run(w3.lastInsertRowid, 'Chapter Room',                      'On Display');
    insLocation.run(w4.lastInsertRowid, 'Storage Room B',                    'In Storage');

    insProv.run(w1.lastInsertRowid, 'Gift',      'Sister Anne Marguerite OSB', '2023-07-01');
    insProv.run(w2.lastInsertRowid, 'Purchase',   null,                        '2021-04-01');
    insProv.run(w3.lastInsertRowid, 'Commission', null,                        '2024-02-15');
    insProv.run(w4.lastInsertRowid, 'Gift',       'Soo-Yeon Park',             '2023-09-10');

    insFin.run(w1.lastInsertRowid, 4500.00,  0.00);
    insFin.run(w2.lastInsertRowid, 3200.00,  2800.00);
    insFin.run(w3.lastInsertRowid, 5000.00,  4500.00);
    insFin.run(w4.lastInsertRowid, 1800.00,  0.00);

    insCond.run(w1.lastInsertRowid, 'Excellent. No visible damage. Varnish intact.');
    insCond.run(w2.lastInsertRowid, 'Good. Minor surface dust. Recommend light cleaning.');
    insCond.run(w3.lastInsertRowid, 'Excellent. Recently completed work.');
    insCond.run(w4.lastInsertRowid, 'Good. Print stored flat, no creasing.');

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  console.log('✅ Database seeded with sample data');
}

// ---- Seed exhibitions on first run ----
const { c: exCount } = db.prepare('SELECT COUNT(*) as c FROM exhibition').get();
if (exCount === 0) {
  const insEx = db.prepare(`
    INSERT INTO exhibition (title, subtitle, description, venue, date_start, date_end, season, status, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN');
  try {
    insEx.run(
      'Strings of Eternity',
      'Current Exhibition · 2025–26 Season',
      'A meditation on the cello and its capacity to voice the inexpressible. International chamber musicians and cellists perform in the Abbey, accompanied by visual works inspired by sacred music — bridging instrument, image, and prayer.',
      'Abbey', '2026-01-15', '2026-05-31', '2025–26 Season', 'current', '🎻', 1
    );
    insEx.run(
      'The Illuminated Garden',
      'Opening June 2026',
      'Botanical paintings, illuminated manuscripts, and contemplative photography explore the monastery garden as a space of prayer, labour, and revelation — rooted in the Benedictine tradition of stewardship.',
      'Abbey', '2026-06-12', '2026-09-20', '2025–26 Season', 'upcoming', '🌿', 2
    );
    insEx.run(
      'Word Made Visible',
      '2024–25 Season',
      'Calligraphy, letterpress, and typographic art exploring how sacred texts become visual objects — featuring scholars from the Pacific Northwest alongside the monks\' own illuminated works.',
      'Abbey', '2025-09-10', '2025-12-20', '2024–25 Season', 'past', '📜', 3
    );
    insEx.run(
      'Resonance: 45 Years of Abbey Events',
      '2024–25 Season',
      'A retrospective celebrating four and a half decades of free public concerts and scholarly lectures — archival programmes, recordings, and photographs from the series founded in 1980 under Abbot Neal G. Roth.',
      'Abbey', '2024-10-01', '2025-03-31', '2024–25 Season', 'past', '🎶', 4
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  console.log('✅ Exhibitions seeded');
}

console.log('✅ SQLite connected →', dbPath);

// ---- mysql2-compatible wrapper ----
// helper.js calls db.query(sql, params) and expects [rows] or [{insertId}].
// This wrapper makes node:sqlite look exactly like mysql2's pool.
const pool = {
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt    = db.prepare(sql);
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
          resolve([stmt.all(...params)]);
        } else {
          const info = stmt.run(...params);
          resolve([{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }]);
        }
      } catch (err) {
        reject(err);
      }
    });
  }
};

module.exports = pool;
