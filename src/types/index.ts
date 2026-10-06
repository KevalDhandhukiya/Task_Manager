// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'on-leave';
  location?: string;
  bio?: string;
  jobTitle?: string;
  password?: string;
  isSuperAdmin?: boolean;
}

// Task Types
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'testing' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  dueTime?: string;
  startDate?: string;
  startTime?: string;
  assignees: User[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  attachments?: Attachment[];
  comments?: Comment[];
  acceptanceCriteria?: AcceptanceCriterion[];
  projectId?: string;
  archived?: boolean;
  updatedBy?: User; // Last operative to modify parameters
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: User;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  mentions?: string[];
  attachments?: Attachment[];
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  completed: boolean;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed';
  members: User[];
  createdAt: string;
  updatedAt: string;
}

// Chat Types
export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  unreadCount?: number;
  members?: User[];
}

export interface DirectMessage {
  id: string;
  user: User;
  unreadCount?: number;
  lastMessage?: Message;
}

export interface Message {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  channelId?: string;
  dmId?: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

// Notification Types
export type NotificationType = 'task-assigned' | 'comment' | 'status-change' | 'mention' | 'system' | 'task-update';

export interface Notification {
  id: string;
  userId: string; // The recipient of the notification
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actor?: User;
  targetId?: string;
  targetType?: string;
}

// Activity Types
export interface Activity {
  id: string;
  type: 'task-moved' | 'comment-added' | 'task-created' | 'system';
  description: string;
  user: User;
  createdAt: string;
  metadata?: Record<string, any>;
}

// Team Workload
export interface TeamMemberWorkload {
  user: User;
  capacity: number;
  assignedTasks: number;
  completedTasks: number;
}

// Stats
export interface DashboardStats {
  totalTasks: number;
  totalTasksChange: number;
  completedTasks: number;
  completedTasksChange: number;
  inProgressTasks: number;
  inProgressTasksChange: number;
  overdueTasks: number;
  overdueTasksChange: number;
}
