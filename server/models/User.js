import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  avatar: {
    type: DataTypes.STRING
  },
  role: {
    type: DataTypes.STRING
  },
  department: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'on-leave'),
    defaultValue: 'active'
  },
  location: {
    type: DataTypes.STRING
  },
  bio: {
    type: DataTypes.TEXT
  },
  jobTitle: {
    type: DataTypes.STRING
  },
  password: {
    type: DataTypes.STRING
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isSuperAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetCodeExpires: {
    type: DataTypes.BIGINT,
    allowNull: true
  }
}, {
  timestamps: true
});

export default User;
