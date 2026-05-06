// ================================================================
// artistRoutes.js — Artist URL Endpoints
// ================================================================
// Read-only routes are public.
// Creating artists requires admin login.
// ================================================================

const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/artistController');
const requireAuth = require('../middleware/auth');

// ---- Public read routes ----
router.get('/',              ctrl.getAll);           // GET /api/artists
router.get('/with-artworks', ctrl.getAllWithArtworks); // GET /api/artists/with-artworks (must be before /:id)
router.get('/:id',           ctrl.getOne);           // GET /api/artists/123

// ---- Protected write routes (admin token required) ----
router.post('/', requireAuth, ctrl.create);          // POST /api/artists

module.exports = router;
