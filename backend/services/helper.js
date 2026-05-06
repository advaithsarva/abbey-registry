// ================================================================
// helper.js  —  Database Query Functions
// ================================================================
// All SQL queries live here. Controllers call these functions.
// This keeps controllers clean and readable.
// ================================================================

const db = require('../db');

// ----------------------------------------------------------------
// Get ALL artworks (admin view — includes unpublished)
// Joins artist + primary image + location in one query
// ----------------------------------------------------------------
async function getAllArtworks() {
  const [rows] = await db.query(`
    SELECT
      a.artwork_id, a.accession_number, a.title,
      a.date_created, a.medium, a.dimensions, a.description, a.is_published,
      ar.name       AS artist_name,
      img.image_url AS primary_image,
      loc.current_location, loc.status
    FROM artwork a
    LEFT JOIN artist   ar  ON a.artist_id  = ar.artist_id
    LEFT JOIN image    img ON a.artwork_id = img.artwork_id AND img.is_primary = TRUE
    LEFT JOIN location loc ON a.artwork_id = loc.artwork_id
    ORDER BY a.artwork_id DESC
  `);
  return rows;
}

// ----------------------------------------------------------------
// Get only PUBLISHED artworks (public gallery)
// ----------------------------------------------------------------
async function getPublishedArtworks() {
  const [rows] = await db.query(`
    SELECT
      a.artwork_id, a.accession_number, a.title,
      a.date_created, a.medium, a.description,
      ar.name       AS artist_name,
      img.image_url AS primary_image,
      loc.current_location, loc.status
    FROM artwork a
    LEFT JOIN artist   ar  ON a.artist_id  = ar.artist_id
    LEFT JOIN image    img ON a.artwork_id = img.artwork_id AND img.is_primary = TRUE
    LEFT JOIN location loc ON a.artwork_id = loc.artwork_id
    WHERE a.is_published = TRUE
    ORDER BY a.artwork_id DESC
  `);
  return rows;
}

// ----------------------------------------------------------------
// Get ONE artwork with all related info (for detail page)
// ----------------------------------------------------------------
async function getArtworkById(id) {
  // Main artwork row
  const [rows] = await db.query(`
    SELECT a.*, ar.name AS artist_name, ar.location AS artist_location, ar.bio AS artist_bio
    FROM artwork a
    LEFT JOIN artist ar ON a.artist_id = ar.artist_id
    WHERE a.artwork_id = ?
  `, [id]);

  if (rows.length === 0) return null;
  const art = rows[0];

  // Related tables
  const [images]    = await db.query('SELECT * FROM image            WHERE artwork_id = ?', [id]);
  const [location]  = await db.query('SELECT * FROM location         WHERE artwork_id = ?', [id]);
  const [provenance]= await db.query('SELECT * FROM provenance       WHERE artwork_id = ?', [id]);
  const [financial] = await db.query('SELECT * FROM financial        WHERE artwork_id = ?', [id]);
  const [condition] = await db.query('SELECT * FROM condition_report WHERE artwork_id = ?', [id]);

  return { ...art, images, location, provenance, financial, condition };
}

