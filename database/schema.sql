-- ============================================================
-- Research Opportunity Portal : MySQL database schema
-- Course: CN (Computer Networks) - Assignment #01, BCS-5C
-- ------------------------------------------------------------
-- Run:  mysql -u root -p < database/schema.sql
-- (creates the database and the opportunities table)
-- ============================================================

CREATE DATABASE IF NOT EXISTS research_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE research_portal;

CREATE TABLE IF NOT EXISTS opportunities (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(255) NOT NULL,
  description       TEXT NOT NULL,
  research_area     VARCHAR(255) NOT NULL,
  faculty_name      VARCHAR(255) NOT NULL,
  department        VARCHAR(255) NOT NULL,
  required_skills   VARCHAR(500) NOT NULL DEFAULT '',
  positions         INT NOT NULL DEFAULT 1,
  deadline          DATE NOT NULL,
  status            ENUM('Open','Closed') NOT NULL DEFAULT 'Open',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
