CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('resident','staff','admin','super_admin') NOT NULL DEFAULT 'resident',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('road_damage','streetlight','water_leak','drainage','waste','sidewalk','other') NOT NULL,
  neighborhood VARCHAR(120) NOT NULL,
  landmark VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  status ENUM('reported','under_review','in_progress','resolved','rejected') NOT NULL DEFAULT 'reported',
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  created_by BIGINT UNSIGNED NULL,
  assigned_to BIGINT UNSIGNED NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_reports_status_created (status, created_at, id),
  KEY idx_reports_category (category),
  KEY idx_reports_priority (priority),
  KEY idx_reports_neighborhood (neighborhood),
  KEY idx_reports_assigned (assigned_to, status),
  FULLTEXT KEY ft_reports_text (title, description, landmark)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS report_updates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  old_status ENUM('reported','under_review','in_progress','resolved','rejected') NULL,
  new_status ENUM('reported','under_review','in_progress','resolved','rejected') NULL,
  old_priority ENUM('low','medium','high','urgent') NULL,
  new_priority ENUM('low','medium','high','urgent') NULL,
  old_assigned_to BIGINT UNSIGNED NULL,
  new_assigned_to BIGINT UNSIGNED NULL,
  note VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_updates_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_updates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_updates_old_assignee FOREIGN KEY (old_assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_updates_new_assignee FOREIGN KEY (new_assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_updates_report_time (report_id, created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS report_confirmations (
  report_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, user_id),
  CONSTRAINT fk_confirm_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_confirm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
