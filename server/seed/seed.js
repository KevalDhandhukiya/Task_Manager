import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Models & Database
import sequelize from '../database.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

const teamMembers = [
  {
    id: 1,
    name: 'Cronabit Admin',
    email: 'admin@gmail.com',
    avatar: 'https://i.pravatar.cc/150?u=admin',
    role: 'Administrator',
    department: 'Management',
    status: 'active',
    password: 'admin123',
    isSuperAdmin: true,
  }
];

const projects = [];
const tasks = [];

const seedDB = async () => {
  try {
    // Stage 1: Create Database if missing
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    await connection.end();
    console.log(`✅ Database "${process.env.DB_NAME}" checked/created.`);

    // Stage 2: Sync Sequelize and Bulk Create
    console.log('Connecting to MySQL at:', process.env.DB_HOST);
    await sequelize.sync({ force: true });
    console.log('Database synced (all tables dropped and recreated).');

    await User.bulkCreate(teamMembers);
    // Projects and Tasks are empty
    console.log('Database Initialized Successfully! ✅ (Only Superadmin Added)');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
