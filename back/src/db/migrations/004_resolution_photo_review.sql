ALTER TABLE reports
  MODIFY status ENUM('reported','under_review','in_progress','pending_verification','resolved','rejected') NOT NULL DEFAULT 'reported',
  ADD COLUMN resolution_image_url VARCHAR(255) NULL AFTER image_url;

ALTER TABLE report_updates
  MODIFY old_status ENUM('reported','under_review','in_progress','pending_verification','resolved','rejected') NULL,
  MODIFY new_status ENUM('reported','under_review','in_progress','pending_verification','resolved','rejected') NULL,
  ADD COLUMN image_url VARCHAR(255) NULL AFTER note;
