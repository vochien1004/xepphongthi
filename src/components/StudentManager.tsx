import React, { useState, useRef } from 'react';
import { 
  Student, 
  FirebaseSettings, 
  ExamRoomConfig, 
  Subject, 
  ExamSchedule 
} from '../types';
import { parseExcelStudents, downloadSampleExcelTemplate } from '../utils/excel';
import { syncDataToFirebase } from '../services/storageService';
import { arrangeRooms } from '../utils/roomArranger';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Edit2,
  Search,
  Users,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  RefreshCw
} from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  firebaseSettings: FirebaseSettings;
  config: ExamRoomConfig;
  onUpdateConfig?: (config: ExamRoomConfig) => void;
  onClearAllStudentsAndClasses?: () => Promise<{ success: boolean; message: string }>;
  subjects: Subject[];
  schedules: ExamSchedule[];
  onNavigateToConfig?: () => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  onUpdateStudents,
  firebaseSettings,
  config,
  onUpdateConfig,
  onClearAllStudentsAndClasses,
  subjects,
  schedules,
  onNavigateToConfig,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<Partial<Student>>({
    soBD: '',
    hoTen: '',
    lop: '12A1',
    khoi: '12',
    ngaySinh: '',
    gioiTinh: 'Nam',
    danToc: 'Kinh',
    ghiChu: '',
  });

  // In-app deletion modals
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique grades and classes
  const uniqueGrades = Array.from(new Set(students.map((s) => s.khoi).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  const uniqueClasses = Array.from(new Set(students.map((s) => s.lop).filter(Boolean))).sort();

  const hasDataToClear =
    students.length > 0 ||
    (config.customClasses && config.customClasses.length > 0) ||
    (config.classSubjects && Object.keys(config.classSubjects).length > 0);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.soBD.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lop.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGrade = selectedGrade === 'all' || s.khoi === selectedGrade;
    const matchesClass = selectedClass === 'all' || s.lop === selectedClass;

    return matchesSearch && matchesGrade && matchesClass;
  });

  // Handle Excel Upload with Batch Firestore Commit and isSubmitting lock
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isSubmitting || isUploading) return;

    setIsUploading(true);
    setIsSubmitting(true);
    setUploadError(null);
    setUploadSuccess(null);
    setSyncFeedback('Đang đọc file Excel...');

    try {
      const parsedStudents = await parseExcelStudents(file);
      if (parsedStudents.length === 0) {
        throw new Error('Không tìm thấy bản ghi học sinh hợp lệ nào trong file Excel!');
      }

      onUpdateStudents(parsedStudents);

      // Explicit batch Firebase Sync
      setSyncFeedback('Đang lưu dạng batch lên Firebase Firestore...');
      const currentRooms = arrangeRooms(parsedStudents, config);
      const syncRes = await syncDataToFirebase(
        firebaseSettings,
        parsedStudents,
        config,
        subjects,
        schedules,
        currentRooms
      );

      if (syncRes.success) {
        setUploadSuccess(`Đã import thành công ${parsedStudents.length} học sinh và đồng bộ atomic batch lên Firebase!`);
      } else {
        setUploadSuccess(`Đã import ${parsedStudents.length} học sinh (Lưu ý: ${syncRes.message})`);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.');
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
      setSyncFeedback(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open modal for Add
  const handleOpenAdd = () => {
    if (isSubmitting) return;
    setEditingStudent(null);
    setFormError(null);
    const nextSbdNumber = students.length + 1;
    setModalForm({
      soBD: `12${String(nextSbdNumber).padStart(3, '0')}`,
      hoTen: '',
      lop: '12A1',
      khoi: '12',
      ngaySinh: '',
      gioiTinh: 'Nam',
      danToc: 'Kinh',
      ghiChu: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (student: Student) => {
    if (isSubmitting) return;
    setEditingStudent(student);
    setFormError(null);
    setModalForm({ ...student });
    setIsModalOpen(true);
  };

  // Save Modal Form with isSubmitting lock
  const handleSaveStudent = async () => {
    if (isSubmitting) return;
    if (!modalForm.hoTen?.trim() || !modalForm.soBD?.trim()) {
      setFormError('Vui lòng nhập đầy đủ Số báo danh và Họ tên học sinh!');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      let updated: Student[];
      if (editingStudent) {
        // Update
        updated = students.map((s) =>
          s.id === editingStudent.id ? ({ ...s, ...modalForm } as Student) : s
        );
      } else {
        // Add new
        const newStudent: Student = {
          id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          soBD: modalForm.soBD || '',
          hoTen: modalForm.hoTen || '',
          lop: modalForm.lop || '12A1',
          khoi: modalForm.khoi || '12',
          ngaySinh: modalForm.ngaySinh || '',
          gioiTinh: modalForm.gioiTinh || 'Nam',
          danToc: modalForm.danToc || 'Kinh',
          ghiChu: modalForm.ghiChu || '',
        };
        updated = [...students, newStudent];
      }
      onUpdateStudents(updated);
      setIsModalOpen(false);

      // Sync to Firebase with writeBatch
      const currentRooms = arrangeRooms(updated, config);
      await syncDataToFirebase(firebaseSettings, updated, config, subjects, schedules, currentRooms);
      setUploadSuccess(`Đã lưu học sinh ${modalForm.hoTen} và đồng bộ lên Firebase!`);
    } catch (err: any) {
      setUploadError(`Lỗi khi lưu học sinh: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute single student deletion with isSubmitting lock
  const executeDeleteStudent = async () => {
    if (isSubmitting || !studentToDelete) return;
    setIsSubmitting(true);
    const targetName = studentToDelete.hoTen;
    const filtered = students.filter((s) => s.id !== studentToDelete.id);

    try {
      onUpdateStudents(filtered);
      setStudentToDelete(null);

      // Immediate Firestore batch update
      const currentRooms = arrangeRooms(filtered, config);
      await syncDataToFirebase(firebaseSettings, filtered, config, subjects, schedules, currentRooms);
      setUploadSuccess(`Đã xóa học sinh "${targetName}" và cập nhật Firebase.`);
    } catch (err: any) {
      setUploadError(`Lỗi khi xóa học sinh: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute clear all students and classes with isSubmitting lock
  const executeClearAll = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setUploadError(null);

    try {
      if (onClearAllStudentsAndClasses) {
        const res = await onClearAllStudentsAndClasses();
        setIsClearAllModalOpen(false);
        if (res.success) {
          setUploadSuccess(res.message);
        } else {
          setUploadSuccess('Đã xóa dữ liệu học sinh và lớp học trên chương trình.');
          setUploadError(`Lưu ý Firebase: ${res.message}`);
        }
      } else {
        const updatedConfig: ExamRoomConfig = {
          ...config,
          customClasses: [],
          classSubjects: {},
        };
        onUpdateStudents([]);
        if (onUpdateConfig) {
          onUpdateConfig(updatedConfig);
        }
        setIsClearAllModalOpen(false);

        const res = await syncDataToFirebase(firebaseSettings, [], updatedConfig, subjects, schedules, []);
        if (res.success) {
          setUploadSuccess('Đã xóa toàn bộ học sinh, lớp học trên chương trình và Firebase! Môn học, lịch thi và các cấu hình khác được giữ nguyên.');
        } else {
          setUploadError(`Lỗi khi xóa danh sách trên Firebase: ${res.message}`);
        }
      }
    } catch (err: any) {
      setUploadError(`Lỗi khi xóa danh sách: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sync to Firebase manually with isSubmitting lock
  const handleSyncFirebase = async () => {
    if (isSubmitting || isSyncingFirebase) return;
    if (!firebaseSettings.isConfigured) {
      setUploadError('Vui lòng kiểm tra cấu hình Firebase!');
      return;
    }
    setIsSubmitting(true);
    setIsSyncingFirebase(true);
    setSyncFeedback('Đang lưu dữ liệu theo batch lên Firebase...');

    try {
      const currentRooms = arrangeRooms(students, config);
      const res = await syncDataToFirebase(firebaseSettings, students, config, subjects, schedules, currentRooms);
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setSyncFeedback(`Lỗi: ${err.message || err}`);
    } finally {
      setIsSyncingFirebase(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Menu 01: Quản lý Hồ sơ Thí sinh</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Danh Sách Học Sinh Dự Thi</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Nhập danh sách từ Excel theo mẫu hoặc thêm thủ công. Dữ liệu sẽ tự động đồng bộ thời gian thực lên Firebase Cloud.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadSampleExcelTemplate}
              disabled={isSubmitting || isUploading}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl transition border border-white/20 cursor-pointer disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Tải file Excel mẫu chuẩn</span>
            </button>
            <button
              onClick={handleOpenAdd}
              disabled={isSubmitting || isUploading}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm thí sinh</span>
            </button>
            {firebaseSettings.isConfigured && students.length > 0 && (
              <button
                onClick={handleSyncFirebase}
                disabled={isSyncingFirebase || isSubmitting}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isSyncingFirebase ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>{isSyncingFirebase ? 'Đang lưu...' : 'Lưu lên Firebase'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Tổng số thí sinh</div>
            <div className="text-2xl font-black text-white mt-0.5">
              {students.length} <span className="text-xs font-normal text-slate-400">em</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Khối 12 / 11 / 10</div>
            <div className="text-lg font-bold text-blue-300 mt-1">
              {students.filter(s => s.khoi === '12').length} / {students.filter(s => s.khoi === '11').length} / {students.filter(s => s.khoi === '10').length}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Số lượng Lớp học</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {uniqueClasses.length} <span className="text-xs font-normal text-slate-400">lớp</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-slate-400 text-xs font-medium">Học sinh DTNT</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {students.filter(s => s.danToc && s.danToc.toLowerCase() !== 'kinh').length} <span className="text-xs font-normal text-slate-400">em</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Tải lên file Excel danh sách học sinh</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Hỗ trợ định dạng .xlsx, .xls, .csv</span>
          </div>

          <label className={`border-2 border-dashed ${isSubmitting || isUploading ? 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-60' : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 cursor-pointer'} rounded-xl p-6 flex flex-col items-center justify-center transition group text-center`}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              disabled={isSubmitting || isUploading}
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="bg-blue-100 group-hover:bg-blue-200 text-blue-600 p-3 rounded-full mb-2 transition">
              {isUploading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {isUploading ? 'Đang đọc và import theo Batch lên Firestore...' : 'Nhấp để chọn file Excel danh sách hoặc kéo thả file vào đây'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Các cột hỗ trợ: [Số báo danh / SoBD, Họ và tên / HoTen, Lớp, Khối, Ngày sinh, Giới tính, Dân tộc, Ghi chú]
            </p>
          </label>

          {uploadSuccess && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{uploadError}</span>
            </div>
          )}

          {syncFeedback && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 shrink-0 text-blue-600 animate-spin" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        {/* Quick Operations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Thao tác dữ liệu</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Tải file mẫu Excel về điền thông tin học sinh của trường, hoặc nhập trực tiếp từng em.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleOpenAdd}
              disabled={isSubmitting || isUploading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm 01 học sinh thủ công</span>
            </button>
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              disabled={!hasDataToClear || isSubmitting || isUploading}
              className="w-full flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition border border-rose-200 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa danh sách hiện tại</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo Họ tên, Số báo danh, Lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={students.length === 0}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter Grade */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-slate-600">Khối:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                disabled={students.length === 0}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="all">Tất cả Khối</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Class */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-slate-600">Lớp:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={students.length === 0}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="all">Tất cả Lớp</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 pl-2">
              Hiển thị: <span className="text-blue-600 font-mono">{filteredStudents.length}</span>/{students.length}
            </div>
          </div>
        </div>

        {/* Student Table / Empty state */}
        <div className="overflow-x-auto">
          {students.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Chưa có dữ liệu thí sinh trong chương trình
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5">
                Vui lòng tải lên danh sách học sinh từ file Excel hoặc thêm học sinh thủ công. Hệ thống sẽ tự động đồng bộ và xếp phòng thi ngay khi có dữ liệu.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Chọn file Excel để tải lên</span>
                </button>
                <button
                  onClick={downloadSampleExcelTemplate}
                  className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Tải file Excel mẫu</span>
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">TT</th>
                  <th className="py-3 px-4">Số BD</th>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Khối</th>
                  <th className="py-3 px-4">Ngày sinh</th>
                  <th className="py-3 px-4">Giới tính</th>
                  <th className="py-3 px-4">Dân tộc</th>
                  <th className="py-3 px-4">Ghi chú</th>
                  <th className="py-3 px-4 text-center w-20">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-medium">Không tìm thấy học sinh nào phù hợp bộ lọc!</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-2.5 px-4 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{s.soBD}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{s.hoTen}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{s.lop}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block bg-slate-200 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-sm">
                          K{s.khoi}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{s.ngaySinh || '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-sm ${s.gioiTinh === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                          {s.gioiTinh}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">
                        {s.danToc || 'Kinh'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-xs">{s.ghiChu || '—'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            disabled={isSubmitting}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 rounded-md transition cursor-pointer disabled:cursor-not-allowed"
                            title="Sửa thông tin"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(s)}
                            disabled={isSubmitting}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 rounded-md transition cursor-pointer disabled:cursor-not-allowed"
                            title="Xóa học sinh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingStudent ? 'Sửa thông tin học sinh' : 'Thêm học sinh dự thi mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-sm max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số báo danh (SoBD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={modalForm.soBD || ''}
                    onChange={(e) => setModalForm({ ...modalForm, soBD: e.target.value })}
                    placeholder="VD: 12001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khối học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={modalForm.khoi || '12'}
                    onChange={(e) => setModalForm({ ...modalForm, khoi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  >
                    <option value="12">Khối 12</option>
                    <option value="11">Khối 11</option>
                    <option value="10">Khối 10</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.hoTen || ''}
                  onChange={(e) => setModalForm({ ...modalForm, hoTen: e.target.value })}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp
                  </label>
                  <input
                    type="text"
                    value={modalForm.lop || ''}
                    onChange={(e) => setModalForm({ ...modalForm, lop: e.target.value })}
                    placeholder="VD: 12A1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày sinh (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    value={modalForm.ngaySinh || ''}
                    onChange={(e) => setModalForm({ ...modalForm, ngaySinh: e.target.value })}
                    placeholder="VD: 15/04/2008"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={modalForm.gioiTinh || 'Nam'}
                    onChange={(e) => setModalForm({ ...modalForm, gioiTinh: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dân tộc
                  </label>
                  <input
                    type="text"
                    value={modalForm.danToc || ''}
                    onChange={(e) => setModalForm({ ...modalForm, danToc: e.target.value })}
                    placeholder="VD: Kinh, Gia Rai, Ba Na..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={modalForm.ghiChu || ''}
                  onChange={(e) => setModalForm({ ...modalForm, ghiChu: e.target.value })}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveStudent}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu học sinh'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Confirm Delete Single Student */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa học sinh</h3>
              <p className="text-xs text-slate-600 mt-2">
                Bạn có chắc chắn muốn xóa học sinh <strong>"{studentToDelete.hoTen}"</strong> (SBD: {studentToDelete.soBD} - Lớp: {studentToDelete.lop})? Dữ liệu phòng thi & Firebase sẽ được cập nhật lại ngay lập tức.
              </p>
              <div className="mt-5 flex space-x-2 justify-center">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStudentToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={executeDeleteStudent}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
                  <span>{isSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Clear All Students & Classes */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xóa TOÀN BỘ học sinh & lớp học?</h3>
              <p className="text-xs text-slate-600 mt-2">
                Hành động này sẽ xóa toàn bộ <strong>{students.length} học sinh</strong> cùng toàn bộ thông tin lớp học hiện tại trên cả chương trình và Firebase. Các cấu hình môn học, lịch thi và cài đặt khác sẽ được giữ nguyên vẹn.
              </p>
              <div className="mt-5 flex space-x-2 justify-center">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsClearAllModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={executeClearAll}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
                  <span>{isSubmitting ? 'Đang xóa...' : 'Đồng ý xóa sạch'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
