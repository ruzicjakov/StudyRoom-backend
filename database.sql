-- Kreiranje tablice Space
CREATE TABLE Space (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  type ENUM('READING_ROOM', 'GROUP_ROOM', 'QUIET_ROOM') NOT NULL,
  capacity INT DEFAULT 1,
  openFrom VARCHAR(255) NOT NULL,
  openTo VARCHAR(255) NOT NULL,
  providerId INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kreiranje tablice Reservation
CREATE TABLE Reservation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spaceId INT NOT NULL,
  userId INT NOT NULL,
  startTime DATETIME NOT NULL,
  endTime DATETIME NOT NULL,
  status ENUM('ACTIVE', 'CANCELLED') DEFAULT 'ACTIVE',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Strani ključ koji povezuje rezervaciju s prostorom
  FOREIGN KEY (spaceId) REFERENCES Space(id)
);