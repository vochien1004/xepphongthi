import React, { useState } from 'react';
import { FirebaseSettings, Student, ExamRoomConfig, Subject, ExamSchedule, RoomAssignment } from '../types';
import { syncDataToFirebase, pullDataFromFirebase, DEFAULT_FIREBASE_CONFIG } from '../services/storageService';
import { Database, CloudUpload, CloudDownload, CheckCircle, AlertCircle, X, ShieldCheck, RefreshCw, Radio, Server } from 'lucide-react';

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
  syncStatus,
}) => {
  const [form, setForm] = useState<FirebaseSettings>({
    ...DEFAULT_FIREBASE_CONFIG,
    ...settings,
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    const isConfigured = Boolean(form.apiKey && form.projectId);
    const updated = { ...form, isConfigured };
    onSaveSettings(updated);
    setStatusMsg({ type: 'success', text: 'Đã lưu và cập nhật cấu hình Firebase Realtime!' });
  };

  const handleResetDefault = () => {
    setForm(DEFAULT_FIREBASE_CONFIG);
    onSaveSettings(DEFAULT_FIREBASE_CONFIG);
    setStatusMsg({ type: 'success', text: 'Đã thiết lập lại cấu hình dự án phanphongthi chuẩn!' });
  };

  const handlePush = async () => {
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Đang đẩy toàn bộ dữ liệu (Học sinh, Phòng thi, Lịch thi) lên Firebase Firestore...' });
    const res = await syncDataToFirebase(form, students, config, subjects, schedules, rooms);
    setLoading(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      onSaveSettings({ ...form, isConfigured: true });
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  const handlePull = async () => {
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Đang kéo toàn bộ dữ liệu từ Firebase Firestore...' });
    const res = await pullDataFromFirebase(form);
    setLoading(false);
    if (res.success && res.data) {
      setStatusMsg({ type: 'success', text: res.message });
      onDataLoaded(res.data);
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
                <h3 className="font-bold text-base">Đồng bộ Firebase Firestore (Realtime)</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Trực tuyến</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">Dự án: <strong className="text-amber-300 font-mono">{form.projectId || 'phanphongthi'}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Live Status Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Tự động đồng bộ 2 chiều thời gian thực
                </div>
                <div className="text-[11px] text-slate-500">
                  Mọi thao tác cập nhật học sinh, phòng thi, lịch thi được lưu trực tiếp lên Firestore.
                </div>
              </div>
            </div>
            <button
              onClick={handleResetDefault}
              className="text-[11px] font-bold text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition shrink-0 cursor-pointer"
            >
              Nạp thông số gốc
            </button>
          </div>

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
              className="flex-1 bg-slate-900 hover:bg-black text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
            >
              Lưu cấu hình
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
