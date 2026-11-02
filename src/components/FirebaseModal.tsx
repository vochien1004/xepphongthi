import React, { useState, useEffect } from 'react';
import { FirebaseSettings, Student, ExamRoomConfig, Subject, ExamSchedule, RoomAssignment } from '../types';
import {
  syncDataToFirebase,
  pullDataFromFirebase,
  DEFAULT_FIREBASE_CONFIG,
  ensureFirebaseAdminAuth,
  signInFirebaseAdminWithGoogle,
  getCurrentFirebaseAuthInfo,
} from '../services/storageService';
import {
  Database,
  CloudUpload,
  CloudDownload,
  CheckCircle,
  AlertCircle,
  X,
  ShieldCheck,
  Server,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FirebaseSettings;
  onSaveSettings: (settings: FirebaseSettings) => void;
  students: Student[];
  config: ExamRoomConfig;
  subjects: Subject[];
  schedules: ExamSchedule[];
  rooms?: RoomAssignment[];
  onDataLoaded: (data: {
    students: Student[];
    config: ExamRoomConfig;
    subjects: Subject[];
    schedules: ExamSchedule[];
  }) => void;
  syncStatus?: {
    state: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';
    lastSynced?: Date;
    error?: string;
  };
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  students,
  config,
  subjects,
  schedules,
  rooms = [],
  onDataLoaded,
}) => {
  const [form, setForm] = useState<FirebaseSettings>({
    ...DEFAULT_FIREBASE_CONFIG,
    ...settings,
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [authInfo, setAuthInfo] = useState<{ uid: string | null; email: string | null; isAdminVerified?: boolean }>({
    uid: null,
    email: null,
    isAdminVerified: false,
  });
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...DEFAULT_FIREBASE_CONFIG,
        ...settings,
      });
      const current = getCurrentFirebaseAuthInfo(settings);
      setAuthInfo((prev) => ({
        ...prev,
        uid: current.uid,
        email: current.email,
      }));
      ensureFirebaseAdminAuth(settings).then((res) => {
        setAuthInfo({
          uid: res.uid || current.uid,
          email: res.email || current.email,
          isAdminVerified: res.isAdminVerified,
        });
      });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const isConfigured = Boolean(form.apiKey && form.projectId);
    const updated = { ...form, isConfigured };
    onSaveSettings(updated);
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Đang lưu cấu hình & xác thực tài khoản Admin trên Firebase...' });
    const authRes = await ensureFirebaseAdminAuth(updated, {
      emailOrUsername: form.adminEmail,
      password: form.adminPassword,
      fullName: config.creatorName || 'Quản trị viên Hệ thống',
    });
    setAuthInfo({
      uid: authRes.uid || null,
      email: authRes.email || null,
      isAdminVerified: authRes.isAdminVerified,
    });
    setLoading(false);
    setStatusMsg({
      type: authRes.isAdminVerified ? 'success' : 'info',
      text: authRes.message || 'Đã lưu và cập nhật cấu hình Firebase Realtime!',
    });
  };

  const handleGoogleAdminAuth = async () => {
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Đang xác thực tài khoản Google Admin với Firebase Auth...' });
    const res = await signInFirebaseAdminWithGoogle(form);
    setAuthInfo({
      uid: res.uid || null,
      email: res.email || null,
      isAdminVerified: res.isAdminVerified,
    });
    setLoading(false);
    setStatusMsg({
      type: res.authenticated ? 'success' : 'error',
      text: res.message || 'Đã kết nối tài khoản Google Admin.',
    });
  };

  const handleCopyUid = () => {
    if (!authInfo.uid) return;
    navigator.clipboard?.writeText(authInfo.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleResetDefault = () => {
    setForm(DEFAULT_FIREBASE_CONFIG);
    onSaveSettings(DEFAULT_FIREBASE_CONFIG);
    setStatusMsg({ type: 'success', text: 'Đã thiết lập lại cấu hình dự án phanphongthi chuẩn!' });
  };

  const handlePush = async () => {
    setLoading(true);
    setStatusMsg({
      type: 'info',
      text: 'Đang xác thực quyền Admin (role == "admin") và đẩy dữ liệu lên Firebase Firestore...',
    });
    const res = await syncDataToFirebase(form, students, config, subjects, schedules, rooms, {
      strictCloudError: true,
    });
    setLoading(false);
    if (res.adminAuth) {
      setAuthInfo({
        uid: res.adminAuth.uid || authInfo.uid,
        email: res.adminAuth.email || authInfo.email,
        isAdminVerified: res.adminAuth.isAdminVerified,
      });
    }
    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      onSaveSettings({ ...form, isConfigured: true });
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  const handlePull = async () => {
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Đang xác thực quyền Admin và kéo toàn bộ dữ liệu từ Firebase Firestore...' });
    const res = await pullDataFromFirebase(form, { strictCloudError: true });
    setLoading(false);
    if (res.success && res.data) {
      setStatusMsg({ type: 'success', text: res.message });
      onDataLoaded(res.data);
    } else if (res.success) {
      setStatusMsg({ type: 'info', text: res.message });
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base">Đồng bộ Firebase Firestore (Admin RBAC)</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>role: admin</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Dự án: <strong className="text-amber-300 font-mono">{form.projectId || 'phanphongthi'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Admin RBAC Status Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-2">
                    <span>Quyền Truy Cập Admin (users/&#123;uid&#125;.role == 'admin')</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {authInfo.uid ? (
                      <span>
                        UID: <code className="text-amber-300 font-mono">{authInfo.uid}</code>{' '}
                        {authInfo.email ? `(${authInfo.email})` : ''}
                      </span>
                    ) : (
                      <span>Nhập tài khoản Admin Firebase hoặc đăng nhập Google để cấp phát UID</span>
                    )}
                  </div>
                </div>
              </div>

              {authInfo.uid && (
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1 transition cursor-pointer shrink-0"
                  title="Sao chép UID để kiểm tra trong bảng users trên Firebase"
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUid ? 'Đã chép UID' : 'Chép UID'}</span>
                </button>
              )}
            </div>

            {/* Admin Firebase Credentials Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email Admin (Firebase Auth)
                </label>
                <input
                  type="text"
                  placeholder="admin@phanphongthi.edu.vn"
                  value={form.adminEmail || ''}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Mật khẩu Admin Firebase (&ge; 6 ký tự)
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu Firebase Auth"
                  value={form.adminPassword || ''}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleGoogleAdminAuth}
                disabled={loading}
                className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600/25 hover:bg-blue-600/40 border border-blue-500/40 text-blue-200 text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Xác thực bằng Google Admin</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer shrink-0"
              >
                Nạp thông số gốc
              </button>
            </div>
          </div>

          {/* Firebase Config Parameters */}
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                API Key (Firebase Web API Key)
              </label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-xs text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project ID
                </label>
                <input
                  type="text"
                  placeholder="phanphongthi"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-xs text-slate-800 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auth Domain
                </label>
                <input
                  type="text"
                  placeholder="phanphongthi.firebaseapp.com"
                  value={form.authDomain}
                  onChange={(e) => setForm({ ...form, authDomain: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  placeholder="phanphongthi.firebasestorage.app"
                  value={form.storageBucket}
                  onChange={(e) => setForm({ ...form, storageBucket: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Messaging Sender ID
                </label>
                <input
                  type="text"
                  placeholder="227852290681"
                  value={form.messagingSenderId}
                  onChange={(e) => setForm({ ...form, messagingSenderId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                App ID
              </label>
              <input
                type="text"
                placeholder="1:227852290681:web:75c8d2519c1be8586f62a8"
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-xs text-slate-800"
              />
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center space-x-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-blue-50 text-blue-900 border border-blue-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span className="font-medium">{statusMsg.text}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
            >
              Lưu & Xác thực Admin
            </button>
            <button
              onClick={handlePush}
              disabled={loading || !form.apiKey || !form.projectId}
              className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Đẩy dữ liệu lên Cloud</span>
            </button>
            <button
              onClick={handlePull}
              disabled={loading || !form.apiKey || !form.projectId}
              className="flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl transition border border-slate-300 cursor-pointer"
            >
              <CloudDownload className="w-4 h-4 text-slate-600" />
              <span>Kéo từ Cloud</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
