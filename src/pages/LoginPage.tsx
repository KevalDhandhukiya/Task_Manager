import { useState } from "react";
import { useAppStore, BACKEND_URL } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<
    "request" | "verify" | "reset"
  >("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const { login } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError("Connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError("");
    setIsLoading(true);

    const endpoints = [
      `${BACKEND_URL}/forgot-password`,
      `${BACKEND_URL}/auth/forgot-password`,
      `${BACKEND_URL.replace("/api", "")}/forgot-password`,
      `${BACKEND_URL.replace("/api", "")}/auth/forgot-password`,
    ];

    let success = false;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            // Tactical OTP Request: Tell the backend to send a 6-digit code
            verification_type: "otp",
            send_code: true,
          }),
        });

        if (response.ok) {
          setRecoveryStep("verify");
          toast.success("Strategic Code Dispatched");
          success = true;
          break;
        }
      } catch (err) {
        console.warn(`Tactical Sync Failure at ${url}:`, err);
      }
    }

    if (!success) {
      setError(
        "Strategic Sync Error: No valid authentication hub found at Headquarters.",
      );
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });

      if (response.ok) {
        setRecoveryStep("reset");
        toast.success("Sync Code Verified");
      } else {
        setError("Invalid tactical verification code.");
      }
    } catch (err) {
      setError("Verification interlink failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/auth/reset-password-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: otp,
          password: newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Credentials Re-initialized Successfully");
        setIsForgotPassword(false);
        setRecoveryStep("request");
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setError("Failed to re-initialize credentials.");
      }
    } catch (err) {
      setError("Credential sync failure.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col items-center justify-center p-4">
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-black" />

      {/* Logo and Header */}
      <div className="text-center -mt-6 -mb-6">
        <div className="inline-flex items-center justify-center cursor-pointer group">
          <img
            src="/logo.svg"
            alt="Cronabit Logo"
            className="w-52 h-32 object-contain drop-shadow-[0_15px_35px_rgba(13,77,61,0.05)] transition-transform duration-1000 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {isForgotPassword ? (
          <div className="animate-in fade-in zoom-in duration-300">
            {recoveryStep === "request" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="reset-email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@cronabit.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black/20"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-black text-white rounded-lg font-medium shadow-lg shadow-black/10"
                >
                  {isLoading ? "Dispatching..." : "RESET PASSWORD"}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-all"
                >
                  Back to Login
                </button>
              </form>
            )}

            {recoveryStep === "verify" && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Verification Required
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit tactical sync code sent to <br />{" "}
                    <span className="text-black font-semibold">{email}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="h-14 text-center text-2xl font-bold tracking-[0.5em] border-gray-200 bg-[#f0f5ff] rounded-2xl"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full h-12 bg-black text-white rounded-lg font-medium"
                >
                  {isLoading ? "Verifying..." : "VERIFY CODE"}
                </Button>
                <button
                  type="button"
                  onClick={() => setRecoveryStep("request")}
                  className="w-full text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-all"
                >
                  Resend Code
                </button>
              </form>
            )}

            {recoveryStep === "reset" && (
              <form onSubmit={handleSetNewPassword} className="space-y-5">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    Initialize Credentials
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Authorized access for{" "}
                    <span className="text-black font-semibold">{email}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      New Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 border-gray-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="h-12 border-gray-200"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || newPassword !== confirmNewPassword}
                  className="w-full h-12 bg-black text-white rounded-lg font-medium transition-all"
                >
                  {isLoading ? "Synchronizing..." : "RESET PASSWORD"}
                </Button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@cronabit.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black/20"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("TACTICAL DEBUG: Recovery Hub Initiated");
                    setIsForgotPassword(true);
                  }}
                  className="text-sm text-black hover:underline cursor-pointer relative z-[100]"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 border-gray-200 focus:border-black focus:ring-black/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-black/20"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
