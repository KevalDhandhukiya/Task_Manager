import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Paperclip,
  Smile,
  ImageIcon,
  MessageSquare,
  FileText,
  AtSign,
  Bold,
  Italic,
  List,
  Link,
  AlertCircle,
  Download,
  Check,
  Code,
  Eye,
  Trash2,
  X,
  Send,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, BACKEND_URL, resolveImageUrl } from "@/store/appStore";
import type { Page } from "@/App";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import { formatFullDateTime, formatDateMMDDYYYY } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskWorkspaceProps {
  task: Task;
  onNavigate: (page: Page, task?: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  "in-progress": "bg-orange-500 text-white font-bold shadow-sm",
  testing: "bg-blue-500 text-white font-bold shadow-sm",
  completed: "bg-green-500 text-white font-bold shadow-sm",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "TO DO",
  "in-progress": "IN PROGRESS",
  testing: "TESTING",
  completed: "COMPLETED",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-50 text-blue-500",
  high: "bg-orange-50 text-orange-600",
};

export function TaskWorkspace({ task }: TaskWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("discussion");
  const [comment, setComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentUser,
    updateTask,
    moveTask,
    users,
    deleteComment,
    deleteAttachment,
    deleteTask,
  } = useAppStore();

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(task.title);
  const editorRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "discussion") {
      scrollToBottom();
    }
  }, [task.comments?.length, activeTab]);

  // High-Fidelity Content Sync Hub
  useEffect(() => {
    if (editorRef.current && !isEditingDescription) {
      editorRef.current.innerHTML = task.description || "";
    }
    if (!isEditingTitle) {
      setTitleInput(task.title);
    }
  }, [task.description, task.title, isEditingDescription, isEditingTitle]);

  const handleTitleSubmit = () => {
    if (titleInput.trim() && titleInput !== task.title) {
      updateTask(task.id, { title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleInput(task.title);
      setIsEditingTitle(false);
    }
  };

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);


  const handleAddComment = () => {
    if ((!comment.trim() && pendingAttachments.length === 0) || !currentUser)
      return;

    const updateData: Partial<Task> = {
      comments: [
        ...(task.comments || []),
        {
          id: Date.now().toString(),
          author: currentUser.id as any,
          content: comment.trim(),
          createdAt: new Date().toISOString(),
          attachments:
            pendingAttachments.length > 0 ? pendingAttachments : undefined,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    if (pendingAttachments.length > 0) {
      updateData.attachments = [
        ...(task.attachments || []),
        ...pendingAttachments,
      ];
    }

    updateTask(task.id, updateData);
    setComment("");
    setPendingAttachments([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && currentUser) {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch(
            `${BACKEND_URL}/upload`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${useAppStore.getState().token}`
              },
              body: formData,
            },
          );

          if (!res.ok) throw new Error("File upload protocol failed");

          const data = await res.json();
          // Authority: Ensure absolute URL mapping
          const absoluteUrl = resolveImageUrl(data.url);

          const newAttachment = {
            id: `att-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            name: file.name,
            url: absoluteUrl,
            type: file.type.includes("image") ? "image" : "pdf",
            size: (file.size / 1024).toFixed(1) + " KB",
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser,
          };

          setPendingAttachments((prev) => [...prev, newAttachment]);
        } catch (error) {
          console.error("Transmission Error:", error);
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const insertEmoji = (emoji: string) => {
    setComment((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const insertMention = (userName: string) => {
    setComment((prev) => prev + "@" + userName + " ");
    setShowMentionList(false);
    setMentionSearch("");
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Resolve to absolute URL if necessary, but IGNORE session-locked blobs
      if (url.startsWith("blob:")) {
        window.open(url, "_blank");
        return;
      }

      const absoluteUrl = url.startsWith("http")
        ? url
        : `${BACKEND_URL.replace('/api', '')}${url.startsWith("/") ? "" : "/"}${url}`;

      const response = await fetch(absoluteUrl, {
        headers: {
          "Authorization": `Bearer ${useAppStore.getState().token}`
        }
      });
      if (!response.ok)
        throw new Error("Resource not available on tactical server");

      const blob = await response.json().catch(() => response.blob());
      const downloadUrl = window.URL.createObjectURL(
        blob instanceof Blob ? blob : new Blob([JSON.stringify(blob)]),
      );
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Tactical Retrieval Error:", error);
      // Fallback to direct navigation if binary-fetch is blocked
      window.open(url, "_blank");
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    moveTask(task.id, newStatus);
  };

  const renderComment = (content: string) => {
    const parts = content.split(/(@[\w\s]+?)(?=\s|$|[,.!?])/);
    return parts.map((part, i) => {
      if (part && part.startsWith("@")) {
        return (
          <span
            key={i}
            className="text-black font-bold bg-black/5 px-1.5 py-0.5 rounded-md"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const applyFormat = (e: React.MouseEvent, format: string) => {
    e.preventDefault(); // Maintain authoritative focus in the deployment hub
    
    // Mission Reality Check: Ensure edit mode is active before execution
    if (!isEditingDescription) {
      setIsEditingDescription(true);
    }

    // Direct Focus Enforcement: Commands require active focus on the target node
    if (editorRef.current) {
      editorRef.current.focus();
    }

    // Structural Directive Mapping Hub
    switch (format) {
      case "Bold":
        document.execCommand("bold", false);
        break;
      case "Italic":
        document.execCommand("italic", false);
        break;
      case "List":
        document.execCommand("insertUnorderedList", false);
        break;
      case "Code":
        document.execCommand("formatBlock", false, "pre");
        break;
      case "Link": {
        const url = prompt("Enter Tactical URL:");
        if (url) document.execCommand("createLink", false, url);
        break;
      }
      default:
        document.execCommand(format.toLowerCase(), false);
    }
  };

  const handleDescriptionChange = () => {
    // Local capture only, persistence requires explicit operative authorization
    if (!editorRef.current) return;
  };

  const saveDescription = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    if (html !== task.description) {
      updateTask(task.id, { description: html });
    }
    setIsEditingDescription(false);
  };

  const cancelDescriptionEdit = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = task.description || "";
    }
    setIsEditingDescription(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Task Details */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
          {/* Title and Meta */}
          <div className="mb-6">
            <div className="group relative">
              {isEditingTitle ? (
                <div className="mb-4 animate-in fade-in zoom-in-95 duration-200">
                  <Input
                    ref={titleInputRef}
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={handleTitleKeyDown}
                    className="text-2xl font-bold text-gray-900 h-auto py-1 px-2 -ml-2 border-none ring-0 focus:ring-0 focus:border-black bg-black/5 rounded-lg transition-all"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Press Enter to save</span>
                    <span className="text-gray-200">•</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Esc to cancel</span>
                  </div>
                </div>
              ) : (
                <h1 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-2xl font-bold text-gray-900 mb-4 cursor-text hover:bg-black/5 -ml-2 px-2 py-1 rounded-lg transition-all border border-transparent hover:border-black/5 group-hover:text-black flex items-center gap-3"
                  title="Click to rename"
                >
                  {task.title}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge
                    className={`${statusColors[task.status]} font-medium cursor-pointer hover:opacity-80 transition-all border-none`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        task.status === "in-progress"
                          ? "bg-white"
                          : task.status === "completed"
                            ? "bg-white"
                            : task.status === "testing"
                              ? "bg-white"
                              : "bg-gray-500"
                      }`}
                    />
                    {statusLabels[task.status]}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[200px] p-2 rounded-2xl shadow-2xl border-gray-100"
                >
                  <div className="px-3 py-2 mb-1 border-b border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </p>
                  </div>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleStatusChange(key as TaskStatus)}
                      className={`w-full text-left px-3 py-2 text-[11px] font-medium uppercase tracking-widest transition-all flex items-center gap-3 rounded-xl cursor-pointer ${
                        task.status === key
                          ? "bg-black/5 text-black font-bold"
                          : "text-gray-500 hover:text-black hover:bg-black/5"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ring-4 ring-transparent transition-all ${
                          key === "in-progress"
                            ? "bg-orange-500"
                            : key === "completed"
                              ? "bg-green-500"
                              : key === "testing"
                                ? "bg-blue-500"
                                : "bg-gray-400"
                        }`}
                      />
                      {label}
                      {task.status === key && (
                        <Check className="w-4 h-4 ml-auto text-black stroke-[3]" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge
                    className={`${priorityColors[task.priority]} font-medium cursor-pointer hover:opacity-80 transition-all border-none`}
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {task.priority.toUpperCase()} PRIORITY
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[180px] p-2 rounded-2xl shadow-2xl border-gray-100"
                >
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Priority
                    </p>
                  </div>
                  {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => updateTask(task.id, { priority: p })}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                        task.priority === p
                          ? "bg-black/5 text-black font-bold"
                          : "text-gray-500 hover:text-black hover:bg-black/5"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          p === "low"
                            ? "bg-gray-400"
                            : p === "medium"
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                      />
                      <span className="capitalize">{p}</span>
                      {task.priority === p && (
                        <Check className="w-4 h-4 ml-auto text-black stroke-[3]" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Multi-Assignee Selection Hub */}
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-2.5 cursor-pointer hover:bg-black/5 px-2.5 py-1.5 rounded-xl transition-all group">
                      <div className="flex items-center -space-x-1.5">
                        {task.assignees.slice(0, 3).map((a) => (
                          <Avatar
                            key={a.id}
                            className="w-6 h-6 ring-2 ring-white shadow-sm transition-transform group-hover:scale-105"
                          >
                            <AvatarImage src={a.avatar} />
                            <AvatarFallback className="bg-black text-white text-[9px] font-bold">
                              {(a.name || "U")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-400">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                        {task.assignees.length === 0 && (
                          <div className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 bg-white">
                            <Plus className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-600 font-bold uppercase tracking-widest whitespace-nowrap">
                        {task.assignees.length === 0
                          ? "Add Assignee"
                          : task.assignees.length === 1
                            ? task.assignees[0].name
                            : `${task.assignees.length} Assignee`}
                      </span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[240px] rounded-2xl p-2 border-gray-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                        Assignee
                      </p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {users
                        .filter(
                          (u) => u.status === "active"
                        )
                        .map((user) => {
                          const isAssigned = task.assignees.some(
                            (a) => a.id === user.id,
                          );
                          return (
                            <DropdownMenuItem
                              key={user.id}
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => {
                                const newAssignees = isAssigned
                                  ? task.assignees.filter(
                                      (a) => a.id !== user.id,
                                    )
                                  : [...task.assignees, user];
                                updateTask(task.id, {
                                  assignees: newAssignees,
                                });
                              }}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-colors cursor-pointer mb-0.5 ${
                                isAssigned
                                  ? "bg-black/5 text-black"
                                  : "text-gray-500 hover:text-black hover:bg-black/5"
                              }`}
                            >
                              <div className="relative">
                                <Avatar className="w-7 h-7">
                                  <AvatarImage src={user.avatar} />
                                  <AvatarFallback className="text-[9px] bg-black text-white font-bold">
                                    {(user.name || "U")
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                {isAssigned && (
                                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                                    <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={isAssigned ? "font-bold" : ""}>
                                  {user.name || "Unknown Operative"}
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
                                  {user.role || "Operative"}
                                </span>
                              </div>
                              {isAssigned && (
                                <Check className="w-4 h-4 ml-auto text-black stroke-[3]" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div
                onClick={(e) => {
                  const input = e.currentTarget.querySelector("input");
                  if (input) (input as any).showPicker();
                }}
                className="relative flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl border border-gray-100 dark:border-white/5 transition-all text-gray-600 dark:text-gray-300 shadow-sm cursor-pointer group"
                title="Mission Start Date"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">Start:</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-black dark:group-hover:text-white transition-colors">
                    {formatDateMMDDYYYY(task.startDate || "") || "TBD"}
                  </span>
                </div>
                <input
                  type="date"
                  value={task.startDate || ""}
                  onChange={(e) =>
                    updateTask(task.id, { startDate: e.target.value })
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>

              <div
                onClick={(e) => {
                  const input = e.currentTarget.querySelector("input");
                  if (input) (input as any).showPicker();
                }}
                className="relative flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl border border-gray-100 dark:border-white/5 transition-all text-gray-600 dark:text-gray-300 shadow-sm cursor-pointer group"
                title="Mission Deadline"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">Due:</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-black dark:group-hover:text-white transition-colors">
                    {formatDateMMDDYYYY(task.dueDate) || "No Date"}
                  </span>
                </div>
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) =>
                    updateTask(task.id, { dueDate: e.target.value })
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              
              <button
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
                    await deleteTask(task.id);
                  }
                }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"
                title="Delete Mission"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {[
                  { icon: Bold, label: "Bold" },
                  { icon: Italic, label: "Italic" },
                  { icon: List, label: "List" },
                  { icon: Code, label: "Code" },
                  { icon: Link, label: "Link" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => applyFormat(e, label)}
                    className="p-1.5 rounded text-gray-600 hover:bg-black/5 transition-colors group"
                    title={label}
                  >
                    <Icon className="w-4 h-4 transition-transform group-active:scale-95" />
                  </button>
                ))}
              </div>

              {isEditingDescription && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                  <button
                    onClick={cancelDescriptionEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={saveDescription}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white hover:bg-gray-800 rounded-xl shadow-lg shadow-black/10 transition-all text-[10px] font-bold uppercase tracking-[0.1em]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            <div
              className={`prose prose-sm max-w-none text-gray-700 p-2 -m-2 rounded-xl transition-all ${!isEditingDescription ? "hover:bg-black/5 cursor-text" : "bg-white ring-1 ring-black/5 shadow-sm"} tactical-prose`}
              onClick={() =>
                !isEditingDescription && setIsEditingDescription(true)
              }
            >
              <div
                ref={editorRef}
                contentEditable={isEditingDescription}
                onInput={handleDescriptionChange}
                className="w-full min-h-[160px] outline-none font-sans leading-relaxed text-sm text-gray-700 placeholder:text-gray-400 prose-p:my-1 prose-ul:my-1 prose-strong:font-black"
                onFocus={() =>
                  !isEditingDescription && setIsEditingDescription(true)
                }
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider mb-3">
              Assignees
            </h3>
            <div className="flex gap-2">
              {task.assignees.map((assignee) => (
                <div
                  key={assignee.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={assignee.avatar} />
                    <AvatarFallback className="bg-black text-white text-[10px]">
                      {(assignee.name || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{assignee.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Tabs */}
        <div className="w-96 border-l border-gray-200 bg-gray-50/50 flex flex-col h-full">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col h-full min-h-0"
          >
            <TabsList className="w-full justify-start rounded-none border-b border-gray-200 bg-white p-0 h-12">
              <TabsTrigger
                value="discussion"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none"
              >
                Discussion ({task.comments?.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none"
              >
                Files ({task.attachments?.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none"
              >
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="discussion"
              className="flex-1 m-0 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
                {/* Comments */}
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.author?.avatar} />
                        <AvatarFallback className="bg-black text-white text-xs">
                          {(comment.author?.name || "Unknown")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 group/comment relative">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.author?.name || "Unknown"}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">
                              {formatFullDateTime(comment.createdAt)}
                            </span>
                            {comment.author.id === currentUser?.id && (
                              <button
                                onClick={() =>
                                  deleteComment(task.id, comment.id)
                                }
                                className="opacity-0 group-hover/comment:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 text-gray-300 rounded transition-all"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {comment.content && (
                          <p className="text-sm text-gray-700 leading-relaxed font-medium">
                            {renderComment(comment.content)}
                          </p>
                        )}
                        {/* Legacy & Modern Attachment Rendering Platform */}
                        {(() => {
                          const allAttachments: any[] = [];

                          // Capture pluralized attachments array
                          const pluralArr = (comment as any).attachments;
                          if (Array.isArray(pluralArr)) {
                            allAttachments.push(...pluralArr);
                          }

                          // Capture legacy singular attachment
                          const singularObj = (comment as any).attachment;
                          if (
                            singularObj &&
                            !allAttachments.some((a) => a.id === singularObj.id)
                          ) {
                            allAttachments.push(singularObj);
                          }

                          return (
                            allAttachments.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {allAttachments.map(
                                  (attachment: any, idx: number) => (
                                    <div
                                      key={attachment.id || idx}
                                      onClick={() => {
                                        if (attachment?.url) {
                                          const url = attachment.url;
                                          const absoluteUrl =
                                            url.startsWith("http") ||
                                            url.startsWith("blob:")
                                              ? url
                                              : `${BACKEND_URL.replace('/api', '')}${url.startsWith("/") ? "" : "/"}${url}`;
                                          window.open(absoluteUrl, "_blank");
                                        }
                                      }}
                                      className="p-2 bg-gray-100 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 group/attachment cursor-pointer hover:bg-gray-200 dark:hover:bg-black/30 transition-all shadow-sm"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white dark:bg-[#1A1A1A] rounded-lg flex items-center justify-center shadow-sm">
                                          {attachment.type === "pdf" ? (
                                            <FileText className="w-4 h-4 text-red-500" />
                                          ) : (
                                            <ImageIcon className="w-4 h-4 text-blue-500" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-bold text-gray-900 dark:text-gray-200 truncate">
                                            {attachment.name}
                                          </p>
                                          <p className="text-[8px] text-gray-400 font-medium tracking-wide">
                                            {attachment.size}
                                          </p>
                                        </div>
                                      </div>
                                      {attachment.uploadedBy?.id ===
                                        currentUser?.id && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteAttachment(
                                              task.id,
                                              attachment.id,
                                            );
                                          }}
                                          className="p-1 px-1.5 opacity-0 group-hover/attachment:opacity-100 bg-white/50 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-all"
                                          title="Delete attachment"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            )
                          );
                        })()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">
                      No tactical discussion yet
                    </p>
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddComment();
                  }}
                  className="mt-auto border-t border-gray-100 bg-white p-4"
                >
                  {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {pendingAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded-xl group/attachment hover:border-black/10 transition-all max-w-[200px]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-50 flex-shrink-0">
                            {att.type === "pdf" ? (
                              <FileText className="w-4 h-4 text-red-500" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-900 truncate">
                              {att.name}
                            </p>
                            <p className="text-[8px] font-medium text-gray-400">
                              {att.size}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAttachments((prev) =>
                                prev.filter((p) => p.id !== att.id),
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all ml-auto"
                          >
                            <AlertCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder="Type a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    className="border-0 focus-visible:ring-0 px-0 mb-2 font-medium"
                  />
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        multiple
                      />
                      <button
                        type="button"
                        onClick={triggerFileUpload}
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-black transition-all"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-black transition-all"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 z-50 grid grid-cols-5 gap-2 w-48">
                            {[
                              "👍",
                              "🔥",
                              "🚀",
                              "✅",
                              "❤️",
                              "👀",
                              "💡",
                              "🎉",
                              "👏",
                              "🙌",
                            ].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => insertEmoji(emoji)}
                                className="text-xl hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowMentionList(!showMentionList)}
                          className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-black transition-all"
                        >
                          <AtSign className="w-4 h-4" />
                        </button>
                        {showMentionList && (
                          <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 w-64">
                            <div className="p-3 bg-gray-50 border-b border-gray-100">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                                Mention Team Member
                              </p>
                              <Input
                                placeholder="Search member..."
                                value={mentionSearch}
                                onChange={(e) =>
                                  setMentionSearch(e.target.value)
                                }
                                className="h-9 text-xs border-gray-200 focus:ring-black/10 focus:border-black/30"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {users
                                .filter((u) =>
                                  u.name
                                    .toLowerCase()
                                    .includes(mentionSearch.toLowerCase()),
                                )
                                .map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => insertMention(u.name)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 text-left transition-colors"
                                  >
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={u.avatar} />
                                      <AvatarFallback className="bg-black/10 text-black text-[10px] font-medium">
                                        {u.name[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-gray-700">
                                      {u.name}
                                    </span>
                                  </button>
                                ))}
                              {users.filter((u) =>
                                u.name
                                  .toLowerCase()
                                  .includes(mentionSearch.toLowerCase()),
                              ).length === 0 && (
                                <p className="p-4 text-[10px] text-gray-400 text-center font-medium uppercase tracking-widest">
                                  No matching members
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      type="submit"
                      className="bg-black text-white"
                      disabled={
                        !comment.trim() && pendingAttachments.length === 0
                      }
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
            </TabsContent>

            <TabsContent
              value="files"
              className="flex-1 m-0 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
                {task.attachments && task.attachments.length > 0 ? (
                  <>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
                      Attachments
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {task.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="group relative bg-white border border-gray-200 rounded-2xl p-4 hover:border-black/30 transition-all shadow-sm hover:shadow-xl hover:shadow-black/5"
                        >
                          <div className="w-full h-24 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center mb-3 relative overflow-hidden">
                            {attachment.type === "pdf" ? (
                              <FileText className="w-10 h-10 text-red-500" />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-black" />
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(attachment.url, "_blank");
                                }}
                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all group/btn hover:scale-110 active:scale-95 shadow-lg"
                                title="Preview Task File"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(
                                    attachment.url,
                                    attachment.name,
                                  );
                                }}
                                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all shadow-lg"
                                title="Download to Local"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                              {attachment.uploadedBy?.id ===
                                currentUser?.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAttachment(task.id, attachment.id);
                                  }}
                                  className="w-10 h-10 bg-white hover:bg-red-500 rounded-full flex items-center justify-center text-red-500 hover:text-white transition-all shadow-lg hover:scale-110 active:scale-95"
                                  title="Delete Task Attachment"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 pr-6">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest leading-none">
                                {attachment.type}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-gray-200" />
                              <span className="text-[10px] font-medium text-gray-400 leading-none">
                                {attachment.size}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Paperclip className="w-12 h-12 mx-auto mb-3 text-gray-200 animate-pulse-soft" />
                    <p className="text-sm font-medium text-gray-400 tracking-tight">
                      No task files attached yet
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="m-0 p-6">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-100 before:via-gray-100 before:to-transparent">
                {/* Creation Event */}
                <div className="relative flex items-start gap-4 animate-in slide-in-from-left-2 duration-300">
                  <div className="relative z-10 w-10 h-10 bg-white border-2 border-indigo-50 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ring-4 ring-white">
                    <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 pt-1.5">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <p className="text-sm text-gray-600 font-medium">
                        <span className="font-medium text-gray-900">
                          {task.createdBy.name}
                        </span>
                        <span className="mx-1 opacity-60 text-gray-500">
                          created this task
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium text-indigo-600 bg-indigo-50/50 border-indigo-100 rounded-lg py-0 px-2 h-5"
                        >
                          CREATED
                        </Badge>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                          {formatFullDateTime(task.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Change Event */}
                {task.status !== "todo" && (
                  <div className="relative flex items-start gap-4 animate-in slide-in-from-left-2 duration-500">
                    <div className="relative z-10 w-10 h-10 bg-white border-2 border-purple-50 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ring-4 ring-white">
                      <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center">
                        <ArrowLeft className="w-3 h-3 text-white rotate-180" />
                      </div>
                    </div>
                    <div className="flex-1 pt-1.5">
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                        <p className="text-sm text-gray-600 font-medium">
                          {task.updatedBy && (
                            <span className="font-bold text-gray-900 mr-2">
                              {task.updatedBy.name}
                            </span>
                          )}
                          <span className="opacity-60">changed status to</span>
                          <span className="ml-1 text-purple-700 font-bold uppercase tracking-tight">
                            {statusLabels[task.status]}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium text-purple-600 bg-purple-50/50 border-purple-100 rounded-lg py-0 px-2 h-5"
                          >
                            STATUS CHANGE
                          </Badge>
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                            {formatFullDateTime(task.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
