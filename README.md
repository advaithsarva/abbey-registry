# Saint Martin's Abbey — Artwork Registry

![Architecture Diagram](architecture.png)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env` and set your values:
```
PORT=3000
NLP_URL=http://localhost:5000
```

### 3. Start the backend
```bash
node backend/app.js
```
The SQLite database is created and seeded automatically on first run. Open `http://localhost:3000`.

### 4. Python NLP service (optional)
```bash
cd nlp-service
pip install -r requirements.txt
python app.py
```
If the Python service is offline, search falls back to SQL keyword matching automatically.

## NLP Search Engine

The search system is a custom two-stage retrieval pipeline built in Python (Flask), combining probabilistic ranking with fuzzy string matching for robust, typo-tolerant artwork discovery.

### Pipeline

**Stage 1 — Query Processing**
- Input is tokenized, lowercased, and filtered of stop words
- An art-domain synonym dictionary expands the query (e.g. `"painting"` → also matches `"oil"`, `"acrylic"`, `"canvas"`)

**Stage 2 — Scoring**
Each artwork is scored using two complementary methods:

- **BM25Okapi** (via `rank_bm25`) — a probabilistic relevance model that accounts for term frequency and document length, applied across a weighted multi-field corpus (title repeated 3×, artist 2.5×, medium 2×, description 1×)
- **Weighted fuzzy matching** (via `RapidFuzz`) — scores each query token against individual field tokens using edit-distance similarity, catching misspellings and partial matches above an 80% similarity threshold

**Final score** combines both signals:
```
final = 0.6 × BM25_normalised + 0.4 × fuzzy_normalised
```

Results below a minimum relevance threshold are discarded. Top 20 ranked results are returned.

### Fallback
If the Python service is unavailable, the Node.js backend falls back to SQL `LIKE` keyword search automatically — ensuring search always works.

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/artworks` | All artworks (admin) |
| GET | `/api/artworks/published` | Published artworks only |
| GET | `/api/artworks/:id` | Single artwork with full detail |
| POST | `/api/artworks` | Create artwork |
| PATCH | `/api/artworks/:id/publish` | Toggle publish status |
| DELETE | `/api/artworks/:id` | Delete artwork |
| POST | `/api/artworks/:id/image` | Upload artwork image |
| GET | `/api/artists` | All artists |
| GET | `/api/artists/with-artworks` | Artists with artwork count |
| GET | `/api/artists/:id` | Single artist with their works |
| POST | `/api/artists` | Create artist |
| GET | `/api/exhibitions` | All exhibitions |
| POST | `/api/exhibitions` | Create exhibition (admin) |
| GET | `/api/search?q=...` | NLP / keyword search |
