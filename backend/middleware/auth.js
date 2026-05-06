// ================================================================
// auth.js — Admin Auth Middleware
// ================================================================
// Checks every protected request for a valid Bearer token.
// If the token is missing or wrong, returns 401 Unauthorized.
// Only write operations (POST, PATCH, DELETE) are protected.
// ================================================================

// The valid admin token — must match what /api/auth/login returns.
// Change ADMIN_TOKEN in your .env file to rotate credentials.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'abbey-admin-token-2026';

function requireAuth(req, res, next) {
  // Read the Authorization header: "Bearer <token>"
  const header = req.headers['authorization'] || '';
  const token  = header.replace('Bearer ', '').trim();

  // Reject the request if the token is missing or wrong
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      error:   'Unauthorized — please log in to the admin panel.'
    });
  }

  // Token is valid — allow the request to continue
  next();
}

module.exports = requireAuth;
