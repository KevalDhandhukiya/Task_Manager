import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
    unique: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  actorId: {
    type: DataTypes.STRING // User who performed the action
  },
  targetId: {
    type: DataTypes.STRING // task or project ID
  },
  targetType: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true,
  updatedAt: false // Original Mongoose didn't have/use updatedAt for notifications
});

export default Notification;
