import React, { useState } from 'react';
import { 
  Users, 
  Settings2, 
  CalendarDays, 
  FileSpreadsheet, 
  ClipboardCheck, 
  UserCheck, 
  GraduationCap, 
  Database,
  ChevronRight,
  X,
  CalendarRange,
  SlidersHorizontal,
  LogOut,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';
import { FirebaseSettings, ExamRoomConfig } from '../types';
import { AuthUser } from '../services/authService';
import { parseExamConfig } from '../utils/examTitleHelper';
import { ExamConfigModal } from './ExamConfigModal';

export type MenuTab = 'students' | 'config' | 'schedule' | 'room_list' | 'submission_sheet' | 'student_schedule' | 'grade_export' | 'settings';

interface SidebarProps {
  activeTab: MenuTab;
  setActiveTab: (tab: MenuTab) => void;
  totalStudents?: number;
  totalRooms?: number;
  firebaseSettings: FirebaseSettings;
  config: ExamRoomConfig;
  onUpdateConfig?: (updatedConfig: ExamRoomConfig) => void;
  onOpenFirebaseModal: () => void;
  onOpenExamConfigModal?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  syncStatus?: {
    state: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';
    lastSynced?: Date;
    error?: string;
  };
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  firebaseSettings,
  config,
  onUpdateConfig,
  onOpenFirebaseModal,
  isMobileOpen,
  setIsMobileOpen,
  syncStatus = { state: 'connected', lastSynced: new Date() },
  currentUser,
  onLogout,
}) => {
  const [isExamConfigModalOpen, setIsExamConfigModalOpen] = useState(false);
  const examTitles = parseExamConfig(config);

  // 6 menu items in exact specified order, logo + name only
  const menuItems = [
    {
      id: 'students' as MenuTab,
      label: 'Thông tin HS',
      icon: Users,
    },
    {
      id: 'config' as MenuTab,
      label: 'Cấu hình phòng thi',
      icon: Settings2,
    },
    {
      id: 'schedule' as MenuTab,
      label: 'Cấu hình lịch thi',
      icon: CalendarDays,
    },
    {
      id: 'room_list' as MenuTab,
      label: 'Danh sách phòng thi',
      icon: FileSpreadsheet,
    },
    {
      id: 'submission_sheet' as MenuTab,
      label: 'Phiếu thu bài',
      icon: ClipboardCheck,
    },
    {
      id: 'student_schedule' as MenuTab,
      label: 'Lịch thi HS',
      icon: UserCheck,
    },
    {
      id: 'grade_export' as MenuTab,
      label: 'Xuất file nhập điểm',
      icon: FileSpreadsheet,
    },
    {
      id: 'settings' as MenuTab,
      label: 'Cài đặt',
      icon: SlidersHorizontal,
    },
  ];

  const handleSelectTab = (tabId: MenuTab) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  const formatTime = (date?: Date) => {
    if (!date) return 'Vừa xong';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 no-print"
        />
      )}

      {/* Left Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 no-print shadow-2xl lg:shadow-none border-r border-slate-800 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header Brand Lockup */}
        <div className="p-5 border-b border-slate-800/80 relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75"></span>
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-extrabold text-white text-sm tracking-tight truncate">
                    XẾP PHÒNG THI
                  </h1>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                    {examTitles.schoolYear ? examTitles.schoolYear.replace(/\s*-\s*/, '-').slice(-5) : '25-26'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-semibold truncate mt-0.5">
                  {config.schoolName || 'PT DTNT THPT SA THẦY'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {config.subDepartment || 'SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI'}
                </p>
              </div>
            </div>

            {/* Close button on Mobile */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition cursor-pointer"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Menu (Icon + Label only) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4">
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-left text-[13px] font-semibold transition-all group relative cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/60'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  <span className="truncate tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2 shrink-0">
          {/* Quick link button to Settings tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600/25 border-blue-500/50 text-blue-200 shadow-xs'
                : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
                  <span>Cài đặt hệ thống</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Kỳ thi &bull; Firebase &bull; Người lập
                </div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Compact Admin User & Logout */}
          {onLogout && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-mono font-bold text-slate-200 truncate text-[11px]">{currentUser?.username || 'admin'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="text-rose-400 hover:text-white hover:bg-rose-600 px-2 py-0.5 rounded-md text-[10.5px] font-semibold flex items-center space-x-1 transition cursor-pointer"
                title="Đăng xuất khỏi tài khoản admin"
              >
                <LogOut className="w-3 h-3" />
                <span>Thoát</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Exam Config Modal Dialog */}
      {onUpdateConfig && (
        <ExamConfigModal
          isOpen={isExamConfigModalOpen}
          onClose={() => setIsExamConfigModalOpen(false)}
          config={config}
          onSaveConfig={onUpdateConfig}
        />
      )}
    </>
  );
};
