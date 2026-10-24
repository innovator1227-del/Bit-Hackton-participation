CREATE TABLE categories (
  slug VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO categories (slug, name, description) VALUES
  ('road_damage', 'Road damage', 'Potholes and damaged road surfaces'),
  ('streetlight', 'Streetlight', 'Broken or unreliable street lighting'),
  ('water_leak', 'Water leak', 'Leaking water pipes or public taps'),
  ('drainage', 'Drainage', 'Blocked or damaged drainage'),
  ('waste', 'Waste', 'Uncollected waste or illegal dumping'),
  ('sidewalk', 'Sidewalk', 'Damaged or obstructed sidewalks'),
  ('other', 'Other', 'Other neighborhood problems');

ALTER TABLE reports
  MODIFY category VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ADD CONSTRAINT fk_reports_category FOREIGN KEY (category) REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE users ADD COLUMN category VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER role;
UPDATE users SET category = 'other' WHERE role = 'staff';
ALTER TABLE users ADD CONSTRAINT fk_users_staff_category FOREIGN KEY (category) REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT;