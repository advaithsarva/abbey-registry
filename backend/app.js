// ================================================================
// app.js  —  Main Server
// ================================================================
// This is the entry point. Run with:  node backend/app.js
// It starts Express, loads routes, and serves the frontend.
// ================================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ---- Middleware (runs on every request) ----
app.use(cors());                                // allow browser requests
app.use(express.json());                        // parse JSON body
app.use(express.urlencoded({ extended: true })); // parse form data

// ---- Serve uploaded images as static files ----
// e.g.  /uploads/my-image.jpg  → serves the file from /uploads/
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ---- Serve the entire frontend folder ----
// e.g.  /gallery.html  → serves frontend/gallery.html
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- Load routes ----
const artworkRoutes    = require('./routes/artworkRoutes');
const searchRoutes     = require('./routes/searchRoutes');
const artistRoutes     = require('./routes/artistRoutes');
const authRoutes       = require('./routes/authRoutes');
const exhibitionRoutes = require('./routes/exhibitionRoutes');

app.use('/api/artworks',    artworkRoutes);
app.use('/api/search',      searchRoutes);
app.use('/api/artists',     artistRoutes);
app.use('/api/auth',        authRoutes);
app.use('/api/exhibitions', exhibitionRoutes);

// ---- Start ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  Server → http://localhost:${PORT}`);
});
