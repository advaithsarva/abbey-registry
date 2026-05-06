// ================================================================
// artworkRoutes.js — Artwork URL Endpoints
// ================================================================
// Maps URLs to controller functions.
// Read-only routes (GET) are public.
// Write routes (POST, PATCH, DELETE) require admin login.
// ================================================================

const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const path         = require('path');
const db           = require('../db');
const ctrl         = require('../controllers/artworkController');
const requireAuth  = require('../middleware/auth');

// ---- Image upload setup ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});

// Only accept JPEG, PNG, and WebP images; reject anything else before it hits disk
function imageFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
  }
}

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 15 * 1024 * 1024 }   // 15 MB max per image
});

// ---- Public read routes (no login needed) ----
router.get('/',          ctrl.getAll);       // GET  /api/artworks
router.get('/published', ctrl.getPublished); // GET  /api/artworks/published
router.get('/:id',       ctrl.getOne);       // GET  /api/artworks/123

// ---- Protected write routes (admin token required) ----
router.post('/',             requireAuth, ctrl.create);  // POST   /api/artworks
router.patch('/:id/publish', requireAuth, ctrl.publish); // PATCH  /api/artworks/123/publish
router.delete('/:id',        requireAuth, ctrl.remove);  // DELETE /api/artworks/123

// POST /api/artworks/:id/image  →  upload an image (admin only)
router.post('/:id/image', requireAuth, function(req, res, next) {
  // Run multer — if it rejects the file (wrong type, too large) return a clean error
  upload.single('image')(req, res, function(err) {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file received.' });
    }

    const url       = '/uploads/' + req.file.filename;
    const isPrimary = req.body.is_primary === 'true';

    // If this is the primary image, clear the old primary flag first
    if (isPrimary) {
      await db.query('UPDATE image SET is_primary=FALSE WHERE artwork_id=?', [req.params.id]);
    }

    await db.query(
      'INSERT INTO image (artwork_id, image_url, is_primary) VALUES (?,?,?)',
      [req.params.id, url, isPrimary]
    );

    res.json({ success: true, image_url: url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