// ----------------------------------------------------------------
// Create a new artwork + all related rows
// ----------------------------------------------------------------
async function createArtwork(data) {
  const {
    accession_number, title, artist_id, date_created,
    dimensions, medium, description, is_published,
    current_location, status,
    value, cost, sale_details,
    acquisition_method, donor, date_acquired, date_appraised,
    condition_text
  } = data;

  // Insert main artwork row
  const [result] = await db.query(`
    INSERT INTO artwork
      (accession_number, title, artist_id, date_created, dimensions, medium, description, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [accession_number, title, artist_id||null, date_created, dimensions, medium, description, is_published||false]);

  const id = result.insertId;

  // Insert related rows (only if data provided)
  if (current_location || status)
    await db.query('INSERT INTO location (artwork_id, current_location, status) VALUES (?,?,?)', [id, current_location, status]);

  if (value || cost)
    await db.query('INSERT INTO financial (artwork_id, value, cost, sale_details) VALUES (?,?,?,?)', [id, value||0, cost||0, sale_details]);

  if (acquisition_method || donor)
    await db.query('INSERT INTO provenance (artwork_id, acquisition_method, donor, date_acquired, date_appraised) VALUES (?,?,?,?,?)',
      [id, acquisition_method, donor, date_acquired||null, date_appraised||null]);

  if (condition_text)
    await db.query('INSERT INTO condition_report (artwork_id, condition_text) VALUES (?,?)', [id, condition_text]);

  return id;
}

// ----------------------------------------------------------------
// Toggle publish on/off
// ----------------------------------------------------------------
async function togglePublish(id, isPublished) {
  await db.query('UPDATE artwork SET is_published = ? WHERE artwork_id = ?', [isPublished, id]);
}

// ----------------------------------------------------------------
// Delete artwork and all related rows
// ----------------------------------------------------------------
async function deleteArtwork(id) {
  const tables = ['image','location','provenance','financial','condition_report','documentation'];
  for (const t of tables) {
    await db.query(`DELETE FROM ${t} WHERE artwork_id = ?`, [id]);
  }
  await db.query('DELETE FROM artwork WHERE artwork_id = ?', [id]);
}

// ----------------------------------------------------------------
// Get all artists
// ----------------------------------------------------------------
async function getAllArtists() {
  const [rows] = await db.query('SELECT * FROM artist ORDER BY name');
  return rows;
}

// ----------------------------------------------------------------
// Get all artists with artwork count + sample image
// ----------------------------------------------------------------
async function getArtistsWithArtworks() {
  const [rows] = await db.query(`
    SELECT
      a.artist_id, a.name, a.location, a.bio,
      COUNT(DISTINCT aw.artwork_id) AS artwork_count,
      MIN(img.image_url)            AS sample_image
    FROM artist a
    LEFT JOIN artwork aw  ON aw.artist_id  = a.artist_id AND aw.is_published = 1
    LEFT JOIN image   img ON img.artwork_id = aw.artwork_id AND img.is_primary = 1
    GROUP BY a.artist_id
    ORDER BY a.name
  `);
  return rows;
}

// ----------------------------------------------------------------
// Get one artist + their published artworks
// ----------------------------------------------------------------
async function getArtistById(id) {
  const [rows] = await db.query('SELECT * FROM artist WHERE artist_id = ?', [id]);
  if (!rows.length) return null;
  const artist = rows[0];
  const [artworks] = await db.query(`
    SELECT a.artwork_id, a.title, a.medium, a.date_created,
           img.image_url AS primary_image
    FROM artwork a
    LEFT JOIN image img ON img.artwork_id = a.artwork_id AND img.is_primary = 1
    WHERE a.artist_id = ? AND a.is_published = 1
    ORDER BY a.artwork_id DESC
  `, [id]);
  return { ...artist, artworks };
}

// ----------------------------------------------------------------
// Create new artist
// ----------------------------------------------------------------
async function createArtist(name, location, bio) {
  const [result] = await db.query(
    'INSERT INTO artist (name, location, bio) VALUES (?,?,?)',
    [name, location, bio]
  );
  return result.insertId;
}

// ----------------------------------------------------------------
// Keyword search (fallback if Python NLP is offline)
// ----------------------------------------------------------------
async function keywordSearch(keyword) {
  const like = `%${keyword}%`;
  const [rows] = await db.query(`
    SELECT a.artwork_id, a.title, a.medium, a.date_created,
           ar.name AS artist_name, img.image_url AS primary_image
    FROM artwork a
    LEFT JOIN artist ar  ON a.artist_id  = ar.artist_id
    LEFT JOIN image  img ON a.artwork_id = img.artwork_id AND img.is_primary = TRUE
    WHERE a.is_published = TRUE
      AND (a.title LIKE ? OR a.medium LIKE ? OR a.description LIKE ? OR ar.name LIKE ?)
  `, [like, like, like, like]);
  return rows;
}

// ----------------------------------------------------------------
// Get all exhibitions ordered by sort_order
// ----------------------------------------------------------------
async function getAllExhibitions() {
  const [rows] = await db.query(
    'SELECT * FROM exhibition ORDER BY sort_order ASC'
  );
  return rows;
}

// ----------------------------------------------------------------
// Create a new exhibition (admin)
// ----------------------------------------------------------------
async function createExhibition(data) {
  const { title, subtitle, description, venue, date_start, date_end, season, status, icon, sort_order } = data;
  const [result] = await db.query(`
    INSERT INTO exhibition (title, subtitle, description, venue, date_start, date_end, season, status, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [title, subtitle||null, description||null, venue||null, date_start||null, date_end||null, season||null, status||'upcoming', icon||null, sort_order||0]);
  return result.insertId;
}

module.exports = {
  getAllArtworks, getPublishedArtworks, getArtworkById,
  createArtwork, togglePublish, deleteArtwork,
  getAllArtists, createArtist, keywordSearch,
  getArtistsWithArtworks, getArtistById,
  getAllExhibitions, createExhibition
};
