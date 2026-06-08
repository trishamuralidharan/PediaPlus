-- ============================================================
--  PediaPlus — Complete Relational MySQL Schema
--  Run:  mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS pediaplus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pediaplus;

-- ────────────────────────────────────────────────────────────
--  1. USERS  (parent accounts)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  phone         VARCHAR(30),
  location      VARCHAR(200),
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
--  2. PARENT PROFILES  (extended parent details)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_profiles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL UNIQUE,
  mom_name    VARCHAR(100),
  mom_phone   VARCHAR(30),
  mom_dob     DATE,
  mom_email   VARCHAR(255),
  dad_name    VARCHAR(100),
  dad_phone   VARCHAR(30),
  dad_dob     DATE,
  dad_email   VARCHAR(255),
  address     TEXT,
  city        VARCHAR(100),
  state       VARCHAR(100),
  pincode     VARCHAR(10),
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  3. CHILDREN  (child profiles)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,
  gender        ENUM('boy','girl') DEFAULT 'boy',
  dob           DATE,
  age           DECIMAL(4,2),
  weight_kg     DECIMAL(5,2),
  height_cm     DECIMAL(5,2),
  blood_group   VARCHAR(10),
  bmi           DECIMAL(4,1),
  avatar        VARCHAR(10)  DEFAULT '👦',
  mood          VARCHAR(10)  DEFAULT '😊',
  streak_days   INT          DEFAULT 0,
  health_score  TINYINT      DEFAULT 95,
  school        VARCHAR(150),
  doctor_name   VARCHAR(150),
  doctor_phone  VARCHAR(30),
  location      VARCHAR(200),
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  4. CHILD_ALLERGIES  (many allergies per child)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_allergies (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id   INT UNSIGNED NOT NULL,
  allergen   VARCHAR(100) NOT NULL,
  severity   ENUM('mild','moderate','severe') DEFAULT 'mild',
  notes      TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  5. CHILD_DIET_PREFERENCES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_diet_preferences (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id    INT UNSIGNED NOT NULL,
  preference  VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  6. GROWTH_RECORDS  (historical height/weight over time)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth_records (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id     INT UNSIGNED NOT NULL,
  recorded_on  DATE         NOT NULL,
  weight_kg    DECIMAL(5,2),
  height_cm    DECIMAL(5,2),
  head_circ_cm DECIMAL(5,2),
  bmi          DECIMAL(4,1),
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_child_date (child_id, recorded_on),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  7. MEAL_LOGS  (food eaten per day)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id      INT UNSIGNED NOT NULL,
  log_date      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  meal_type     ENUM('breakfast','lunch','dinner','snack','other') DEFAULT 'other',
  food_name     VARCHAR(200) NOT NULL,
  emoji         VARCHAR(10),
  quantity      DECIMAL(6,2) DEFAULT 1,
  unit          VARCHAR(20)  DEFAULT 'serving',
  kcal          DECIMAL(7,2) DEFAULT 0,
  protein_g     DECIMAL(6,2) DEFAULT 0,
  calcium_mg    DECIMAL(7,2) DEFAULT 0,
  iron_mg       DECIMAL(6,2) DEFAULT 0,
  vit_c_mg      DECIMAL(6,2) DEFAULT 0,
  fat_g         DECIMAL(6,2) DEFAULT 0,
  from_recipe   TINYINT(1)   DEFAULT 0,
  recipe_name   VARCHAR(200),
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  8. MOOD_LOGS  (one per child per day)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mood_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id    INT UNSIGNED NOT NULL,
  log_date    DATE         NOT NULL DEFAULT (CURRENT_DATE),
  mood_emoji  VARCHAR(10),
  mood_label  VARCHAR(30),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_child_date (child_id, log_date),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  9. CHECKLIST_LOGS  (daily health tasks)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id    INT UNSIGNED NOT NULL,
  log_date    DATE         NOT NULL DEFAULT (CURRENT_DATE),
  task_index  TINYINT      NOT NULL,
  task_label  VARCHAR(150),
  done        TINYINT(1)   DEFAULT 0,
  done_at     TIMESTAMP    NULL,
  UNIQUE KEY uniq_task (child_id, log_date, task_index),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  10. VACCINES  (vaccination records per child)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccine_records (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id      INT UNSIGNED NOT NULL,
  vaccine_name  VARCHAR(200) NOT NULL,
  vaccine_full  VARCHAR(300),
  scheduled_age VARCHAR(50),
  status        ENUM('done','upcoming','future') DEFAULT 'future',
  given_on      DATE,
  given_at      VARCHAR(200),
  dose_number   TINYINT DEFAULT 1,
  batch_number  VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  11. APPOINTMENTS  (doctor visits)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id        INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  doctor_name     VARCHAR(200),
  doctor_specialty VARCHAR(100),
  clinic_name     VARCHAR(200),
  appointment_date DATE,
  appointment_time TIME,
  status          ENUM('upcoming','completed','cancelled') DEFAULT 'upcoming',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)    ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  12. MILESTONES  (developmental achievements)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id     INT UNSIGNED NOT NULL,
  emoji        VARCHAR(10),
  label        VARCHAR(100) NOT NULL,
  status       ENUM('done','soon','future') DEFAULT 'future',
  achieved_on  DATE,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  13. HEALTH_POINTS  (gamification — streak & points log)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_points (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id    INT UNSIGNED NOT NULL,
  log_date    DATE         NOT NULL DEFAULT (CURRENT_DATE),
  points      INT          DEFAULT 0,
  reason      VARCHAR(200),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  14. SESSIONS  (JWT / active login tracking)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  device_info VARCHAR(300),
  expires_at  TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
--  Indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_children_user       ON children(user_id);
CREATE INDEX idx_meal_logs_child     ON meal_logs(child_id, log_date);
CREATE INDEX idx_mood_child          ON mood_logs(child_id, log_date);
CREATE INDEX idx_checklist_child     ON checklist_logs(child_id, log_date);
CREATE INDEX idx_growth_child        ON growth_records(child_id, recorded_on);
CREATE INDEX idx_vaccine_child       ON vaccine_records(child_id);
CREATE INDEX idx_appt_child          ON appointments(child_id);
CREATE INDEX idx_milestone_child     ON milestones(child_id);
CREATE INDEX idx_points_child        ON health_points(child_id, log_date);

-- ────────────────────────────────────────────────────────────
--  Default milestone templates inserted for new children
--  (handled in app code via stored procedure or seeder)
-- ────────────────────────────────────────────────────────────
