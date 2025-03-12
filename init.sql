CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('LEHRER', 'HELFER') NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  birth_date DATE,
  gender ENUM('MALE', 'FEMALE'),
  class_name VARCHAR(50),
  is_present BOOLEAN DEFAULT TRUE,
  is_assistant BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sports (
  id CHAR(36) PRIMARY KEY,
  name ENUM('HIGH_JUMP', 'JAVELIN', 'SPRINT_80M', 'SHOT_PUT', 'HURDLES') UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36),
  sport_id CHAR(36),
  attempt1 DOUBLE,
  attempt2 DOUBLE,
  attempt3 DOUBLE,
  best_value DOUBLE,
  points INT,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (sport_id) REFERENCES sports(id)
);

CREATE TABLE IF NOT EXISTS scoring_table (
  id CHAR(36) PRIMARY KEY,
  gender ENUM('MALE', 'FEMALE'),
  age_category ENUM('U15', 'AGE_16_17', 'AGE_18_PLUS'),
  sport ENUM('HIGH_JUMP', 'JAVELIN', 'SPRINT_80M', 'SHOT_PUT', 'HURDLES'),
  performance DOUBLE,
  points INT
);

CREATE TABLE IF NOT EXISTS grading_table (
  id CHAR(36) PRIMARY KEY,
  gender ENUM('MALE', 'FEMALE'),
  age_category ENUM('U15', 'AGE_16_17', 'AGE_18_PLUS'),
  grade DOUBLE,
  min_points INT
);

-- Optional: Testeintrag
INSERT INTO sports (id, name)
VALUES 
  (UUID(), 'HIGH_JUMP'),
  (UUID(), 'JAVELIN'),
  (UUID(), 'SPRINT_80M'),
  (UUID(), 'SHOT_PUT'),
  (UUID(), 'HURDLES');

-- Lehrer-Account (username: lehrer / password: lehrerpass)
INSERT INTO users (id, username, password, role)
VALUES (
  UUID(), 
  'lehrer', 
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZagcsdOQ5XkMKPydA3.sEknW7ZcyG', 
  'LEHRER'
);
