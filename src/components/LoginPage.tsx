import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  GraduationCap, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  Database,
  FileSpreadsheet,
  Users
} from 'lucide-react';
import { loginUser, AuthUser } from '../services/authService';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
  schoolName?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onLoginSuccess,
  schoolName = 'Trường PT DTNT THPT Sa Thầy'
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Small delay for smooth realistic authentication feedback
    setTimeout(() => {
      const result = loginUser(username, password, rememberMe);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!');
        setIsLoading(false);
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Decorative Blur Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Visual Column (School Branding & Feature Highlights) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-900/80 via-indigo-900/60 to-slate-900 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative">
          <div className="space-y-6">
            {/* School Logo & Title */}
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center text-blue-400">
                  <GraduationCap className="w-7 h-7" />
                </div>
              </div>
              <div>
                <h1 className="text-base font-black text-white uppercase tracking-tight leading-tight">
                  {schoolName}
                </h1>
                <p className="text-xs text-blue-300 font-medium mt-0.5">
                  Hệ thống Khảo thí & Xếp phòng thi
                </p>
              </div>
            </div>

            {/* System Info Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-blue-500/20 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Cổng Quản trị Viên An toàn</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đăng nhập để cấu hình phòng thi, quản lý thí sinh, xếp lịch thi tự động và xuất biểu mẫu PDF/Excel theo chuẩn quy chế.
              </p>
            </div>

            {/* Feature Highlights List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span>Phân phòng thi tự động & xếp theo SBD/Lớp</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span>Xuất Danh sách, Phiếu thu bài & Lịch thi</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <span>Đồng bộ dữ liệu thời gian thực Firebase</span>
              </div>
            </div>
          </div>

          {/* Bottom Accreditation */}
          <div className="pt-6 mt-6 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Phiên bản v2.6 Pro</span>
            <span className="text-blue-400 font-medium">Bảo mật nội bộ</span>
          </div>
        </div>

        {/* Right Form Column (Login Fields & Actions) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-slate-900/60">
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Xác thực quản trị viên</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Đăng nhập hệ thống
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Vui lòng nhập thông tin xác thực để truy cập bảng điều khiển
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Tên đăng nhập <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Mật khẩu <span className="text-rose-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Quick Help */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500/30 bg-slate-800"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập vào hệ thống</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          
        </div>

      </div>
    </div>
  );
};
