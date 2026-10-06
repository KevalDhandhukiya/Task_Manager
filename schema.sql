CREATE DATABASE IF NOT EXISTS `cronabit_taskdb`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cronabit_taskdb`;

-- -------------------------------------------------------
-- Table: Users
-- -------------------------------------------------------
DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `role` VARCHAR(255) DEFAULT NULL,
  `department` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active', 'inactive', 'on-leave') DEFAULT 'active',
  `location` VARCHAR(255) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `jobTitle` VARCHAR(255) DEFAULT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `twoFactorEnabled` TINYINT(1) DEFAULT 0,
  `isSuperAdmin` TINYINT(1) DEFAULT 0,
  `resetCode` VARCHAR(255) DEFAULT NULL,
  `resetCodeExpires` BIGINT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: Projects
-- -------------------------------------------------------
DROP TABLE IF EXISTS `Projects`;
CREATE TABLE `Projects` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('active', 'archived', 'on-hold') DEFAULT 'active',
  `members` JSON DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: Tasks
-- -------------------------------------------------------
DROP TABLE IF EXISTS `Tasks`;
CREATE TABLE `Tasks` (
  `id` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `priority` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  `status` ENUM('todo', 'in-progress', 'testing', 'completed') DEFAULT 'todo',
  `dueDate` VARCHAR(255) DEFAULT NULL,
  `dueTime` VARCHAR(255) DEFAULT NULL,
  `startDate` VARCHAR(255) DEFAULT NULL,
  `startTime` VARCHAR(255) DEFAULT NULL,
  `assignees` JSON DEFAULT NULL,
  `createdBy` VARCHAR(255) DEFAULT NULL,
  `updatedBy` VARCHAR(255) DEFAULT NULL,
  `projectId` VARCHAR(255) DEFAULT NULL,
  `acceptanceCriteria` JSON DEFAULT NULL,
  `attachments` JSON DEFAULT NULL,
  `comments` JSON DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tasks_project` (`projectId`),
  INDEX `idx_tasks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: Notifications
-- -------------------------------------------------------
DROP TABLE IF EXISTS `Notifications`;
CREATE TABLE `Notifications` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `type` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `read` TINYINT(1) DEFAULT 0,
  `actorId` VARCHAR(255) DEFAULT NULL,
  `targetId` VARCHAR(255) DEFAULT NULL,
  `targetType` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notifications_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Default Super Admin Seed
-- Email: admin@gmail.com
-- Password: admin123
-- -------------------------------------------------------
INSERT INTO `Users` (
  `id`, `name`, `email`, `avatar`, `role`, `department`, `status`, `password`, `isSuperAdmin`, `createdAt`, `updatedAt`
) VALUES (
  1,
  'Cronabit Admin',
  'admin@gmail.com',
  'https://i.pravatar.cc/150?u=admin',
  'Administrator',
  'Management',
  'active',
  '$2b$12$o7xHy3EbOwd86eoC6wGeoe0DQHjgvq6EAyKDGGBZDDuFIqTCErLQW',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE `isSuperAdmin` = 1;
