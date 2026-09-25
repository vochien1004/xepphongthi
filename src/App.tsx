import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Student,
  ExamRoomConfig,
  Subject,
  ExamSchedule,
  FirebaseSettings,
  RoomAssignment,
} from './types';
import {
  loadLocalStudents,
  saveLocalStudents,
  loadLocalConfig,
  saveLocalConfig,
  loadLocalSubjects,
  saveLocalSubjects,
  loadLocalSchedules,
  saveLocalSchedules,
  loadFirebaseSettings,
  saveFirebaseSettings,
  subscribeToFirebaseRealtime,
  syncDataToFirebase,
  pullDataFromFirebase,
} from './services/storageService';
import { arrangeRooms } from './utils/roomArranger';
import { getExamTitles } from './utils/examTitleHelper';
import { Sidebar, MenuTab } from './components/Sidebar';
import { StudentManager } from './components/StudentManager';
import { RoomConfig } from './components/RoomConfig';
import { ScheduleManager } from './components/ScheduleManager';
import { PrintRoomList } from './components/PrintRoomList';
import { PrintSubmissionSheet } from './components/PrintSubmissionSheet';
import { PrintStudentSchedule } from './components/PrintStudentSchedule';
import { GradeExportManager } from './components/GradeExportManager';
import { FirebaseModal } from './components/FirebaseModal';
import { ExamConfigModal } from './components/ExamConfigModal';
import { SettingsPage } from './components/SettingsPage';
import { LoginPage } from './components/LoginPage';
import { getStoredAuth, logoutUser, AuthUser } from './services/authService';
import { Menu, Database, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredAuth());
  const [activeTab, setActiveTab] = useState<MenuTab>('students');
  const [students, setStudents] = useState<Student[]>(() => loadLocalStudents());
  const [config, setConfig] = useState<ExamRoomConfig>(() => loadLocalConfig());
  const [subjects, setSubjects] = useState<Subject[]>(() => loadLocalSubjects());
  const [schedules, setSchedules] = useState<ExamSchedule[]>(() => loadLocalSchedules());
  const [firebaseSettings, setFirebaseSettings] = useState<FirebaseSettings>(() => loadFirebaseSettings());
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isExamConfigModalOpen, setIsExamConfigModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Real-time synchronization status
  const [syncStatus, setSyncStatus] = useState<{
    state: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';
    lastSynced?: Date;
    error?: string;
  }>({
    state: 'connecting',
    lastSynced: new Date(),
  });

  // Flag to avoid loop when update originates from remote snapshot
  const isRemoteUpdateRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean legacy sample keys if any exist in old localStorage
  useEffect(() => {
    try {
      ['exam_sys_students', 'exam_sys_schedules', 'exam_sys_subjects'].forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      // ignore
    }
  }, []);

  // Auto save to LocalStorage as offline fallback
  useEffect(() => {
    saveLocalStudents(students);
  }, [students]);

  useEffect(() => {
    saveLocalConfig(config);
  }, [config]);

  useEffect(() => {
    saveLocalSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    saveLocalSchedules(schedules);
  }, [schedules]);

  useEffect(() => {
    saveFirebaseSettings(firebaseSettings);
  }, [firebaseSettings]);

  // Real-time automatic room arrangement
  const rooms: RoomAssignment[] = useMemo(() => {
    if (students.length === 0) return [];
    return arrangeRooms(students, config);
  }, [students, config]);

  // Setup Real-time Firebase Firestore Listener
  useEffect(() => {
    let isMounted = true;
    setSyncStatus((prev) => ({ ...prev, state: 'connecting' }));

    const unsubscribe = subscribeToFirebaseRealtime(firebaseSettings, {
      onStudentsChange: (remoteStudents) => {
        if (!isMounted) return;
        isRemoteUpdateRef.current = true;
        setStudents(remoteStudents || []);
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 300);
      },
      onConfigChange: (remoteConfig) => {
        if (!isMounted) return;
        if (remoteConfig && remoteConfig.schoolName) {
          isRemoteUpdateRef.current = true;
          setConfig(remoteConfig);
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      },
      onSubjectsChange: (remoteSubjects) => {
        if (!isMounted) return;
        isRemoteUpdateRef.current = true;
        setSubjects(remoteSubjects || []);
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 300);
      },
      onSchedulesChange: (remoteSchedules) => {
        if (!isMounted) return;
        isRemoteUpdateRef.current = true;
        setSchedules(remoteSchedules || []);
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 300);
      },
      onSyncStatusChange: (status) => {
        if (!isMounted) return;
        setSyncStatus(status);
      },
    });

    // Check if cloud has snapshot
    pullDataFromFirebase(firebaseSettings).then((res) => {
      if (isMounted && res.data) {
        if (res.data.students) setStudents(res.data.students);
        if (res.data.config) setConfig(res.data.config);
        if (res.data.subjects) setSubjects(res.data.subjects);
        if (res.data.schedules) setSchedules(res.data.schedules);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [firebaseSettings.apiKey, firebaseSettings.projectId]);

  // Trigger Debounced Real-time Cloud Push whenever user mutates data locally
  const pushLocalChangesToCloud = useCallback(
    (
      newStudents: Student[],
      newConfig: ExamRoomConfig,
      newSubjects: Subject[],
      newSchedules: ExamSchedule[]
    ) => {
      if (isRemoteUpdateRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setSyncStatus((prev) => ({ ...prev, state: 'syncing' }));

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const currentRooms = newStudents.length > 0 ? arrangeRooms(newStudents, newConfig) : [];
          const res = await syncDataToFirebase(
            firebaseSettings,
            newStudents,
            newConfig,
            newSubjects,
            newSchedules,
            currentRooms
          );
          if (res.success) {
            setSyncStatus({ state: 'connected', lastSynced: new Date() });
          } else {
            setSyncStatus({ state: 'error', error: res.message });
          }
        } catch (err: any) {
          setSyncStatus({ state: 'error', error: err.message });
        }
      }, 400);
    },
    [firebaseSettings]
  );

  const handleUpdateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    pushLocalChangesToCloud(newStudents, config, subjects, schedules);
  };

  const handleUpdateConfig = (newConfig: ExamRoomConfig) => {
    setConfig(newConfig);
    pushLocalChangesToCloud(students, newConfig, subjects, schedules);
  };

  const handleUpdateSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    pushLocalChangesToCloud(students, config, newSubjects, schedules);
  };

  const handleUpdateSchedules = (newSchedules: ExamSchedule[]) => {
    setSchedules(newSchedules);
    pushLocalChangesToCloud(students, config, subjects, newSchedules);
  };

  const handleDataLoadedFromFirebase = (data: {
    students: Student[];
    config: ExamRoomConfig;
    subjects: Subject[];
    schedules: ExamSchedule[];
  }) => {
    isRemoteUpdateRef.current = true;
    setStudents(data.students || []);
    setConfig(data.config);
    setSubjects(data.subjects || []);
    setSchedules(data.schedules || []);
    setSyncStatus({ state: 'connected', lastSynced: new Date() });
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 500);
  };

  // Get active tab title for mobile & desktop header
  const getTabTitle = (tab: MenuTab) => {
    switch (tab) {
      case 'students':
        return 'Thông tin HS';
      case 'config':
        return 'Cấu hình phòng thi';
      case 'schedule':
        return 'Cấu hình lịch thi';
      case 'room_list':
        return 'Danh sách phòng thi';
      case 'submission_sheet':
        return 'Phiếu thu bài';
      case 'student_schedule':
        return 'Lịch thi HS';
      case 'grade_export':
        return 'Xuất file nhập điểm';
      case 'settings':
        return 'Cài đặt hệ thống';
      default:
        return 'Xếp phòng thi';
    }
  };

  const examTitles = getExamTitles(config);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // If not logged in, display the dedicated Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => setCurrentUser(user)}
        schoolName={config.schoolName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col font-sans">
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalStudents={students.length}
        totalRooms={rooms.length}
        firebaseSettings={firebaseSettings}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenExamConfigModal={() => setIsExamConfigModalOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        syncStatus={syncStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Layout Area offset by Sidebar */}
      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Mobile / Tablet Header Bar (Hidden on Desktop & Print) */}
        <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-2xs no-print">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-hidden"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs font-bold text-blue-700 uppercase">
                {getTabTitle(activeTab)}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {config.schoolName || 'PT DTNT THPT Sa Thầy'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                syncStatus.state === 'syncing'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : syncStatus.state === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Desktop Top Breadcrumb & Quick Action Bar */}
        <header className="hidden lg:flex bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 items-center justify-between sticky top-0 z-20 no-print shadow-2xs gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium truncate">
              <span className="truncate">{config.schoolName || 'Trường PT DTNT THPT Sa Thầy'}</span>
              <span className="text-slate-300">/</span>
              <span className="shrink-0 font-semibold text-slate-700">Kỳ thi {examTitles.schoolYear}</span>
              <span className="text-slate-300">/</span>
            </div>
            <span className="shrink-0 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100/80 tracking-wide">
              {getTabTitle(activeTab)}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs font-medium text-slate-500 shrink-0">
            {/* Real-time sync badge */}
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border bg-slate-50 hover:bg-slate-100 transition cursor-pointer text-slate-700"
              title="Nhấn để xem cấu hình đồng bộ Firebase"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-slate-700 text-[11px]">
                Firebase ({firebaseSettings.projectId || 'phanphongthi'})
              </span>
              {syncStatus.state === 'syncing' && (
                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
              )}
            </button>

            <div className="flex items-center space-x-2.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
              <span className="text-slate-600">
                Thí sinh: <strong className="text-blue-700 font-bold font-mono">{students.length}</strong>
              </span>
              <span className="w-1 h-3 bg-slate-200 rounded-full"></span>
              <span className="text-slate-600">
                Phòng thi: <strong className="text-indigo-700 font-bold font-mono">{rooms.length}</strong>
              </span>
            </div>

            <div className="text-slate-700 font-bold max-w-[200px] truncate text-right text-xs" title={examTitles.fullExamTitle}>
              {examTitles.fullExamTitle}
            </div>

            {/* Authenticated Admin Badge & Logout */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono">{currentUser.username}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'students' && (
            <StudentManager
              students={students}
              onUpdateStudents={handleUpdateStudents}
              firebaseSettings={firebaseSettings}
              config={config}
              subjects={subjects}
              schedules={schedules}
              onNavigateToConfig={() => setActiveTab('config')}
            />
          )}

          {activeTab === 'config' && (
            <RoomConfig
              config={config}
              onUpdateConfig={handleUpdateConfig}
              students={students}
              subjects={subjects}
              onUpdateSubjects={handleUpdateSubjects}
              rooms={rooms}
              onNavigateToStudents={() => setActiveTab('students')}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleManager
              schedules={schedules}
              onUpdateSchedules={handleUpdateSchedules}
              subjects={subjects}
              rooms={rooms}
              onNavigateToStudents={() => setActiveTab('students')}
            />
          )}

          {activeTab === 'room_list' && (
            <PrintRoomList
              students={students}
              rooms={rooms}
              config={config}
              subjects={subjects}
              onNavigateToStudents={() => setActiveTab('students')}
            />
          )}

          {activeTab === 'submission_sheet' && (
            <PrintSubmissionSheet
              students={students}
              rooms={rooms}
              config={config}
              subjects={subjects}
              onNavigateToStudents={() => setActiveTab('students')}
            />
          )}

          {activeTab === 'student_schedule' && (
            <PrintStudentSchedule
              students={students}
              schedules={schedules}
              rooms={rooms}
              config={config}
              subjects={subjects}
              onNavigateToStudents={() => setActiveTab('students')}
            />
          )}

          {activeTab === 'grade_export' && (
            <GradeExportManager
              students={students}
              rooms={rooms}
              config={config}
              subjects={subjects}
              schedules={schedules}
              onNavigateToStudents={() => setActiveTab('students')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              config={config}
              onUpdateConfig={handleUpdateConfig}
              firebaseSettings={firebaseSettings}
              onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
              syncStatus={syncStatus}
              currentUser={currentUser}
              onLogout={handleLogout}
              onOpenExamConfigModal={() => setIsExamConfigModalOpen(true)}
              totalStudents={students.length}
              totalRooms={rooms.length}
              totalSubjects={subjects.length}
              totalSchedules={schedules.length}
            />
          )}
        </main>

        {/* Footer (No print) */}
        <footer className="no-print bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Hệ thống Quản lý Xếp phòng & Xuất giấy tờ thi &bull; Trường PT DTNT THPT Sa Thầy
            </span>
            <span className="font-semibold text-slate-700">
              Người phụ trách: {config.creatorName}
            </span>
          </div>
        </footer>
      </div>

      {/* Exam Config Modal */}
      <ExamConfigModal
        isOpen={isExamConfigModalOpen}
        onClose={() => setIsExamConfigModalOpen(false)}
        config={config}
        onSaveConfig={handleUpdateConfig}
      />

      {/* Firebase Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        settings={firebaseSettings}
        onSaveSettings={setFirebaseSettings}
        students={students}
        config={config}
        subjects={subjects}
        schedules={schedules}
        rooms={rooms}
        onDataLoaded={handleDataLoadedFromFirebase}
        syncStatus={syncStatus}
      />
    </div>
  );
}
