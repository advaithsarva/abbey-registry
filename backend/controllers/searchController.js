// ================================================================
// searchController.js — BM25 Search Engine
// ================================================================
// BM25 is the industry-standard ranking algorithm (used by
// Elasticsearch, Lucene, Solr). It improves on plain keyword
// matching by weighing term frequency and document length.
//
// How it works:
//   1. Split query into terms, strip stop words.
//   2. For each artwork, compute a score across 4 weighted fields:
//      title (×3), artist (×2), medium (×1.5), description (×1).
//   3. Return artworks sorted by score, highest first.
// ================================================================

const helper = require('../services/helper');

// ---- BM25 tuning parameters ----
const K1 = 1.5;   // term-frequency saturation  (typical: 1.2–2.0)
const B  = 0.75;  // document-length penalty     (typical: 0.5–0.9)

// Common words that add no search value
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','of','for',
  'with','by','from','is','was','are','were','be','been','has','have','had',
  'it','its','this','that','these','those','not','no','so','do','did',
  'as','if','up','out','about','into','than','then','when','where','which',
  'he','she','they','we','his','her','their','our','its','my','your',
  'all','each','more','also','just','over','after','before','during',
  'one','two','three','can','could','would','should','will','may',
  'very','rather','quite','there','here','only','both','between'
]);

// How much each field contributes to the final score
const WEIGHTS = {
  title:       3.0,
  artist_name: 2.0,
  medium:      1.5,
  description: 1.0
};

// Simple synonym map — expands a search term into related words
// so "photography" also matches "photographic" and "photograph"
const SYNONYMS = {
  'photography': ['photography','photographic','photograph','photo'],
  'photo':       ['photo','photograph','photographic','photography'],
  'painting':    ['painting','painted','paint'],
  'carving':     ['carving','carved','carve'],
  'watercolor':  ['watercolour','watercolor'],
  'watercolour': ['watercolour','watercolor'],
  'prayer':      ['prayer','pray','praying'],
  'monk':        ['monk','monastic','monastery','monks'],
  'benedict':    ['benedict','benedictine'],
  'benedictine': ['benedictine','benedict'],
  'wood':        ['wood','wooden','woodwork','carved','carving'],
  'ceramic':     ['ceramic','ceramics','pottery','stoneware','porcelain'],
  'print':       ['print','printed','printing','inkjet','photographic'],
};

// Split text into lowercase tokens, remove stop words, expand synonyms
function tokenize(text, expandSynonyms) {
  const base = (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  if (!expandSynonyms) return base;

  // For query tokenization: expand each term into its synonyms
  const expanded = [];
  base.forEach(t => {
    if (SYNONYMS[t]) {
      SYNONYMS[t].forEach(s => { if (!expanded.includes(s)) expanded.push(s); });
    } else {
      if (!expanded.includes(t)) expanded.push(t);
    }
  });
  return expanded;
}

// IDF = Inverse Document Frequency
// Terms that appear in fewer documents get a higher IDF (they are more distinctive).
function buildIDF(allDocs) {
  const N  = allDocs.length;
  const df = {};
  allDocs.forEach(terms => {
    new Set(terms).forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  const idf = {};
  Object.entries(df).forEach(([term, freq]) => {
    idf[term] = Math.log((N - freq + 0.5) / (freq + 0.5) + 1);
  });
  return idf;
}

// BM25 score for one field in one document
function scoreField(queryTerms, fieldTerms, idf, avgDL) {
  if (!fieldTerms.length) return 0;

  // Count how often each term appears in this field
  const tf = {};
  fieldTerms.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const DL = fieldTerms.length;

  return queryTerms.reduce((total, term) => {
    const termIDF = idf[term] || 0;
    if (!termIDF) return total;
    const f  = tf[term] || 0;
    // BM25 formula
    const bm = termIDF * (f * (K1 + 1)) / (f + K1 * (1 - B + B * DL / avgDL));
    return total + bm;
  }, 0);
}

// Run BM25 against all published artworks, return ranked results
async function bm25Search(query) {
  const artworks = await helper.getPublishedArtworks();
  if (!artworks.length) return [];

  const queryTerms = tokenize(query, true);  // true = expand synonyms
  if (!queryTerms.length) return artworks;

  const fields = Object.keys(WEIGHTS);

  // Tokenize every field in every artwork once
  const docs = artworks.map(art => ({
    art,
    fields: Object.fromEntries(fields.map(f => [f, tokenize(art[f])]))
  }));

  // Build one IDF table per field
  const idf = Object.fromEntries(
    fields.map(f => [f, buildIDF(docs.map(d => d.fields[f]))])
  );

  // Average field length across the corpus
  const avgDL = Object.fromEntries(
    fields.map(f => {
      const total = docs.reduce((s, d) => s + d.fields[f].length, 0);
      return [f, total / docs.length || 1];
    })
  );

  // Score every artwork
  const scored = docs.map(({ art, fields: ft }) => {
    const score = fields.reduce((sum, f) =>
      sum + WEIGHTS[f] * scoreField(queryTerms, ft[f], idf[f], avgDL[f]), 0);
    return { ...art, relevance_score: Math.round(score * 10) / 10 };
  });

  return scored
    .filter(r => r.relevance_score > 0)
    .sort((a, b) => b.relevance_score - a.relevance_score);
}

// ---- Express route handler ----
const search = async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.status(400).json({ success: false, error: 'Query required' });

  try {
    // Prefer the Python NLP service — it adds fuzzy matching + synonym expansion
    try {
      const nlpUrl = process.env.NLP_URL || 'http://localhost:5000';
      const resp   = await fetch(`${nlpUrl}/search?q=${encodeURIComponent(query)}`);
      if (resp.ok) {
        const payload = await resp.json();
        if (payload.success) {
          return res.json({ success: true, query, source: 'nlp', data: payload.results });
        }
      }
    } catch { /* Python offline — fall through to JS BM25 */ }

    // Fallback: pure JS BM25 (no fuzzy, no synonyms, but always available)
    const data = await bm25Search(query);
    res.json({ success: true, query, source: 'bm25', data });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { search };
