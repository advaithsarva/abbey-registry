const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/exhibitionController');
const requireAuth = require('../middleware/auth');

router.get('/',  ctrl.getAll);               // GET  /api/exhibitions
router.post('/', requireAuth, ctrl.create);  // POST /api/exhibitions (admin)

module.exports = router;
