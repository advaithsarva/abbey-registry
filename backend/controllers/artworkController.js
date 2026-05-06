// ================================================================
// artworkController.js  —  Artwork Business Logic
// ================================================================
// Controllers handle the "what to do" when a route is hit.
// They call helper functions, then send back a response.
// ================================================================

const helper = require('../services/helper');

// GET /api/artworks  →  all artworks (admin)
const getAll = async (req, res) => {
  try {
    const data = await helper.getAllArtworks();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/artworks/published  →  public gallery only
const getPublished = async (req, res) => {
  try {
    const data = await helper.getPublishedArtworks();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/artworks/:id  →  one artwork with all details
const getOne = async (req, res) => {
  try {
    const data = await helper.getArtworkById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/artworks  →  create artwork
const create = async (req, res) => {
  try {
    const id = await helper.createArtwork(req.body);
    res.status(201).json({ success: true, artwork_id: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/artworks/:id/publish  →  toggle publish
const publish = async (req, res) => {
  try {
    await helper.togglePublish(req.params.id, req.body.is_published);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/artworks/:id  →  delete artwork
const remove = async (req, res) => {
  try {
    await helper.deleteArtwork(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, getPublished, getOne, create, publish, remove };
