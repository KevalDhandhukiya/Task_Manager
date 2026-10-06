import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
  },
  status: {
    type: DataTypes.ENUM('todo', 'in-progress', 'testing', 'completed'),
  },
  dueDate: {
    type: DataTypes.STRING
  },
  dueTime: {
    type: DataTypes.STRING
  },
  startDate: {
    type: DataTypes.STRING
  },
  startTime: {
    type: DataTypes.STRING
  },
  assignees: {
    type: DataTypes.JSON, // Array of User IDs
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.STRING // User ID
  },
  updatedBy: {
    type: DataTypes.STRING // User ID
  },
  projectId: {
    type: DataTypes.STRING
  },
  acceptanceCriteria: {
    type: DataTypes.JSON, // Array of objects
    defaultValue: []
  },
  attachments: {
    type: DataTypes.JSON, // Array of objects
    defaultValue: []
  },
  comments: {
    type: DataTypes.JSON, // Array of objects
    defaultValue: []
  }
}, {
  timestamps: true
});

export default Task;
