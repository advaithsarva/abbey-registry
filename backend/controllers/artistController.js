// ================================================================
// artistController.js  —  Artist Business Logic
// ================================================================

const helper = require('../services/helper');

// GET /api/artists
const getAll = async (req, res) => {
  try {
    const data = await helper.getAllArtists();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/artists/with-artworks
const getAllWithArtworks = async (req, res) => {
  try {
    const data = await helper.getArtistsWithArtworks();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/artists/:id
const getOne = async (req, res) => {
  try {
    const data = await helper.getArtistById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Artist not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/artists
const create = async (req, res) => {
  try {
    const { name, location, bio } = req.body;
    const id = await helper.createArtist(name, location, bio);
    res.status(201).json({ success: true, artist_id: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, getAllWithArtworks, getOne, create };
