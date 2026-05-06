CREATE DATABASE IF NOT EXISTS artwork_registry;
USE artwork_registry;

-- ---- ARTIST ----
-- Stores each artist's name, where they're from, and their bio
CREATE TABLE IF NOT EXISTS artist (
    artist_id  INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    location   VARCHAR(255),
    bio        TEXT
);

-- ---- ARTWORK ----
-- The main table. Every piece links to one artist.
-- is_published controls whether it shows in the public gallery.
CREATE TABLE IF NOT EXISTS artwork (
    artwork_id       INT AUTO_INCREMENT PRIMARY KEY,
    accession_number VARCHAR(100) UNIQUE NOT NULL,
    title            VARCHAR(255) NOT NULL,
    artist_id        INT,
    date_created     VARCHAR(100),
    dimensions       VARCHAR(100),
    medium           VARCHAR(255),
    description      TEXT,
    is_published     BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (artist_id) REFERENCES artist(artist_id)
);

-- ---- IMAGE ----
-- An artwork can have many images. One is marked primary (main photo).
CREATE TABLE IF NOT EXISTS image (
    image_id   INT AUTO_INCREMENT PRIMARY KEY,
    artwork_id INT,
    image_url  VARCHAR(500),
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
);

-- ---- LOCATION ----
-- Where is the artwork right now? What is its status?
CREATE TABLE IF NOT EXISTS location (
    location_id      INT AUTO_INCREMENT PRIMARY KEY,
    artwork_id       INT,
    current_location VARCHAR(255),
    status           VARCHAR(100),  -- "On Display", "In Storage", "On Loan"
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
);

-- ---- PROVENANCE ----
-- How was it acquired? Who donated it?
CREATE TABLE IF NOT EXISTS provenance (
    provenance_id      INT AUTO_INCREMENT PRIMARY KEY,
    artwork_id         INT,
    date_appraised     DATE,
    acquisition_method VARCHAR(255),  -- "Gift", "Purchase", "Commission"
    donor              VARCHAR(255),
    date_acquired      DATE,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
);

-- ---- FINANCIAL ----
-- What is it worth? What did we pay?
CREATE TABLE IF NOT EXISTS financial (
    financial_id INT AUTO_INCREMENT PRIMARY KEY,
    artwork_id   INT,
    value        DECIMAL(10,2),
    cost         DECIMAL(10,2),
    sale_details TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
);

-- ---- CONDITION REPORT ----
-- Physical condition notes
CREATE TABLE IF NOT EXISTS condition_report (
    condition_id    INT AUTO_INCREMENT PRIMARY KEY,
    artwork_id      INT,
    condition_text  TEXT,
    condition_image VARCHAR(500),
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
);

-- ---- DOCUMENTATION ----
-- Attached PDF files, certificates, appraisals
CREATE TABLE IF NOT EXISTS documentation (
    doc_id     INT AUTO_INCREMENT PRIMARY KEY,
    artwork_id INT,
    file_url   VARCHAR(500),
    FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id)
);
