// searchRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/searchController');
router.get('/', ctrl.search);   // GET /api/search?q=...
module.exports = router;
