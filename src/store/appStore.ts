import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { User, Task, Project, Notification, Message, Channel, DirectMessage } from '@/types';
import type { Page } from '@/App';
import { io, Socket } from 'socket.io-client';

// Generate unique ID
export const generateId = () => Math.random().toString(36).substring(2, 15);

interface AppState {
  // Navigation
  currentPage: Page;
  selectedTask: Task | null;
  activeProjectId: string | null;
  setPage: (page: Page) => void;
  setSelectedTask: (task: Task | null) => void;
  setActiveProjectId: (id: string | null) => void;
  isCreateTaskOpen: boolean;
  setCreateTaskOpen: (open: boolean) => void;
  createTaskProjectId: string | null;
  setCreateTaskProjectId: (id: string | null) => void;
  lastSeenCount: number;
  setLastSeenCount: (count: number) => void;
  
  // Appearance
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Auth
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  
  // Users
  users: User[];
  addUser: (user: Omit<User, 'id' | 'status'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deactivateUser: (userId: string) => void;
  deleteUser: (userId: string) => Promise<void>;
  resetPassword: (email: string, password: string) => Promise<boolean>;
  
  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: Task['status']) => void;
  archiveTask: (taskId: string) => Promise<void>;
  unarchiveTask: (taskId: string) => Promise<void>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;
  deleteAttachment: (taskId: string, attachmentId: string) => Promise<void>;
  receiveNewComment: (taskId: string, comment: any) => void;
  getTasksByUser: (userId: string) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  
  // Projects
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  
  // Notifications
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  getUnreadCount: () => number;
  
  // Chat
  channels: Channel[];
  directMessages: DirectMessage[];
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => void;
  
  // Stats
  getUserStats: (userId: string) => {
    todoTasks: number;
    inProgressTasks: number;
    testingTasks: number;
    completedTasks: number;
    overdueTasks: number;
  };

  // API Integration & Sockets
  socket: Socket | null;
  initializeSocket: () => void;
  fetchInitialData: () => Promise<void>;
}

const baseApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const BACKEND_URL = `${baseApiUrl}/api`;
const BASE_DOMAIN = baseApiUrl;

