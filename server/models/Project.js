import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('active', 'archived', 'on-hold'),
    defaultValue: 'active'
  },
  members: {
    type: DataTypes.JSON, // Array of User IDs
    defaultValue: []
  }
}, {
  timestamps: true
});

export default Project;
