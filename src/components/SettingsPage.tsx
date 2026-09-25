import React, { useState } from 'react';
import {
  CalendarRange,
  Database,
  ShieldCheck,
  User,
  SlidersHorizontal,
  LogOut,
  ChevronRight,
  RefreshCw,
  Save,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Info,
  Building,
  School,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { ExamRoomConfig, FirebaseSettings } from '../types';
import { AuthUser } from '../services/authService';
import { parseExamConfig, getExamTitles } from '../utils/examTitleHelper';

interface SettingsPageProps {
  config: ExamRoomConfig;
  onUpdateConfig: (updatedConfig: ExamRoomConfig) => void;
  firebaseSettings: FirebaseSettings;
  onOpenFirebaseModal: () => void;
  syncStatus?: {
    state: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';
    lastSynced?: Date;
    error?: string;
  };
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenExamConfigModal: () => void;
  totalStudents?: number;
  totalRooms?: number;
  totalSubjects?: number;
  totalSchedules?: number;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  config,
  onUpdateConfig,
  firebaseSettings,
  onOpenFirebaseModal,
  syncStatus = { state: 'connected', lastSynced: new Date() },
  currentUser,
  onLogout,
  onOpenExamConfigModal,
  totalStudents = 0,
  totalRooms = 0,
  totalSubjects = 0,
  totalSchedules = 0,
}) => {
  const examTitles = parseExamConfig(config);
  const fullTitles = getExamTitles(config);

  // Local editable state for Creator information
  const [creatorName, setCreatorName] = useState(config.creatorName || 'Võ Chiến');
  const [schoolName, setSchoolName] = useState(config.schoolName || 'TRƯỜNG PT DTNT THPT SA THẦY');
  const [subDepartment, setSubDepartment] = useState(config.subDepartment || 'SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI');
  const [isSavedCreator, setIsSavedCreator] = useState(false);

  // Synchronize local creator form state whenever config is updated from Firebase or parent
  React.useEffect(() => {
    if (config.creatorName) setCreatorName(config.creatorName);
    if (config.schoolName) setSchoolName(config.schoolName);
    if (config.subDepartment) setSubDepartment(config.subDepartment);
  }, [config.creatorName, config.schoolName, config.subDepartment]);

  const handleSaveCreator = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedName = creatorName.trim() || 'Võ Chiến';
    onUpdateConfig({
      ...config,
      creatorName: updatedName,
      schoolName: schoolName.trim(),
      subDepartment: subDepartment.trim(),
    });
    setIsSavedCreator(true);
    setTimeout(() => setIsSavedCreator(false), 2500);
  };

  const formatTime = (date?: Date) => {
    if (!date) return 'Vừa xong';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Cài đặt Hệ thống</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý cấu hình kỳ thi, cơ sở dữ liệu Firebase, thông tin người lập và tài khoản quản trị
              </p>
            </div>
          </div>
        </div>

        {/* Quick status bar */}
        <div className="flex items-center space-x-3 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-600 font-medium">Hệ thống sẵn sàng</span>
          </div>
          <span className="w-1 h-3 bg-slate-200 rounded-full"></span>
          <span className="text-slate-500">
            Năm học: <strong className="text-slate-700">{examTitles.schoolYear}</strong>
          </span>
        </div>
      </div>

      {/* Grid of the 4 Main Setting Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* CARD 1: KỲ THI & NĂM HỌC */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarRange className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Kỳ Thi & Năm Học
                  </h2>
                  <p className="text-[11px] text-slate-400">Tiêu đề in ấn & niên khóa áp dụng</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenExamConfigModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-600/30 transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Cài đặt</span>
              </button>
            </div>

            {/* Content Display */}
            <div className="space-y-3.5">
              <div 
                onClick={onOpenExamConfigModal}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition cursor-pointer group"
              >
                <div className="text-xs text-slate-500 font-medium">Tên kỳ kiểm tra / kỳ thi:</div>
                <div className="text-base font-extrabold text-blue-900 group-hover:text-blue-700 transition-colors mt-0.5">
                  {examTitles.examName}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {examTitles.semester && (
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-md text-xs font-semibold">
                      {examTitles.semester}
                    </span>
                  )}
                  <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono">
                    Năm học: {examTitles.schoolYear}
                  </span>
                </div>
              </div>

              {/* School and SubDepartment Info */}
              <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Đơn vị trường:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[220px]">
                    {config.schoolName || 'PT DTNT THPT SA THẦY'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cơ quan chủ quản:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[220px]">
                    {config.subDepartment || 'SỞ GIÁO DỤC ĐÀO TẠO'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400">Tiêu đề in mẫu:</span>
                  <span className="font-semibold text-blue-700 truncate max-w-[220px]" title={fullTitles.fullExamTitle}>
                    {fullTitles.fullExamTitle}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Áp dụng trên mọi phiếu thu bài & danh sách phòng thi</span>
            <button
              type="button"
              onClick={onOpenExamConfigModal}
              className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>Thay đổi</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 2: FIREBASE REALTIME CLOUD DATABASE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Cơ Sở Dữ Liệu Firebase
                  </h2>
                  <p className="text-[11px] text-slate-400">Đồng bộ điện toán đám mây thời gian thực</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenFirebaseModal}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition cursor-pointer"
              >
                <span>Cấu hình</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Status Banner */}
            <div
              onClick={onOpenFirebaseModal}
              className={`p-4 rounded-xl border transition cursor-pointer group ${
                syncStatus.state === 'syncing'
                  ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                  : syncStatus.state === 'error'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="font-bold text-sm">
                    Firebase: <span className="font-mono text-emerald-700">{firebaseSettings.projectId || 'phanphongthi'}</span>
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  {syncStatus.state === 'syncing' ? 'Đang đồng bộ...' : 'Live Realtime'}
                </div>
              </div>

              <div className="text-xs text-slate-600 mt-2 flex items-center justify-between">
                <span>Cập nhật gần nhất:</span>
                <span className="font-mono font-medium text-slate-700">
                  {formatTime(syncStatus.lastSynced)}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 mt-3.5">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] text-slate-500 font-medium">Thí sinh</div>
                <div className="text-sm font-extrabold text-blue-700 mt-0.5">{totalStudents}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] text-slate-500 font-medium">Phòng thi</div>
                <div className="text-sm font-extrabold text-indigo-700 mt-0.5">{totalRooms}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] text-slate-500 font-medium">Môn thi</div>
                <div className="text-sm font-extrabold text-slate-700 mt-0.5">{totalSubjects}</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] text-slate-500 font-medium">Ca thi</div>
                <div className="text-sm font-extrabold text-slate-700 mt-0.5">{totalSchedules}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tự động đồng bộ hai chiều đa thiết bị</span>
            <button
              type="button"
              onClick={onOpenFirebaseModal}
              className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>Chi tiết kết nối</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 3: THÔNG TIN NGƯỜI LẬP & ĐƠN VỊ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Thông Tin Người Lập
                  </h2>
                  <p className="text-[11px] text-slate-400">Hiển thị ở chân trang các biểu mẫu in ấn</p>
                </div>
              </div>

              {isSavedCreator && (
                <span className="inline-flex items-center space-x-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã lưu</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveCreator} className="space-y-3.5">
              {/* Profile Card Preview */}
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  VC
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-400 font-medium">Người lập biểu mẫu:</div>
                  <div className="text-sm font-extrabold text-slate-800 truncate">
                    {creatorName || 'VÕ CHIẾN'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {schoolName}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên người lập biểu mẫu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Nhập họ tên (ví dụ: Võ Chiến)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu thông tin người lập</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Xuất hiện ở phần ký nhận "Người lập biểu" trên Phiếu thu bài và Danh sách phòng thi.
          </div>
        </div>

        {/* CARD 4: TÀI KHOẢN ADMIN & ĐĂNG XUẤT */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Tài Khoản Quản Trị
                  </h2>
                  <p className="text-[11px] text-slate-400">Phiên làm việc & bảo mật hệ thống</p>
                </div>
              </div>

              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Hoạt động</span>
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Account badge */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono font-bold text-white">
                        {currentUser?.username || 'admin'}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      Quản trị viên (Administrator)
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <div>Quyền hạn tối cao</div>
                  <div className="text-emerald-400 font-semibold">Toàn quyền cấu hình</div>
                </div>
              </div>

              {/* Login session info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Thời gian đăng nhập:</span>
                  <span className="font-mono text-slate-700">
                    {currentUser?.loginTime ? new Date(currentUser.loginTime).toLocaleTimeString('vi-VN') : 'Hiện tại'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phương thức bảo vệ:</span>
                  <span className="text-slate-700 font-medium">Xác thực phiên nội bộ</span>
                </div>
              </div>

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold transition-all cursor-pointer shadow-xs group"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>Đăng xuất khỏi hệ thống (Thoát)</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Đăng xuất sẽ kết thúc phiên làm việc hiện tại và chuyển hướng về màn hình đăng nhập.
          </div>
        </div>

      </div>
    </div>
  );
};
