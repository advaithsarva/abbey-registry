// ================================================================
// authController.js — Admin Login
// ================================================================
// Checks the submitted username and password.
// If correct, returns a session token the browser stores locally.
// That token must be sent in the Authorization header for all
// write operations (add/edit/delete artworks and artists).
//
// Default credentials:
//   Username: admin
//   Password: stmartins2026
//
// To change them, set ADMIN_USER and ADMIN_PASS in your .env file.
// ================================================================

const ADMIN_USER  = process.env.ADMIN_USER  || 'admin';
const ADMIN_PASS  = process.env.ADMIN_PASS  || 'stmartins2026';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'abbey-admin-token-2026';

// POST /api/auth/login
// Body: { username, password }
// Returns: { success: true, token: "..." }
function login(req, res) {
  const { username, password } = req.body;

  // Check credentials
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // Credentials are correct — return the session token
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    // Wrong username or password
    res.status(401).json({ success: false, error: 'Invalid username or password.' });
  }
}

module.exports = { login };