export const resolveImageUrl = (path: string | undefined | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE_DOMAIN}/${cleanPath}`;
};

// Empty initial data to be filled by MySQL Database
const initialNotifications: Notification[] = [];
const initialChannels: Channel[] = [
  { id: '1', name: 'general', type: 'public' },
  { id: '2', name: 'development', type: 'public' },
  { id: '3', name: 'testing', type: 'public' },
  { id: '4', name: 'design', type: 'public' },
  { id: '5', name: 'random', type: 'public' },
];
const initialMessages: Message[] = [];

let socketInstance: Socket | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentPage: (() => {
        const path = window.location.pathname;
        if (path === '/projects') return 'projects';
        if (path === '/tasks') return 'tasks';
        if (path === '/my-tasks') return 'my-tasks';
        if (path === '/chat') return 'chat';
        if (path === '/profile') return 'profile';
        if (path === '/team') return 'team';
        if (path === '/reports') return 'reports';
        if (path === '/archived') return 'archived';
        return 'dashboard';
      })() as Page,
      selectedTask: null as Task | null,
      activeProjectId: null as string | null,
      setPage: (page: Page) => {
        const pathMap: Record<string, string> = {
          dashboard: '/',
          projects: '/projects',
          tasks: '/tasks',
          'my-tasks': '/my-tasks',
          chat: '/chat',
          profile: '/profile',
          team: '/team',
          reports: '/reports',
          archived: '/archived',
          'task-workspace': '/task-workspace'
        };
        const path = pathMap[page] || '/';
        if (window.location.pathname !== path) {
          window.history.pushState({ page }, '', path);
        }
        set({ currentPage: page });
      },
      setSelectedTask: (task: Task | null) => set({ selectedTask: task }),
      setActiveProjectId: (id: string | null) => set({ activeProjectId: id }),
      isCreateTaskOpen: false,
      setCreateTaskOpen: (open: boolean) => set({ isCreateTaskOpen: open }),
      createTaskProjectId: null,
      setCreateTaskProjectId: (id: string | null) => set({ createTaskProjectId: id }),
      lastSeenCount: 0,
      setLastSeenCount: (count: number) => set({ lastSeenCount: count }),
      
      // Appearance
      theme: 'light' as const,
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      
      // Auth
      currentUser: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        try {
          const res = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            return { success: false, message: 'Invalid email or password' };
          }

          const data = await res.json();
          const { token, ...user } = data;
          user.avatar = resolveImageUrl(user.avatar);
          
          // Authority: Always redirect to Dashboard on fresh login
          window.history.pushState({ page: 'dashboard' }, '', '/');
          set({ 
            currentUser: user, 
            token: token,
            isAuthenticated: true,
            currentPage: 'dashboard'
          });
          
          get().initializeSocket();
          return { success: true, message: 'Login successful' };
        } catch (error) {
          console.error('Login error:', error);
          return { success: false, message: 'System connection failed' };
        }
      },
      
      logout: () => {
        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance = null;
        }
        set({ currentUser: null, token: null, isAuthenticated: false, socket: null });
      },
      
      // Users
      users: [],
      
      addUser: async (userData) => {
        const newUserBody = {
          ...userData,
          status: 'active',
        };
        try {
          const res = await fetch(`${BACKEND_URL}/users`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(newUserBody),
          });
          if (!res.ok) throw new Error('Failed to add member to Database');
          const savedUser = await res.json();
          // Ensure ID is a string for the frontend
          savedUser.id = String(savedUser.id);
          set(state => ({ users: [...state.users, savedUser] }));
        } catch (error) {
          console.error('Error adding user:', error);
        }
      },
      
      updateUser: async (userId, updates) => {
        try {
          const res = await fetch(`${BACKEND_URL}/users/${userId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(updates),
          });

          if (!res.ok) throw new Error('Failed to update member in Database');
          
          const updatedUser = await res.json();
          updatedUser.id = String(updatedUser.id);
          updatedUser.avatar = resolveImageUrl(updatedUser.avatar);
          
          set(state => {
            const newUsers = state.users.map(u => String(u.id) === String(userId) ? updatedUser : u);
            const newCurrentUser = state.currentUser && String(state.currentUser.id) === String(userId) ? updatedUser : state.currentUser;
            return { users: newUsers, currentUser: newCurrentUser };
          });
          
          
        } catch (error) {
          console.error('Error updating user:', error);
        }
      },

      deleteUser: async (userId: string) => {
        try {
          const res = await fetch(`${BACKEND_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${get().token}`
            }
          });

          if (!res.ok) throw new Error('Failed to delete user');

          set(state => ({
            users: state.users.filter(u => String(u.id) !== String(userId))
          }));
        } catch (error) {
          console.error('Failed to delete user:', error);
        }
      },
      
      deactivateUser: (userId) => {
        set(state => ({
          users: state.users.map(u => u.id === userId ? { ...u, status: 'inactive' as const } : u),
        }));
      },

      resetPassword: async (email: string, password: string) => {
        try {
          // Tactical Alignment: Ensuring endpoint matches backend authentication recalibration hub
          const response = await fetch(`${BACKEND_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify({ email, password }),
          });
          
          if (response.ok) {
            toast.success("Credentials synchronized successfully");
            return true;
          }
          return false;
        } catch (error) {
          console.error("Failed to reset password:", error);
          toast.error("Credential synchronization failed");
          return false;
        }
      },
      
      // Tasks
      tasks: [],
      
      // Projects
      projects: [],
      
      addProject: async (projectData) => {
        const id = 'proj_' + generateId();
        const users = get().users;
        const newProjectBody = {
          ...projectData,
          id,
          members: projectData.members.map(m => m.id),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          const res = await fetch(`${BACKEND_URL}/projects`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(newProjectBody),
          });

          if (!res.ok) throw new Error('Failed to create project in Database');

          const savedProject = await res.json();
          savedProject.id = String(savedProject.id);
          const mappedProject: Project = {
            ...savedProject,
            members: savedProject.members.map((uid: string) => users.find(u => String(u.id) === String(uid))).filter(Boolean)
          };

          set(state => ({ projects: [...state.projects, mappedProject] }));
        } catch (error) {
          console.error('Error adding project:', error);
          throw error;
        }
      },
      
      addTask: async (taskData) => {
        const id = generateId();
        const newTaskBody = {
          ...taskData,
          id,
          assignees: taskData.assignees.map(a => a.id),
          createdBy: taskData.createdBy.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: (taskData.attachments || []).map(a => ({
            ...a,
            uploadedBy: a.uploadedBy.id
          })),
          comments: (taskData.comments || []).map(c => ({
            ...c,
            author: typeof c.author === 'object' ? c.author.id : c.author,
            attachment: (c as any).attachment ? {
              ...(c as any).attachment,
              uploadedBy: typeof (c as any).attachment.uploadedBy === 'object' ? (c as any).attachment.uploadedBy.id : (c as any).attachment.uploadedBy
            } : undefined,
            attachments: (c.attachments || []).map((a: any) => ({
              ...a,
              uploadedBy: typeof a.uploadedBy === 'object' ? a.uploadedBy.id : a.uploadedBy
            }))
          })),
        };

        try {
          const res = await fetch(`${BACKEND_URL}/tasks`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(newTaskBody),
          });

          if (!res.ok) throw new Error('Failed to create task in Database');

          const savedTask = await res.json();
          savedTask.id = String(savedTask.id);
          const users = get().users;
          const mappedTask: Task = {
            ...savedTask,
            assignees: savedTask.assignees.map((uid: any) => users.find(u => String(u.id) === String(uid))).filter(Boolean),
            createdBy: users.find(u => String(u.id) === String(savedTask.createdBy)) || users[0],
            attachments: (savedTask.attachments || []).map((a: any) => ({
              ...a,
              uploadedBy: users.find(u => String(u.id) === String(a.uploadedBy)) || users[0],
              url: resolveImageUrl(a.url)
            })),
            comments: (savedTask.comments || []).map((c: any) => ({
              ...c,
              author: users.find(u => u.id === (typeof c.author === 'object' ? c.author.id : c.author)) || users[0],
              attachment: c.attachment ? {
                ...c.attachment,
                uploadedBy: users.find(u => u.id === (typeof c.attachment.uploadedBy === 'object' ? c.attachment.uploadedBy.id : c.attachment.uploadedBy)) || users[0],
                url: resolveImageUrl(c.attachment.url)
              } : undefined,
              attachments: (c.attachments || []).map((a: any) => ({
                ...a,
                uploadedBy: users.find(u => u.id === (typeof a.uploadedBy === 'object' ? a.uploadedBy.id : a.uploadedBy)) || users[0],
                url: resolveImageUrl(a.url)
              }))
            }))
          };

          set(state => ({ tasks: [...state.tasks, mappedTask] }));

          // Notifications are now handled by the backend on task creation
          return mappedTask;
        } catch (error) {
          console.error('Error adding task:', error);
          throw error;
        }
      },

      updateTask: async (taskId, updates) => {
        try {
          const users = get().users;
          
          // Optimistic local update with proper user mapping for comments
          set(state => {
            const users = state.users;
            const UNKNOWN_USER: User = { id: 'unknown', name: 'Unknown User', email: '', avatar: '', role: 'User', department: '', status: 'inactive' };
            
            const mapComments = (comments: any[]) => (comments || []).map(c => ({
              ...c,
              author: typeof c.author === 'object' ? c.author : (users.find(u => String(u.id) === String(c.author)) || UNKNOWN_USER)
            }));

            const mappedUpdates = { ...updates };
            if (updates.comments) {
              mappedUpdates.comments = mapComments(updates.comments);
            }

            return {
              tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...mappedUpdates } : t),
              selectedTask: state.selectedTask?.id === taskId ? { ...state.selectedTask, ...mappedUpdates } : state.selectedTask
            };
          });

          const backendUpdates: any = { 
            ...updates,
            updatedBy: get().currentUser?.id || 'system'
          };
          if (updates.assignees) backendUpdates.assignees = updates.assignees.map(a => a.id);
          if (updates.createdBy) backendUpdates.createdBy = typeof updates.createdBy === 'object' ? updates.createdBy.id : updates.createdBy;
          if (updates.attachments) {
            backendUpdates.attachments = updates.attachments.map((a: any) => ({
              ...a,
              uploadedBy: typeof a.uploadedBy === 'object' ? a.uploadedBy.id : a.uploadedBy
            }));
          }
          if (updates.comments) {
            backendUpdates.comments = updates.comments.map((c: any) => ({
              ...c,
              author: typeof c.author === 'object' ? c.author.id : c.author,
              attachment: c.attachment ? {
                ...c.attachment,
                uploadedBy: typeof c.attachment.uploadedBy === 'object' ? c.attachment.uploadedBy.id : c.attachment.uploadedBy
              } : undefined,
              attachments: (c.attachments || []).map((a: any) => ({
                ...a,
                uploadedBy: typeof a.uploadedBy === 'object' ? a.uploadedBy.id : a.uploadedBy
              }))
            }));
          }
          
          const res = await fetch(`${BACKEND_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(backendUpdates),
          });

          if (!res.ok) throw new Error('Failed to update task');
          
          const updatedTaskFromDB = await res.json();
          const mappedTask: Task = {
            ...updatedTaskFromDB,
            assignees: updatedTaskFromDB.assignees.map((uid: string) => users.find(u => u.id === uid)).filter(Boolean),
            createdBy: users.find(u => u.id === updatedTaskFromDB.createdBy) || users[0],
            updatedBy: users.find(u => u.id === updatedTaskFromDB.updatedBy) || users[0],
            attachments: (updatedTaskFromDB.attachments || []).map((a: any) => ({
              ...a,
              uploadedBy: users.find(u => u.id === a.uploadedBy) || users[0],
              url: resolveImageUrl(a.url)
            })),
            comments: (updatedTaskFromDB.comments || []).map((c: any) => ({
              ...c,
              author: users.find(u => u.id === (typeof c.author === 'object' ? c.author.id : c.author)) || users[0],
              attachment: c.attachment ? {
                ...c.attachment,
                uploadedBy: users.find(u => u.id === (typeof c.attachment.uploadedBy === 'object' ? c.attachment.uploadedBy.id : c.attachment.uploadedBy)) || users[0],
                url: resolveImageUrl(c.attachment.url)
              } : undefined,
              attachments: (c.attachments || []).map((a: any) => ({
                ...a,
                uploadedBy: users.find(u => u.id === (typeof a.uploadedBy === 'object' ? a.uploadedBy.id : a.uploadedBy)) || users[0],
                url: resolveImageUrl(a.url)
              }))
            }))
          };

          set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? mappedTask : t),
            selectedTask: state.selectedTask?.id === taskId ? mappedTask : state.selectedTask
          }));
        } catch (error) {
          console.error('Error updating task:', error);
        }
      },

      deleteTask: async (taskId) => {
        try {
          const res = await fetch(`${BACKEND_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${get().token}`
            }
          });

          if (!res.ok) throw new Error('Failed to delete task from Database');

          set(state => ({
            tasks: state.tasks.filter(t => t.id !== taskId),
          }));
        } catch (error) {
          console.error('Error deleting task:', error);
        }
      },
      
      moveTask: (taskId, newStatus) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (task) {
          get().updateTask(taskId, { status: newStatus });
          
          // Notifications are now handled by the backend on status change
        }
      },

      archiveTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (task) {
          await get().updateTask(taskId, { archived: true });
        }
      },

      unarchiveTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (task) {
          await get().updateTask(taskId, { archived: false });
        }
      },

      deleteComment: async (taskId, commentId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (task && task.comments) {
          const updatedComments = task.comments.filter(c => c.id !== commentId);
          await get().updateTask(taskId, { comments: updatedComments });
        }
      },
      deleteAttachment: async (taskId, attachmentId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (task && task.attachments) {
          const updatedAttachments = task.attachments.filter(a => a.id !== attachmentId);
          await get().updateTask(taskId, { attachments: updatedAttachments });
        }
      },
      receiveNewComment: (taskId: string, rawComment: any) => {
        const users = get().users;
        const UNKNOWN_USER: User = { 
          id: 'unknown', 
          name: 'Unknown User', 
          email: '', 
          avatar: '', 
          role: 'User', 
          department: '', 
          status: 'inactive' 
        };

        // Resolve author ID whether it's an object or a string
        const authorId = typeof rawComment.author === 'object' ? rawComment.author.id : rawComment.author;
        const normalizedId = String(authorId);

        const mappedComment = {
          ...rawComment,
          id: String(rawComment.id),
          author: users.find(u => String(u.id) === normalizedId) || UNKNOWN_USER,
          attachments: (rawComment.attachments || []).map((a: any) => ({
            ...a,
            url: resolveImageUrl(a.url)
          }))
        };

        set(state => {
          const updatedTasks = state.tasks.map(t => {
            if (String(t.id) === String(taskId)) {
              // Avoid duplicate comments if we sent it ourselves
              if (t.comments?.some(c => String(c.id) === String(mappedComment.id))) {
                return t;
              }
              return { ...t, comments: [...(t.comments || []), mappedComment] };
            }
            return t;
          });

          let updatedSelectedTask = state.selectedTask;
          if (state.selectedTask && String(state.selectedTask.id) === String(taskId)) {
            if (!state.selectedTask.comments?.some(c => String(c.id) === String(mappedComment.id))) {
              updatedSelectedTask = { 
                ...state.selectedTask, 
                comments: [...(state.selectedTask.comments || []), mappedComment] 
              };
            }
          }

          return { tasks: updatedTasks, selectedTask: updatedSelectedTask };
        });
      },
      
      getTasksByUser: (userId) => {
        return get().tasks.filter(t => 
          t.assignees.some(a => String(a.id) === String(userId)) || String(t.createdBy?.id) === String(userId)
        );
      },
      
      getTasksByStatus: (status) => {
        return get().tasks.filter(t => t.status === status);
      },
      
      // Notifications
      notifications: initialNotifications,
      
      fetchNotifications: async () => {
        const userId = get().currentUser?.id;
        if (!userId) return;
        try {
          const res = await fetch(`${BACKEND_URL}/notifications?userId=${userId}`, {
            headers: {
              'Authorization': `Bearer ${get().token}`
            }
          });
          if (res.ok) {
            const rawNotifications = await res.json();
            const users = get().users;
            const mapped = rawNotifications.map((n: any) => ({
              ...n,
              id: String(n.id),
              userId: String(n.userId),
              read: Boolean(n.read),
              actor: users.find(u => String(u.id) === String(n.actorId))
            }));
            set({ notifications: mapped });
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      },

      addNotification: async (notificationData) => {
        const id = generateId();
        const fullData = {
          ...notificationData,
          id,
          createdAt: new Date().toISOString(),
          actorId: notificationData.actor?.id
        };
        try {
          const res = await fetch(`${BACKEND_URL}/notifications`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(fullData),
          });
          if (res.ok) {
            const saved = await res.json();
            
            // Real-Time Tactical Feedback
            const currentUserId = get().currentUser?.id;
            if (String(saved.userId) === String(currentUserId)) {
              toast.info("Mission Update", {
                description: saved.message,
                duration: 5000,
              });
            }
            
            set(state => ({ notifications: [saved, ...state.notifications] }));
          }
        } catch (error) {
          console.error('Error adding notification:', error);
        }
      },
      
      markNotificationAsRead: async (notificationId) => {
        try {
          await fetch(`${BACKEND_URL}/notifications/${notificationId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify({ read: true }),
          });
          set(state => ({
            notifications: state.notifications.map(n => 
              n.id === notificationId ? { ...n, read: true } : n
            ),
          }));
        } catch (error) {
          console.error('Error marking notification read:', error);
        }
      },
      
      markAllNotificationsAsRead: async () => {
        const userId = get().currentUser?.id;
        if (!userId) return;
        try {
           // This would normally be a bulk update on backend
           set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
          }));
        } catch (error) {
          console.error('Error marking all read:', error);
        }
      },
      
      removeNotification: async (notificationId: string) => {
        try {
          await fetch(`${BACKEND_URL}/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${get().token}`
            }
          });
          set(state => ({
            notifications: state.notifications.filter(n => n.id !== notificationId)
          }));
        } catch (error) {
          console.error('Error removing notification:', error);
        }
      },
      
      getUnreadCount: () => {
        const userId = get().currentUser?.id;
        if (!userId) return 0;
        return get().notifications.filter(n => String(n.userId) === String(userId) && !n.read).length;
      },
      
      // Chat
      channels: initialChannels,
      directMessages: [],
      messages: initialMessages,
      
      addMessage: (messageData) => {
        const newMessage: Message = {
          ...messageData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set(state => ({ messages: [...state.messages, newMessage] }));
      },
      
      // Stats
      getUserStats: (userId) => {
        const userTasks = get().getTasksByUser(userId);
        const today = new Date().toISOString().split('T')[0];
        
        return {
          totalTasks: userTasks.length,
          todoTasks: userTasks.filter(t => t.status === 'todo').length,
          inProgressTasks: userTasks.filter(t => t.status === 'in-progress').length,
          testingTasks: userTasks.filter(t => t.status === 'testing').length,
          completedTasks: userTasks.filter(t => t.status === 'completed').length,
          overdueTasks: userTasks.filter(t => 
            t.status !== 'completed' && t.dueDate && t.dueDate < today
          ).length,
        };
      },

      socket: null,
      initializeSocket: () => {
        if (socketInstance) return;
        
        const userId = get().currentUser?.id;
        if (!userId) return;

        socketInstance = io(BASE_DOMAIN, {
          transports: ['websocket'],
          query: { userId }
        });

        socketInstance.on('task_updated', (updatedTask: any) => {
          const users = get().users;
          const UNKNOWN_USER: User = { id: 'unknown', name: 'Unknown User', email: '', avatar: '', role: 'User', department: '', status: 'inactive' };
          
          const mappedTask: Task = {
            ...updatedTask,
            assignees: (updatedTask.assignees || []).map((uid: any) => users.find(u => String(u.id) === String(uid))).filter(Boolean),
            createdBy: users.find(u => String(u.id) === String(updatedTask.createdBy)) || UNKNOWN_USER,
            updatedAt: new Date().toISOString() // Force re-sort
          };

          set(state => ({
            tasks: state.tasks.find(t => t.id === mappedTask.id)
              ? state.tasks.map(t => t.id === mappedTask.id ? mappedTask : t)
              : [...state.tasks, mappedTask]
          }));
          
          // Trigger dynamic feedback if assigned to current operative
          if (mappedTask.assignees.some(a => String(a.id) === String(userId))) {
            toast.info("Mission Assigned", {
              description: `New tactical mission: ${mappedTask.title}`,
              duration: 5000,
            });
          }
        });

        socketInstance.on('new_notification', (notification: any) => {
          set(state => ({ notifications: [notification, ...state.notifications] }));
        });

        set({ socket: socketInstance });
      },

      fetchInitialData: async () => {
        // Guard: do not fetch if not authenticated
        if (!get().token || !get().isAuthenticated) return;

        try {
          const [usersRes, tasksRes, projectsRes, notificationsRes] = await Promise.all([
            fetch(`${BACKEND_URL}/users`, { headers: { 'Authorization': `Bearer ${get().token}` } }),
            fetch(`${BACKEND_URL}/tasks`, { headers: { 'Authorization': `Bearer ${get().token}` } }),
            fetch(`${BACKEND_URL}/projects`, { headers: { 'Authorization': `Bearer ${get().token}` } }),
            get().currentUser ? fetch(`${BACKEND_URL}/notifications?userId=${get().currentUser?.id}`, { headers: { 'Authorization': `Bearer ${get().token}` } }) : Promise.resolve(null)
          ]);

          const usersData = usersRes.ok ? await usersRes.json() : [];
          const tasksData = tasksRes.ok ? await tasksRes.json() : [];
          const projectsData = projectsRes.ok ? await projectsRes.json() : [];

          const users: User[] = (Array.isArray(usersData) ? usersData : []).map((u: any) => ({ 
            ...u, 
            id: String(u.id),
            avatar: resolveImageUrl(u.avatar)
          }));
          const rawTasks: any[] = (Array.isArray(tasksData) ? tasksData : []).map((t: any) => ({ ...t, id: String(t.id) }));
          const rawProjects: any[] = (Array.isArray(projectsData) ? projectsData : []).map((p: any) => ({ ...p, id: String(p.id) }));
          let notifications: Notification[] = [];
          
          if (notificationsRes && notificationsRes.ok) {
            const rawNotifications = await notificationsRes.json();
            notifications = (Array.isArray(rawNotifications) ? rawNotifications : []).map((n: any) => ({
              ...n,
              id: String(n.id),
              userId: String(n.userId),
              read: Boolean(n.read),
              actor: users.find(u => String(u.id) === String(n.actorId))
            }));
          }

          const UNKNOWN_USER: User = { 
            id: 'unknown', 
            name: 'Unknown User', 
            email: '', 
            avatar: '', 
            role: 'User', 
            department: '', 
            status: 'inactive' 
          };

          const mappedTasks = rawTasks.map(task => {
            const assignees = (task.assignees || []).map((uid: any) => users.find(u => String(u.id) === String(uid))).filter(Boolean);
            return {
              ...task,
              assignees,
              createdBy: users.find(u => String(u.id) === String(task.createdBy)) || UNKNOWN_USER,
              attachments: (task.attachments || []).map((a: any) => ({
                ...a,
                uploadedBy: users.find(u => String(u.id) === String(a.uploadedBy)) || UNKNOWN_USER,
                url: resolveImageUrl(a.url)
              })),
              comments: (task.comments || []).map((c: any) => ({
                ...c,
                author: users.find(u => String(u.id) === String(typeof c.author === 'object' ? c.author.id : c.author)) || UNKNOWN_USER,
              }))
            };
          });

          const mappedProjects = rawProjects.map(p => ({
            ...p,
            members: (p.members || []).map((uid: any) => users.find(u => String(u.id) === String(uid))).filter(Boolean)
          }));

          set({ users, tasks: mappedTasks, projects: mappedProjects, notifications });
          
          if (get().currentUser && !socketInstance) {
            get().initializeSocket();
          }
        } catch (error) {
          console.error('Error fetching initial data:', error);
        }
      },

    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ 
        currentUser: state.currentUser, 
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme
      }),
    }
  )
);
