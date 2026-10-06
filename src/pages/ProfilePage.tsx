import { useState, useRef } from "react";
import {
  User,
  Shield,
  Camera,
  MapPin,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAppStore, BACKEND_URL } from "@/store/appStore";

const sidebarItems = [
  { id: "profile", label: "Profile Info", icon: User },
  { id: "security", label: "Security", icon: Shield },
];

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { currentUser, updateUser } = useAppStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!currentUser) return null;

  // Local form state
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    jobTitle: currentUser.jobTitle || "",
    location: currentUser.location || "",
    bio: currentUser.bio || "",
  });

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");



  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const updates: any = {
        name: formData.name,
        email: formData.email,
        jobTitle: formData.jobTitle,
        location: formData.location,
        bio: formData.bio,
      };

      if (password && password === confirmPassword) {
        updates.password = password;
      }

      await updateUser(currentUser.id, updates);
      setSaveStatus("success");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${useAppStore.getState().token}`
        },
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        await updateUser(currentUser.id, { avatar: data.url });
      }
    } catch (error) {
      console.error("Failed to upload avatar", error);
    } finally {
      setUploading(false);
    }
  };

  const hasChanges =
    formData.name !== currentUser.name ||
    formData.email !== currentUser.email ||
    formData.jobTitle !== (currentUser.jobTitle || "") ||
    formData.location !== (currentUser.location || "") ||
    formData.bio !== (currentUser.bio || "");

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-2xl shadow-gray-200/50 dark:shadow-none">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-10">
                Public Profile
              </h2>

              <div className="flex items-start gap-8 mb-10">
                <div className="relative">
                  <Avatar className="w-24 h-24 ring-4 ring-black/5">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-black text-white text-2xl font-bold">
                      {currentUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full animate-in fade-in duration-300">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </Avatar>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 border border-white/10"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-medium text-gray-900 dark:text-white uppercase tracking-tight">
                    {currentUser.name}
                  </h3>
                  {currentUser.jobTitle && (
                    <p className="text-gray-700 dark:text-gray-300 font-bold text-sm uppercase tracking-wider mt-0.5">
                      {currentUser.jobTitle}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-4">
                    <Badge
                      variant="secondary"
                      className="bg-gray-100/50 dark:bg-gray-800 text-gray-400 dark:text-gray-400 font-bold uppercase tracking-widest text-[11px] px-3"
                    >
                      {currentUser.department}
                    </Badge>
                    <Badge className="bg-black/5 text-black font-bold uppercase tracking-widest text-[11px] px-3 border-none">
                      <div className="w-1.5 h-1.5 bg-black rounded-full mr-2 animate-pulse" />
                      Active
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Full Name
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-none focus:ring-2 focus:ring-black/10 font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-none focus:ring-2 focus:ring-black/10 font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Job Title
                  </Label>
                  <Input
                    value={formData.jobTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, jobTitle: e.target.value })
                    }
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-none focus:ring-2 focus:ring-black/10 font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-none focus:ring-2 focus:ring-black/10 font-bold pl-12"
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Short Biography
                  </Label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    className="w-full h-32 px-5 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-none focus:ring-2 focus:ring-black/10 outline-none font-bold text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 mt-12">
                <Button
                  variant="ghost"
                  className="font-medium text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600"
                  onClick={() =>
                    setFormData({
                      name: currentUser.name,
                      email: currentUser.email,
                      jobTitle: currentUser.jobTitle || "",
                      location: currentUser.location || "",
                      bio: currentUser.bio || "",
                    })
                  }
                  disabled={!hasChanges}
                >
                  Discard Changes
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saveStatus === "saving"}
                  className="bg-black hover:bg-gray-900 text-white h-14 px-8 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-black/20"
                >
                  {saveStatus === "saving"
                    ? "Processing..."
                    : saveStatus === "success"
                      ? "Profile updated! ✅"
                      : "Save profile"}
                </Button>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-200/50 dark:shadow-none">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                    Security
                  </h2>
                </div>
                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-black/5 dark:border-white/5">
                  <Shield className="w-6 h-6 text-black dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pb-10 border-b border-gray-50 dark:border-gray-800">
                <div className="space-y-3">
                  <Label className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-none focus:ring-2 focus:ring-black/10 font-medium"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-4">
                    <div
                      className={`h-full bg-black rounded-full transition-all duration-500 ${password.length > 8 ? "w-full" : password.length > 4 ? "w-1/2" : password.length > 0 ? "w-1/4" : "w-0"}`}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-none focus:ring-2 focus:ring-black/10 font-medium"
                    />
                    <button
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 mt-10">
                {saveStatus === "success" && (
                  <div className="p-4 bg-black text-white rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest animate-in slide-in-from-bottom-2 duration-300">
                    <CheckCircle className="w-4 h-4 text-white" />
                    Password changed successfully
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-gray-400">
                    <CheckCircle
                      className={`w-4 h-4 ${password.length >= 8 ? "text-black" : "text-gray-200"}`}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                      Enforce 8+ characters
                    </span>
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={
                      !password ||
                      password !== confirmPassword ||
                      password.length < 8 ||
                      saveStatus === "saving"
                    }
                    className="bg-black hover:bg-gray-900 text-white h-14 px-10 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-black/20 active:scale-95 transition-all outline-none border border-white/10"
                  >
                    {saveStatus === "saving"
                      ? "Syncing..."
                      : saveStatus === "success"
                        ? "Updated! ✅"
                        : "Update password"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );



      default:
        return null;
    }
  };

  return (
    <div className="h-full flex bg-gray-50/50 dark:bg-[#030712]">
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-8 flex flex-col">
        <div className="mb-10 px-4" />

        <nav className="flex-1 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ${
                  isActive
                    ? "bg-black text-white shadow-xl shadow-black/20 translate-x-1"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-500 ${isActive ? "scale-110 rotate-3" : ""}`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-12 bg-gray-50/50 dark:bg-[#030712]">
        <div className="max-w-4xl mx-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
