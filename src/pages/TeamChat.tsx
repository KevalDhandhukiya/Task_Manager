import { useState, useRef, useEffect } from 'react';
import { 
  Hash, 
  Search, 
  Info, 
  Plus, 
  Send, 
  Paperclip, 
  Smile, 
  AtSign
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';

export function TeamChat() {
  const [activeChannel, setActiveChannel] = useState('1');
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { currentUser, users, channels, messages, addMessage } = useAppStore();

  if (!currentUser) return null;

  const activeChannelData = channels.find(c => c.id === activeChannel);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChannel]);

  const channelMessages = messages.filter(m => m.channelId === activeChannel);

  const handleSendMessage = () => {
    if (!message.trim() || !currentUser) return;

    addMessage({
      content: message.trim(),
      author: currentUser,
      channelId: activeChannel,
    });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get online/offline users
  const onlineUsers = users.filter(u => u.status === 'active').slice(0, 4);
  const offlineUsers = users.filter(u => u.status === 'inactive').slice(0, 2);

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Channels */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-medium text-sm">C</span>
            </div>
            <span className="font-medium text-gray-900">Cronabit</span>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">Channels</h3>
            <div className="space-y-0.5">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    activeChannel === channel.id
                      ? 'bg-black/5 text-black font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="flex-1 text-left">{channel.name}</span>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <Badge className="bg-black text-white text-xs px-1.5 py-0">
                      {channel.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="bg-black text-white text-xs">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-black border-2 border-white rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">
                {activeChannelData?.name}
              </span>
              <span className="text-sm text-gray-500">| {onlineUsers.length} members online</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search message history..."
                className="pl-10 w-64 h-9"
              />
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {channelMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Hash className="w-12 h-12 mb-3 text-gray-300" />
              <p>No messages yet in #{activeChannelData?.name}</p>
              <p className="text-sm mt-1">Be the first to send a message!</p>
            </div>
          ) : (
            channelMessages.map((msg) => {
              const isMe = msg.author.id === currentUser.id;
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={msg.author.avatar} />
                    <AvatarFallback className="bg-black text-white text-xs">
                      {msg.author.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-2xl ${isMe ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : ''}`}>
                      <span className="font-medium text-gray-900">{msg.author.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`inline-block text-left ${
                      isMe 
                        ? 'bg-black text-white px-4 py-2 rounded-2xl rounded-tr-sm shadow-md shadow-black/10' 
                        : 'bg-gray-100 text-gray-700 px-4 py-2 rounded-2xl rounded-tl-sm'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        {msg.reactions.map((reaction, idx) => (
                          <button key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm">
                            <span>{reaction.emoji}</span>
                            <span className="text-xs text-gray-600">{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 border-t border-gray-200"
        >
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
            <button 
              type="button"
              className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"
            >
              <Plus className="w-5 h-5" />
            </button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${activeChannelData?.name}...`}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0"
            />
            <div className="flex items-center gap-1">
              <button 
                type="button"
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button 
                type="button"
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button 
                type="button"
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-500"
              >
                <AtSign className="w-5 h-5" />
              </button>
            </div>
            <Button 
              type="submit"
              className="bg-black hover:bg-gray-900 text-white px-4 shadow-lg shadow-black/10"
              disabled={!message.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send, Shift + Enter for new line.
          </p>
        </form>
      </div>

      {/* Right Sidebar - Team Presence */}
      <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Team Presence</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
          {/* Online */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Online</h4>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-black rounded-full" />
                <span className="text-xs text-gray-500">{onlineUsers.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {onlineUsers.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-black text-white text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-black border-2 border-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {member.name} {member.id === currentUser.id && '(You)'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Offline */}
          {offlineUsers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Offline</h4>
                <span className="text-xs text-gray-500">{offlineUsers.length}</span>
              </div>
              <div className="space-y-2">
                {offlineUsers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 opacity-60">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-gray-400 text-white text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{member.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invite Button */}
        <div className="p-3 border-t border-gray-100">
          <Button variant="outline" className="w-full gap-2 border-gray-200">
            <Plus className="w-4 h-4" />
            Invite Teammates
          </Button>
        </div>
      </div>
    </div>
  );
}
