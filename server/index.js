import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

// Database
import sequelize from './database.js';
import User from './models/User.js';
import Project from './models/Project.js';
import Task from './models/Task.js';
import Notification from './models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cronabit_super_secret_key_change_in_production';
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

// HTTP & Socket.io Setup
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

// Expose io to routes if needed
app.set("io", io);

io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Email Transporter (Nodemailer setup)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper function to send email notifications
const sendTaskNotificationEmail = async (task, receiverIds, senderId) => {
  try {
    const sender = await User.findOne({ where: { id: senderId } });
    const receivers = await User.findAll({ where: { id: { [Op.in]: receiverIds } } });

    for (const receiver of receivers) {
      if (!receiver.email || receiver.id === senderId) continue;
      
      const mailOptions = {
        from: `"Cronabit Strategic" <${process.env.SMTP_USER}>`,
        to: receiver.email,
        subject: `New Task: ${task.title} Assigned to You`,
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 20px; color: #111827;">
            <div style="background-color: #0D4D3D; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Cronabit Task Assigned</h2>
            </div>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Greetings <strong style="color: #0D4D3D;">${receiver.name}</strong>,
            </p>
            <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px; line-height: 1.5;">
              New Task <strong>"${task.title}"</strong> has been assigned to you by <strong>${sender ? sender.name : 'an administrator'}</strong>.
            </p>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
              <h3 style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0;">Task Details</h3>
              <p style="margin: 8px 0; font-size: 15px;"><strong>Priority:</strong> <span style="color: #EF4444; font-weight: 800;">${task.priority ? task.priority.toUpperCase() : 'MEDIUM'}</span></p>
              <p style="margin: 8px 0; font-size: 15px;"><strong>Due Date:</strong> ${task.dueDate ? (() => { const p = task.dueDate.split('-'); return `${p[1]}-${p[2]}-${p[0]}`; })() : 'Unscheduled'}</p>
              <p style="margin: 8px 0; font-size: 14px; color: #6b7280;"><em>${task.description || 'No description provided.'}</em></p>
            </div>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Task notification email sent to ${receiver.email}`);
    }
  } catch (err) {
    console.error('❌ Failed to send task notification email:', err);
  }
};

// Middleware
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -- JWT Auth Middleware --
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// -- Rate Limiter for Auth Routes --
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per window
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

// File Upload Route
app.post('/api/upload', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// Database Synchronization — use force:false in production (never alter)
sequelize.sync({ force: false })
  .then(() => {
    console.log('✅ MySQL Database Synchronized');
    ensureSuperAdmin();
  })
  .catch((err) => console.error('❌ MySQL Sync Error:', err));

// Auto-migrate: ensure the admin account exists and is marked as Super Admin
const ensureSuperAdmin = async () => {
  try {
    const freshBcryptHash = await bcrypt.hash('admin123', 12);

    const [admin, created] = await User.findOrCreate({
      where: { email: 'admin@gmail.com' },
      defaults: {
        name: 'Cronabit Admin',
        password: freshBcryptHash,
        role: 'Administrator',
        department: 'Management',
        status: 'active',
        isSuperAdmin: true,
        avatar: 'https://i.pravatar.cc/150?u=admin'
      }
    });
    
    if (created) {
      console.log('🌱 Default Super Admin account created.');
    } else {
      // Force-repair: if the stored password is NOT a valid bcrypt hash
      // (e.g. was double-hashed by the old sha256 hook), reset it now.
      const updates = {};
      if (!admin.password || !admin.password.startsWith('$2')) {
        updates.password = freshBcryptHash;
        console.log('🔧 Admin password repaired: re-hashed with bcrypt.');
      }
      if (!admin.isSuperAdmin) {
        updates.isSuperAdmin = true;
        console.log('✅ Super Admin flag ensured for existing admin account.');
      }
      if (Object.keys(updates).length > 0) {
        // Use raw SQL update to bypass any ORM hooks that could interfere
        await sequelize.query(
          `UPDATE Users SET password = :password, isSuperAdmin = :isSuperAdmin WHERE email = 'admin@gmail.com'`,
          {
            replacements: {
              password: updates.password || admin.password,
              isSuperAdmin: true
            }
          }
        );
      }
    }
  } catch (err) {
    console.error('❌ Failed to ensure Super Admin account:', err);
  }
};


// Serve static files from the React app dist folder (Production Mode)
app.use(express.static(path.join(__dirname, '../dist')));


// Authentication
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email: rawEmail, password: rawPassword } = req.body;
  const email = rawEmail?.trim();
  const password = rawPassword?.trim();

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // 1. Try bcrypt (modern hashed passwords)
    let passwordValid = false;
    if (user.password && user.password.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // 2. Legacy: plain text or SHA-256 — migrate to bcrypt on success
      const sha256 = crypto.createHash('sha256').update(password).digest('hex');
      if (user.password === password || user.password === sha256) {
        passwordValid = true;
        // Auto-migrate to bcrypt
        const hashed = await bcrypt.hash(password, 12);
        await user.update({ password: hashed });
        console.log(`🔐 Migrated password to bcrypt for: ${email}`);
      }
    }

    if (!passwordValid) return res.status(401).json({ message: 'Invalid credentials' });

    // Issue JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isSuperAdmin: user.isSuperAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = user.toJSON();
    delete userResponse.password;
    res.json({ ...userResponse, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Protected API Routes (require valid JWT) ──────────────────────────────
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create User
app.post('/api/users', verifyToken, async (req, res) => {
  try {
    // Strip ID from request to let MySQL generate a numeric one
    const userData = { ...req.body };
    delete userData.id;

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    const newUser = await User.create(userData);
    
    // Send Welcome Email
    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
    const mailOptions = {
        from: `"Cronabit Team" <${process.env.SMTP_USER}>`,
        to: newUser.email,
        subject: 'Welcome to Cronabit - Account Created',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #1a1a1a;">Welcome to the Team, ${newUser.name}!</h2>
                <p style="color: #4a4a4a; line-height: 1.6;">An account has been created for you on the Cronabit Task Management platform.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #666;"><strong>Your Login Email:</strong> ${newUser.email}</p>
                </div>
                <p style="color: #4a4a4a;">You can log in now using the button below:</p>
                <a href="${loginLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Login to Your Account</a>
                <p style="margin-top: 30px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
                    If you don't know your password, please use the "Forgot Password" link on the login page to set a new one.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to: ${newUser.email}`);
    } catch (mailError) {
        console.error('Failed to send welcome email:', mailError);
    }

    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update User
app.patch('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateData = { ...req.body };

    // Hash password with bcrypt if it's being changed
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }
    
    await user.update(updateData);
    const userResponse = user.toJSON();
    delete userResponse.password;
    res.json(userResponse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete User
app.delete('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/projects', verifyToken, async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/projects', verifyToken, async (req, res) => {
  try {
    const newProject = await Project.create(req.body);
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/notifications', verifyToken, async (req, res) => {
  const { userId } = req.query;
  try {
    const where = userId ? { userId } : {};
    const notifications = await Notification.findAll({ 
      where, 
      order: [['createdAt', 'DESC']] 
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await Task.findAll();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create Task
app.post('/api/tasks', verifyToken, async (req, res) => {
  const taskData = req.body;
  
  const taskToSave = { ...taskData };
  if (Array.isArray(taskData.assignees) && typeof taskData.assignees[0] === 'object') {
    taskToSave.assignees = taskData.assignees.map(a => a.id);
  }
  if (taskData.createdBy && typeof taskData.createdBy === 'object') {
    taskToSave.createdBy = taskData.createdBy.id;
  }

  try {
    const newTask = await Task.create(taskToSave);
    
    if (taskToSave.assignees && taskToSave.assignees.length > 0) {
      sendTaskNotificationEmail(newTask, taskToSave.assignees, taskToSave.createdBy);
      
      for (const assigneeId of taskToSave.assignees) {
        if (assigneeId !== taskToSave.createdBy) {
          await Notification.create({
            id: Math.random().toString(36).substring(2, 11),
            userId: assigneeId,
            type: 'task-assigned',
            title: 'Task Assigned',
            message: `A new task "${newTask.title}" has been assigned to you.`,
            read: false,
            actorId: taskToSave.createdBy,
            targetId: newTask.id,
            targetType: 'task',
          });
        }
      }
    }
    
    
    // Broadcast real-time update
    io.emit('task:created', newTask);

    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Task
app.patch('/api/tasks/:id', verifyToken, async (req, res) => {
  const updateData = { ...req.body };
  
  if (Array.isArray(updateData.assignees) && typeof updateData.assignees[0] === 'object') {
    updateData.assignees = updateData.assignees.map(a => a.id);
  }

  try {
    const task = await Task.findOne({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const originalTask = task.toJSON();
    await task.update(updateData);
    const updatedTask = task.toJSON();

    const newAssignees = updatedTask.assignees || [];
    const oldAssignees = originalTask.assignees || [];
    const addedAssignees = newAssignees.filter(id => !oldAssignees.includes(id));

    if (addedAssignees.length > 0) {
      sendTaskNotificationEmail(updatedTask, addedAssignees, req.body.updatedBy || updatedTask.createdBy);
      
      for (const assigneeId of addedAssignees) {
        if (assigneeId !== (req.body.updatedBy || updatedTask.createdBy)) {
          await Notification.create({
            id: Math.random().toString(36).substring(2, 11),
            userId: assigneeId,
            type: 'task-assigned',
            title: 'Task Assigned',
            message: `You have been assigned to "${updatedTask.title}".`,
            read: false,
            actorId: req.body.updatedBy || updatedTask.createdBy,
            targetId: updatedTask.id,
            targetType: 'task',
          });
        }
      }
    }

    if (req.body.status && originalTask.status !== req.body.status) {
       const uniqueAssignees = [...new Set(updatedTask.assignees || [])];
       for (const assigneeId of uniqueAssignees) {
         if (assigneeId !== req.body.updatedBy) {
           await Notification.create({
             id: Math.random().toString(36).substring(2, 11),
             userId: assigneeId,
             type: 'status-change',
             title: 'Status Changed',
             message: `Task "${updatedTask.title}" moved to ${req.body.status.toUpperCase()}.`,
             read: false,
             actorId: req.body.updatedBy,
             targetId: updatedTask.id,
             targetType: 'task',
           });
         }
       }
    }

    if (req.body.description && originalTask.status === 'completed' && originalTask.description !== req.body.description) {
       const uniqueAssignees = [...new Set(updatedTask.assignees || [])];
       for (const assigneeId of uniqueAssignees) {
         if (assigneeId !== req.body.updatedBy) {
           await Notification.create({
             id: Math.random().toString(36).substring(2, 11),
             userId: assigneeId,
             type: 'task-update',
             title: 'Completed Task Updated',
             message: `The description of COMPLETED task "${updatedTask.title}" has been modified.`,
             read: false,
             actorId: req.body.updatedBy,
             targetId: updatedTask.id,
             targetType: 'task',
           });
         }
       }
    }

    // Broadcast real-time update
    io.emit('task:updated', updatedTask);

    // Detect if a new comment was added and broadcast it separately for "WhatsApp-like" speed
    const oldComments = originalTask.comments || [];
    const newComments = updatedTask.comments || [];
    if (newComments.length > oldComments.length) {
      const addedComment = newComments[newComments.length - 1];
      io.emit('comment:new', { 
        taskId: updatedTask.id, 
        comment: addedComment 
      });
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Task
app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await task.destroy();

    // Broadcast real-time update
    io.emit('task:deleted', req.params.id);

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/notifications', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    await notification.update(req.body);
    res.json(notification);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    await Notification.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/notifications', verifyToken, async (req, res) => {
  const { userId } = req.query;
  try {
    await Notification.destroy({ where: { userId } });
    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot Password Route: Strategic 6-Digit Code Dispatch
app.post(['/api/forgot-password', '/api/auth/forgot-password'], async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Security: Always return success to prevent user enumeration
      return res.json({ message: 'Strategic Code Dispatched' });
    }

    // Generate 6-digit tactical mission key
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save Mission Key for synchronization
    await user.update({ resetCode: otp, resetCodeExpires: Date.now() + 3600000 });

    const mailOptions = {
      from: `"Cronabit Strategic" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Tactical Mission Key: ${otp}`,
      html: `
        <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(13, 77, 61, 0.05); border: 1px solid #f1f5f9;">
                <div style="background-color: #0D4D3D; padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: -0.025em; line-height: 1.2;">Initialize New <span style="font-weight: 700;">Credentials</span></h1>
                </div>
                <div style="padding: 48px; text-align: center;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 32px 0;">
                        A strategic recovery flow was initiated. Enter the tactical sync code below in your Command Hub.
                    </p>
                    <div style="background-color: #f1f5f9; padding: 32px; border-radius: 18px; display: inline-block; min-width: 240px; border: 2px dashed #cbd5e1;">
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; color: #0D4D3D; letter-spacing: 0.5em; margin-left: 0.5em;">${otp}</span>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">This tactical key will expire in 60 minutes.</p>
                </div>
            </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Strategic Code Dispatched' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify Recovery Code: Tactical Interlink Validation
app.post('/api/auth/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || user.resetCode !== code) {
      return res.status(400).json({ message: 'Invalid mission key.' });
    }
    res.json({ message: 'Tactical Sync Code Verified' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset Password Route: Hardened Credential Initialization
app.post(['/api/auth/reset-password', '/api/auth/reset-password-otp'], async (req, res) => {
  const { email, password, code } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Operative not found.' });
    }
    
    // Verify code for extra security if provided
    if (code && user.resetCode !== code) {
        return res.status(400).json({ message: 'Mission Key verification failed.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await user.update({ 
        password: hashedPassword, 
        resetCode: null, 
        resetCodeExpires: null 
    });
    res.json({ message: 'Credentials recalibrated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SPA catch-all (Must be the last route)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} (MySQL mode)`);
});
