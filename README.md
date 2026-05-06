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

### How it works
1. User types a query e.g. `"evening prayer painting"`
2. Tokenize and lowercase — remove stop words
3. Score each artwork:
   - Title match → **+3 points**
   - Artist match → **+2 points**
   - Medium match → **+2 points**
   - Description match → **+1 point**
4. Sort by total score, return top 20

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
