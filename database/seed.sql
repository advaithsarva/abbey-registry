-- ================================================================
-- seed.sql  —  Sample data to test the system
-- ================================================================
-- Run AFTER schema.sql:
--   mysql -u root -p < database/seed.sql
-- ================================================================
USE artwork_registry;

INSERT INTO artist (name, location, bio) VALUES
('Sister Anne Marguerite OSB', 'Saint Martin''s Abbey, WA', 'Benedictine artist working in mixed media and sacred iconography.'),
('Brother Paul Chen',          'Saint Martin''s Abbey, WA', 'Monk and painter specialising in oil and encaustic works.'),
('Elena Vasquez',              'Seattle, WA',               'Contemporary painter exploring nature and contemplative themes.'),
('Soo-Yeon Park',              'Tacoma, WA',                'Fine art photographer focused on sacred architecture and light.');

INSERT INTO artwork (accession_number, title, artist_id, date_created, dimensions, medium, description, is_published) VALUES
('2023-001', 'Illuminated Vespers', 1, '2023', '92 x 73 cm', 'Mixed media on linen',    'A luminous meditation on evening prayer, combining gold leaf and pigment.', TRUE),
('2021-001', 'Lectio Divina',       2, '2021', '60 x 80 cm', 'Oil on board',            'A quiet depiction of monastic reading practice and sacred silence.',       TRUE),
('2024-001', 'Forest Compline',     3, '2024', '120 x 90 cm','Acrylic on canvas',       'The forest at nightfall echoing the final prayer of the day.',             TRUE),
('2023-002', 'Bell Tower at Dusk',  4, '2023', '50 x 70 cm', 'Archival photographic print','Long-exposure photograph of the Abbey bell tower at golden hour.',     TRUE);

INSERT INTO image (artwork_id, image_url, is_primary) VALUES
(1, '/uploads/placeholder.jpg', TRUE),
(2, '/uploads/placeholder.jpg', TRUE),
(3, '/uploads/placeholder.jpg', TRUE),
(4, '/uploads/placeholder.jpg', TRUE);

INSERT INTO location (artwork_id, current_location, status) VALUES
(1, 'Abbey Church Gallery – North Wall', 'On Display'),
(2, 'Cloister Walk Gallery',             'On Display'),
(3, 'Chapter Room',                      'On Display'),
(4, 'Storage Room B',                    'In Storage');

INSERT INTO provenance (artwork_id, acquisition_method, donor, date_acquired) VALUES
(1, 'Gift',     'Sister Anne Marguerite OSB', '2023-07-01'),
(2, 'Purchase',  NULL,                        '2021-04-01'),
(3, 'Commission',NULL,                        '2024-02-15'),
(4, 'Gift',     'Soo-Yeon Park',              '2023-09-10');

INSERT INTO financial (artwork_id, value, cost) VALUES
(1, 4500.00,  0.00),
(2, 3200.00,  2800.00),
(3, 5000.00,  4500.00),
(4, 1800.00,  0.00);

INSERT INTO condition_report (artwork_id, condition_text) VALUES
(1, 'Excellent. No visible damage. Varnish intact.'),
(2, 'Good. Minor surface dust. Recommend light cleaning.'),
(3, 'Excellent. Recently completed work.'),
(4, 'Good. Print stored flat, no creasing.');
