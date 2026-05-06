import re
import os
import sqlite3
import math
from collections import defaultdict

from rapidfuzz import fuzz
from rank_bm25 import BM25Okapi


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

FIELD_WEIGHTS = {
    "title":       3.0,
    "artist_name": 2.5,
    "medium":      2.0,
    "description": 1.0,
}

FUZZY_THRESHOLD     = 80   # minimum RapidFuzz ratio (0–100) to count as a match
FUZZY_WEIGHT        = 0.5  # multiplier applied to fuzzy (non-exact) hits
TOP_K               = 20   # max results returned
MIN_SCORE           = 0.1  # discard results below this

STOP_WORDS = {
    "a", "an", "the", "by", "in", "of", "and", "or", "is", "was",
    "are", "with", "for", "to", "on", "at", "this", "that", "it",
    "its", "be", "as", "from", "but", "not", "no",
}

# Art-domain synonyms — query terms are expanded with these
SYNONYMS = {
    "painting":    ["oil", "acrylic", "canvas", "watercolor", "gouache"],
    "sculpture":   ["bronze", "marble", "clay", "cast", "carved", "3d"],
    "photo":       ["photograph", "photography", "photographic", "lens"],
    "print":       ["lithograph", "etching", "silkscreen", "woodcut"],
    "drawing":     ["sketch", "charcoal", "pencil", "ink", "pastel"],
    "abstract":    ["non-representational", "geometric", "expressionist"],
    "portrait":    ["figure", "face", "bust", "self-portrait"],
    "landscape":   ["nature", "scenery", "countryside", "outdoor"],
    "modern":      ["contemporary", "20th", "21st"],
    "old":         ["antique", "vintage", "classic", "historical"],
}


# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────

def get_connection():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'artwork_registry.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_all_artworks():
    """Pull every published artwork with its artist and primary image."""
    try:
        conn   = get_connection()
        cursor = conn.cursor()
    except Exception as e:
        print(f"[DB] Connection error: {e}")
        return []

    cursor.execute("""
        SELECT
            a.artwork_id,
            a.title,
            a.medium,
            a.date_created,
            a.description,
            ar.name       AS artist_name,
            img.image_url AS primary_image
        FROM artwork a
        LEFT JOIN artist ar  ON a.artist_id  = ar.artist_id
        LEFT JOIN image  img ON a.artwork_id = img.artwork_id
                             AND img.is_primary = 1
        WHERE a.is_published = 1
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return rows


# ─────────────────────────────────────────────
# TEXT UTILITIES
# ─────────────────────────────────────────────

def tokenize(text: str) -> list[str]:
    """Lowercase → strip punctuation → remove stop words → split."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [
        w for w in text.split()
        if w not in STOP_WORDS and len(w) > 1
    ]


def expand_query(keywords: list[str]) -> list[str]:
    """
    Synonym expansion: if the user typed 'painting', also search for
    'oil', 'acrylic', etc.  Preserves original keywords too.
    """
    expanded = list(keywords)
    for kw in keywords:
        for canon, aliases in SYNONYMS.items():
            if kw == canon or kw in aliases:
                expanded.extend([canon] + aliases)
    # deduplicate while keeping order
    seen, result = set(), []
    for w in expanded:
        if w not in seen:
            seen.add(w)
            result.append(w)
    return result


# ─────────────────────────────────────────────
# SCORING ENGINE
# ─────────────────────────────────────────────

def build_field_doc(artwork: dict, field: str) -> str:
    """Return the raw text for one field of one artwork (lowercased)."""
    return (artwork.get(field) or "").lower()


def fuzzy_field_score(keyword: str, field_text: str) -> float:
    """
    For each word in field_text, compute fuzzy similarity to keyword.
    Returns 1.0 for an exact substring hit, or a fractional value for
    near-matches above FUZZY_THRESHOLD.
    """
    if not field_text:
        return 0.0

    # Fast path — exact substring
    if keyword in field_text:
        return 1.0

    # Fuzzy over individual tokens in the field
    best = 0.0
    for token in field_text.split():
        ratio = fuzz.ratio(keyword, token)
        if ratio >= FUZZY_THRESHOLD:
            best = max(best, ratio / 100.0)

    return best * FUZZY_WEIGHT if best > 0 else 0.0


def compute_direct_score(artwork: dict, expanded_keywords: list[str]) -> float:
    """
    Weighted, fuzzy keyword hit score across all fields.
    This catches exact and near-exact matches with field priority.
    """
    score = 0.0
    for field, weight in FIELD_WEIGHTS.items():
        field_text = build_field_doc(artwork, field)
        for kw in expanded_keywords:
            hit = fuzzy_field_score(kw, field_text)
            score += hit * weight
    return score


def build_bm25_corpus(artworks: list[dict]) -> tuple[BM25Okapi, list[list[str]]]:
    """
    Concatenate all fields (with repetition weighted by field importance)
    into a single document per artwork, then build a BM25 index.

    Repeating tokens from high-weight fields is a simple but effective
    trick to bake field priority into BM25 without a custom scorer.
    """
    corpus = []
    for artwork in artworks:
        doc_tokens = []
        for field, weight in FIELD_WEIGHTS.items():
            tokens = tokenize(build_field_doc(artwork, field))
            repeats = max(1, round(weight))   # title repeated 3×, desc 1×
            doc_tokens.extend(tokens * repeats)
        corpus.append(doc_tokens)

    bm25 = BM25Okapi(corpus) if corpus else None
    return bm25, corpus


# ─────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────

def search_artworks(query_string: str) -> list[dict]:
    """
    Main search entry point.

    Algorithm:
      1. Tokenize + expand query with domain synonyms
      2. Score every artwork with weighted fuzzy keyword matching
      3. Re-rank using BM25Okapi (probabilistic relevance model)
      4. Combine scores: final = 0.6 × BM25_norm + 0.4 × direct_norm
      5. Return top-K results sorted by final score

    Parameters:
        query_string (str) — raw user input

    Returns:
        list of dicts — ranked artworks, best first
    """

    # ── 1. Parse query ──────────────────────────────────────────────
    base_keywords = tokenize(query_string)
    if not base_keywords:
        return []

    expanded_keywords = expand_query(base_keywords)

    # ── 2. Fetch data ────────────────────────────────────────────────
    artworks = fetch_all_artworks()
    if not artworks:
        return []

    # ── 3. BM25 scores ───────────────────────────────────────────────
    bm25, _ = build_bm25_corpus(artworks)
    bm25_scores = (
        bm25.get_scores(expanded_keywords)   # ndarray, one value per artwork
        if bm25 else
        [0.0] * len(artworks)
    )

    # ── 4. Direct fuzzy scores ───────────────────────────────────────
    direct_scores = [
        compute_direct_score(art, expanded_keywords)
        for art in artworks
    ]

    # ── 5. Normalize both score arrays to [0, 1] ────────────────────
    def normalize(scores: list[float]) -> list[float]:
        max_s = max(scores) if scores else 1.0
        if max_s == 0:
            return [0.0] * len(scores)
        return [s / max_s for s in scores]

    bm25_norm   = normalize(list(bm25_scores))
    direct_norm = normalize(direct_scores)

    # ── 6. Combine & filter ──────────────────────────────────────────
    results = []
    for i, artwork in enumerate(artworks):
        final_score = 0.6 * bm25_norm[i] + 0.4 * direct_norm[i]
        if final_score >= MIN_SCORE:
            artwork["relevance_score"] = round(final_score, 4)
            results.append(artwork)

    # ── 7. Sort and cap ──────────────────────────────────────────────
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results[:TOP_K]