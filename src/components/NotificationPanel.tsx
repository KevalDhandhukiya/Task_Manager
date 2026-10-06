import { Bell, X, MessageCircle, RefreshCw, AtSign, User, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAppStore } from '@/store/appStore';

interface NotificationPanelProps {
  onClose: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task-assigned':
      return <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-indigo-600" /></div>;
    case 'comment':
      return <div className="w-8 h-8 bg-[#DBEAFE] rounded-full flex items-center justify-center"><MessageCircle className="w-4 h-4 text-blue-600" /></div>;
    case 'status-change':
      return <div className="w-8 h-8 bg-[#F3E8FF] rounded-full flex items-center justify-center"><RefreshCw className="w-4 h-4 text-purple-600" /></div>;
    case 'mention':
      return <div className="w-8 h-8 bg-[#FEF3C7] rounded-full flex items-center justify-center"><AtSign className="w-4 h-4 text-amber-600" /></div>;
    default:
      return <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><Bell className="w-4 h-4 text-gray-600" /></div>;
  }
};

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, currentUser, removeNotification } = useAppStore();
  
  // Authority: Filter only for the current operative and strictly assigned tasks
  const userNotifications = notifications.filter(n => 
    n.userId?.toString() === currentUser?.id?.toString() && 
    n.type === 'task-assigned'
  );
  const unreadNotifications = userNotifications.filter(n => !n.read);
 
  const handleMarkAllRead = () => {
    userNotifications.forEach(n => removeNotification(n.id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-50/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900 leading-tight">Activity Feed</h2>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && (
                <Badge className="bg-black text-white text-[9px] font-medium h-4 px-1.5 rounded-full border-none">{unreadNotifications.length} NEW</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadNotifications.length > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[9px] font-bold text-black hover:text-gray-900 uppercase tracking-[0.1em] px-2.5 py-1.5 h-8 bg-black/5 hover:bg-black/10 rounded-lg transition-all active:scale-95 whitespace-nowrap"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full w-full">
          <div className="p-0">
            {userNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Bell className="w-12 h-12 mb-3 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="pb-8">
                {/* Recent Activity (Unread) */}
                {unreadNotifications.length > 0 && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] leading-none opacity-40">
                        Recent Pulse
                      </h3>
                      <div className="h-px flex-1 ml-4 bg-black/5" />
                    </div>
                    <div className="space-y-4">
                      {unreadNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => removeNotification(notification.id)}
                          className="group relative flex gap-4 p-4 bg-black/[0.02] border border-black/5 rounded-2xl cursor-pointer hover:bg-black/5 hover:border-black/20 transition-all duration-300"
                        >
                          <div className="relative">
                            <Avatar className="w-12 h-12 border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                              <AvatarImage src={notification.actor?.avatar} />
                              <AvatarFallback className="bg-black text-white font-black text-xs">
                                {notification.actor?.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("") || "SY"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm font-bold text-gray-900 tracking-tight group-hover:text-black transition-colors">
                                {notification.title}
                              </p>
                              <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap bg-white px-2 py-0.5 rounded-lg border border-black/5 uppercase tracking-tighter">
                                {format(
                                  new Date(notification.createdAt),
                                  "dd MMM, h:mm a"
                                ).toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 font-medium opacity-80">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 bg-black rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] animate-pulse" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-1 rounded-md text-gray-300 hover:text-black hover:bg-black/5 transition-all opacity-0 group-hover:opacity-100"
                              title="Extract alert"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
}
