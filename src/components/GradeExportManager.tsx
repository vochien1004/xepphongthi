import React, { useState, useMemo, useRef } from 'react';
import { 
  Student, 
  RoomAssignment, 
  ExamRoomConfig, 
  Subject,
  ExamSchedule
} from '../types';
import { arrangeRooms } from '../utils/roomArranger';
import { exportGradeEntryExcelFile, GradeExportOptions } from '../utils/excel';
import { exportHtmlToPdf } from '../utils/pdfExport';
import { getExamTitles } from '../utils/examTitleHelper';
import { 
  FileSpreadsheet, 
  FileDown, 
  Printer, 
  Layers, 
  BookOpen, 
  School, 
  CheckCircle2, 
  CheckSquare, 
  Square, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface GradeExportManagerProps {
  students: Student[];
  rooms: RoomAssignment[];
  config: ExamRoomConfig;
  subjects: Subject[];
  schedules?: ExamSchedule[];
  onNavigateToStudents?: () => void;
}

export const GradeExportManager: React.FC<GradeExportManagerProps> = ({
  students,
  config,
  subjects,
  onNavigateToStudents,
}) => {
  // Extract all unique grades from students
  const uniqueGrades = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const k = (s.khoi || '').trim();
      if (k) set.add(k);
    });
    const list = Array.from(set).sort((a, b) => Number(a) - Number(b));
    return list.length > 0 ? list : ['10', '11', '12'];
  }, [students]);

  // Selected grade (default to first available grade, e.g. '12' or '10')
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    return uniqueGrades.includes('12') ? '12' : (uniqueGrades[0] || '12');
  });

  // Filter subjects available for the selected grade
  const gradeSubjects = useMemo(() => {
    const list = subjects.filter(
      (s) => !s.grades || s.grades.length === 0 || s.grades.includes(selectedGrade)
    );
    if (list.length === 0 && subjects.length > 0) {
      return subjects;
    }
    if (list.length === 0) {
      return [{ id: 'default', code: 'CHUNG', name: 'Môn thi chung', grades: [selectedGrade] }];
    }
    return list;
  }, [subjects, selectedGrade]);

  // State: selected subject IDs to include in the Excel export (all selected by default)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  
  // Update selected subjects when gradeSubjects change
  React.useEffect(() => {
    setSelectedSubjectIds(gradeSubjects.map((s) => s.id));
  }, [gradeSubjects]);

  // Tab currently active in on-screen preview
  const [previewSubjectId, setPreviewSubjectId] = useState<string>('');

  React.useEffect(() => {
    if (gradeSubjects.length > 0) {
      if (!gradeSubjects.some((s) => s.id === previewSubjectId)) {
        setPreviewSubjectId(gradeSubjects[0].id);
      }
    }
  }, [gradeSubjects, previewSubjectId]);

  // Export & Numbering options
  const [sttMode, setSttMode] = useState<'per_room' | 'continuous'>('per_room');
  const [includeRoomSummary, setIncludeRoomSummary] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Filter preview room
  const [previewRoomFilter, setPreviewRoomFilter] = useState<string>('all');

  // UI status
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Toggle subject selection
  const handleToggleSubject = (subId: string) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== subId);
      } else {
        return [...prev, subId];
      }
    });
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjectIds(gradeSubjects.map((s) => s.id));
  };

  const handleDeselectAllSubjects = () => {
    if (gradeSubjects.length > 0) {
      setSelectedSubjectIds([gradeSubjects[0].id]);
    }
  };

  // Get active subject for preview
  const activePreviewSubject = useMemo(() => {
    return gradeSubjects.find((s) => s.id === previewSubjectId) || gradeSubjects[0];
  }, [gradeSubjects, previewSubjectId]);

  // Compute rooms for preview subject in selected grade
  const previewRooms = useMemo(() => {
    if (!activePreviewSubject || students.length === 0) return [];
    const arranged = arrangeRooms(students, config, activePreviewSubject.id, activePreviewSubject.name);
    const inGrade = arranged.filter((r) => r.grade === selectedGrade);
    inGrade.sort((a, b) => a.roomNumber - b.roomNumber);
    return inGrade;
  }, [students, config, activePreviewSubject, selectedGrade]);

  // Total examinees in preview
  const previewTotalStudents = useMemo(() => {
    return previewRooms.reduce((sum, r) => sum + r.students.length, 0);
  }, [previewRooms]);

  // Filtered rooms for view
  const displayedRooms = useMemo(() => {
    if (previewRoomFilter === 'all') return previewRooms;
    return previewRooms.filter((r) => r.roomCode === previewRoomFilter);
  }, [previewRooms, previewRoomFilter]);

  // Trigger Excel Export
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setToast(null);

      const options: GradeExportOptions = {
        sttMode,
        includeRoomSummary,
        includeSignatures,
        selectedSubjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
      };

      const result = await exportGradeEntryExcelFile(
        students,
        config,
        gradeSubjects,
        selectedGrade,
        options
      );

      setToast({
        type: 'success',
        message: `Xuất thành công file "${result.fileName}" gồm ${result.sheetCount} sheet môn học (từ phòng P1 đến hết) với ${result.totalExaminees} lượt học sinh!`,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      console.error('Export error:', err);
      setToast({
        type: 'error',
        message: err.message || 'Lỗi trong quá trình tạo file Excel nhập điểm!',
      });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setIsExporting(false);
    }
  };

  // Export all grades
  const handleExportAllGrades = async () => {
    try {
      setIsExporting(true);
      let count = 0;
      for (const g of uniqueGrades) {
        const gradeSubs = subjects.filter((s) => !s.grades || s.grades.length === 0 || s.grades.includes(g));
        const subsToExport = gradeSubs.length > 0 ? gradeSubs : subjects;
        try {
          await exportGradeEntryExcelFile(students, config, subsToExport, g, {
            sttMode,
            includeRoomSummary,
            includeSignatures,
          });
          count++;
        } catch (e) {
          // ignore empty grades
        }
      }
      setToast({
        type: 'success',
        message: `Đã xuất thành công ${count} file Excel nhập điểm cho các Khối: ${uniqueGrades.join(', ')}!`,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Lỗi khi xuất tất cả các khối!',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Browser print / Save PDF
  const handlePrint = () => {
    window.print();
  };

  // Export direct PDF
  const handleExportPdf = async () => {
    if (!printContainerRef.current) return;
    try {
      setIsExporting(true);
      setToast(null);
      const subName = activePreviewSubject?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'MonHoc';
      const fileName = `Bang_Ghi_Diem_Khoi_${selectedGrade}_${subName}_${Date.now()}.pdf`;
      await exportHtmlToPdf(printContainerRef.current, fileName, {
        orientation: 'portrait',
        margin: [10, 15, 10, 15],
      });
      setToast({
        type: 'success',
        message: `Đã tạo và tải file PDF bảng ghi điểm cho môn ${activePreviewSubject?.name} thành công!`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: `Lỗi xuất PDF: ${err?.message || 'Không thể tạo file PDF'}. Quý thầy cô có thể dùng nút In trang để lưu PDF.`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const examTitles = getExamTitles(config);

  return (
    <div className="space-y-6">
      {/* Control Panel (Hidden during print) */}
      <div className="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Chức năng xuất File Nhập Điểm Kiểm Tra</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Xuất File Excel Nhập Điểm Theo Khối & Môn Học
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              File Excel xuất ra có cấu trúc chuẩn <strong>chính xác 9 cột</strong> như mẫu: 
              <code className="mx-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-emerald-800">
                TT | Số BD | Họ và tên | Lớp | Ngày sinh | Dân tộc | Khối | Điểm | Ghi chú
              </code>
              (mỗi sheet là 1 môn học, hiển thị danh sách thí sinh phân bổ từ phòng P1 đến hết).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || students.length === 0}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
              title="Xuất file Excel đúng định dạng: 1 sheet/môn, P1 đến hết"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel Khối {selectedGrade}</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportAllGrades}
              disabled={isExporting || students.length === 0 || uniqueGrades.length <= 1}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              title="Xuất file Excel cho tất cả các khối trong trường"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Xuất tất cả các khối</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting || previewRooms.length === 0}
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              title="Xuất PDF bảng điểm môn đang xem"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Xuất PDF môn này</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={previewRooms.length === 0}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              title="Mở hộp thoại in hệ thống"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In trang</span>
            </button>
          </div>
        </div>

        {/* Filters and Grade Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Chọn Khối - PRIMARY REQUIREMENT */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-blue-700">
                <Layers className="w-4 h-4" />
                <span>1. Chọn Khối cần xuất file:</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                {uniqueGrades.length} khối hiện có
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {uniqueGrades.map((g) => {
                const count = students.filter((s) => (s.khoi || '').trim() === g).length;
                const isSelected = selectedGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(g)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>Khối {g}</span>
                    <span className={`text-[10px] font-normal mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {count} HS
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Khi xuất, file Excel sẽ chứa danh sách học sinh Khối {selectedGrade}, phân bổ từ phòng P1 đến phòng cuối cùng.
            </p>
          </div>

          {/* 2. Chọn Môn học đưa vào các Sheet */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 text-emerald-700">
                <BookOpen className="w-4 h-4" />
                <span>2. Môn xuất thành Sheet ({selectedSubjectIds.length}/{gradeSubjects.length}):</span>
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllSubjects}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllSubjects}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Chọn 1
                </button>
              </div>
            </div>

            <div className="max-h-28 overflow-y-auto pr-1 space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
              {gradeSubjects.map((sub) => {
                const isChecked = selectedSubjectIds.includes(sub.id);
                return (
                  <label
                    key={sub.id}
                    className="flex items-center space-x-2 text-xs text-slate-700 hover:bg-slate-50 p-1 rounded cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSubject(sub.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="font-medium truncate flex-1">{sub.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">1 sheet</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Tùy chọn định dạng & Bố cục */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5 text-indigo-700">
              <Sparkles className="w-4 h-4" />
              <span>3. Tùy chọn định dạng file:</span>
            </label>

            <div className="space-y-2 text-xs text-slate-700">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Cách đánh số thứ tự (STT):
                </label>
                <select
                  value={sttMode}
                  onChange={(e) => setSttMode(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="per_room">Đánh số theo từng phòng (1, 2, ... 24 cho mỗi phòng)</option>
                  <option value="continuous">Đánh số liên tục toàn khối (1 đến hết khối)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRoomSummary}
                    onChange={(e) => setIncludeRoomSummary(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Dòng tổng kết và chữ ký từng phòng</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Bảng ký tên cuối môn (CB chấm 1, 2, Trưởng ban)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs bg-slate-50/90 rounded-xl p-3 border border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-600">
              Đang xem trước môn:{' '}
              <strong className="text-emerald-700 font-bold">{activePreviewSubject?.name}</strong>
              {' &bull; '}
              Khối: <strong className="text-blue-700 font-bold">{selectedGrade}</strong>
            </span>

            <span className="inline-flex items-center space-x-1.5 bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              <span>{previewRooms.length} phòng ({previewRooms[0]?.roomCode || 'P1'} đến {previewRooms[previewRooms.length - 1]?.roomCode || 'P...'})</span>
            </span>

            <span className="inline-flex items-center space-x-1.5 bg-blue-100/70 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
              <span>{previewTotalStudents} học sinh</span>
            </span>

            <span className="inline-flex items-center space-x-1.5 bg-indigo-100/70 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
              <span>{selectedSubjectIds.length} sheet sẽ xuất</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-[11px] font-semibold text-slate-500">Lọc phòng xem nhanh:</label>
            <select
              value={previewRoomFilter}
              onChange={(e) => setPreviewRoomFilter(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">⚡ Hiển thị từ P1 đến hết ({previewRooms.length} phòng)</option>
              {previewRooms.map((r) => (
                <option key={r.roomCode} value={r.roomCode}>
                  Phòng {r.roomCode} ({r.students.length} HS)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>

      {/* Subject Tab Bar for On-Screen Preview */}
      <div className="no-print flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center space-x-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Xem sheet:</span>
        </span>
        {gradeSubjects.map((sub) => {
          const isActive = previewSubjectId === sub.id;
          const isSelectedForExport = selectedSubjectIds.includes(sub.id);
          return (
            <button
              key={sub.id}
              onClick={() => setPreviewSubjectId(sub.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 border ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{sub.name}</span>
              {isSelectedForExport && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Printable / Preview Document Container */}
      <div ref={printContainerRef} id="print-grade-export-container" className="print-container space-y-8">
        {students.length === 0 ? (
          <div className="no-print bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <School className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">Chưa có dữ liệu học sinh để xuất file nhập điểm!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Vui lòng tải lên danh sách học sinh ở menu "Thông tin HS" để hệ thống tự động phân phòng và tạo bảng điểm.
            </p>
            {onNavigateToStudents && (
              <button
                onClick={onNavigateToStudents}
                className="mt-4 inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <span>Đến menu Thông tin HS</span>
              </button>
            )}
          </div>
        ) : previewRooms.length === 0 ? (
          <div className="no-print bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
            <p className="text-base font-bold text-slate-700">Không có thí sinh Khối {selectedGrade} cho môn {activePreviewSubject?.name}!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Vui lòng kiểm tra lại cấu hình học sinh của Khối {selectedGrade} hoặc chuyển sang khối khác.
            </p>
          </div>
        ) : (
          <div className="print-page bg-white p-8 sm:p-10 shadow-lg border border-slate-300 max-w-[210mm] mx-auto font-admin text-black leading-relaxed">
            {/* SHEET TOP HEADER */}
            <table className="admin-header-table w-full mb-3 text-[12pt]" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                    <div className="text-[13px] font-normal uppercase tracking-wide">
                      {config.subDepartment || 'SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI'}
                    </div>
                    <div className="text-[14px] font-bold uppercase tracking-tight underline underline-offset-4">
                      {config.schoolName || 'TRƯỜNG PT DTNT THPT SA THẦY'}
                    </div>
                  </td>
                  <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                    <div className="text-[13px] font-bold uppercase">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="text-[13px] font-bold underline underline-offset-4">
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* MAIN TITLE */}
            <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.025em', margin: 0 }}>
                BẢNG GHI ĐIỂM KIỂM TRA
              </h1>
              <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e293b', marginTop: '2px' }}>
                {examTitles.fullExamTitle}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#064e3b', textAlign: 'center', marginTop: '4px' }}>
                <span>MÔN: {activePreviewSubject?.name.toUpperCase()}</span>
                <span style={{ margin: '0 8px' }}>-</span>
                <span>KHỐI: {selectedGrade}</span>
                <span style={{ margin: '0 8px' }}>-</span>
                <span>NĂM HỌC: {examTitles.schoolYear}</span>
              </div>
            </div>

            {/* ROOMS LIST FROM P1 TO THE END */}
            <div className="space-y-6">
              {displayedRooms.map((room, rIdx) => {
                const roomStartStt = sttMode === 'per_room'
                  ? 1
                  : previewRooms.slice(0, rIdx).reduce((sum, r) => sum + r.students.length, 1);

                return (
                  <div key={room.roomCode} className="space-y-2">
                    {/* Room Header Banner Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', backgroundColor: '#f1f5f9', marginBottom: '6px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px', border: 'none' }}>
                            <span style={{ textTransform: 'uppercase', color: '#022c22', fontWeight: '800' }}>
                              PHÒNG THI SỐ: {room.roomCode}
                            </span>
                            <span style={{ margin: '0 8px', color: '#94a3b8', fontWeight: 'normal' }}>|</span>
                            <span style={{ color: '#334155', fontWeight: '500' }}>{room.location || `Phòng ${room.roomNumber}`}</span>
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: '12px', border: 'none', color: '#1e293b' }}>
                            Số lượng: <strong>{room.students.length}</strong> học sinh
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Students Table */}
                    <table 
                      className="admin-table w-full text-[12px]"
                      style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        tableLayout: 'fixed', 
                        border: '1px solid #000000',
                        fontFamily: "'Times New Roman', Tinos, Times, serif",
                        fontSize: '12px',
                        color: '#000000'
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', textAlign: 'center' }}>
                          <th style={{ width: '5%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>TT</th>
                          <th style={{ width: '10%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>Số BD</th>
                          <th style={{ width: '32%', border: '1px solid #000000', padding: '4px 6px', textAlign: 'left' }}>Họ và tên</th>
                          <th style={{ width: '8%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>Lớp</th>
                          <th style={{ width: '13%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>Ngày sinh</th>
                          <th style={{ width: '10%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>Dân tộc</th>
                          <th style={{ width: '6%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>Khối</th>
                          <th style={{ width: '7%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>Điểm</th>
                          <th style={{ width: '9%', border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Room Code Header Row (e.g., P1, P2...) */}
                        <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold', color: '#0f172a' }}>
                          <td style={{ border: '1px solid #000000', padding: '4px 6px', fontFamily: 'monospace', fontSize: '13px' }}>{room.roomCode}</td>
                          <td style={{ border: '1px solid #000000', padding: '4px 6px' }} colSpan={8}></td>
                        </tr>

                        {/* Student rows */}
                        {room.students.map((st, sIdx) => {
                          const stt = sttMode === 'per_room' ? (sIdx + 1) : (roomStartStt + sIdx);
                          return (
                            <tr key={st.id}>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', fontWeight: '500' }}>{stt}</td>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>{st.soBD}</td>
                              <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'left', fontWeight: '500' }}>{st.hoTen}</td>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>{st.lop}</td>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>{st.ngaySinh}</td>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>{st.danToc || 'Kinh'}</td>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', fontWeight: '600' }}>{st.khoi || selectedGrade}</td>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', backgroundColor: '#fffbeb' }}></td>
                              <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', fontSize: '11px' }}>{st.ghiChu || ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Room Summary Line */}
                    {includeRoomSummary && (
                      <div className="border border-black border-t-0 p-2 text-[12px] flex items-center justify-between bg-slate-50 font-medium">
                        <span>
                          Cộng phòng <strong>{room.roomCode}</strong>: <strong>{room.students.length}</strong> bài thi. Số bài vắng: ..........
                        </span>
                        <span className="text-slate-600 text-[11.5px]">
                          Chữ ký CB chấm 1: .............................. CB chấm 2: ..............................
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Subject Summary */}
            <div className="mt-8 pt-3 border-t-2 border-black flex justify-between items-center text-[13px] font-bold">
              <span>
                TỔNG CỘNG TOÀN KHỐI {selectedGrade} - MÔN {activePreviewSubject?.name.toUpperCase()}:
              </span>
              <span>
                {previewTotalStudents} BÀI THI / {previewRooms.length} PHÒNG THI
              </span>
            </div>

            {/* Bottom Signatures Section */}
            {includeSignatures && (
              <table className="admin-signature-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '24px', fontSize: '13px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '33.33%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>CÁN BỘ CHẤM THI 1</div>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569' }}>(Ký và ghi rõ họ tên)</div>
                      <div style={{ height: '64px' }}></div>
                    </td>
                    <td style={{ width: '33.33%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>CÁN BỘ CHẤM THI 2</div>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569' }}>(Ký và ghi rõ họ tên)</div>
                      <div style={{ height: '64px' }}></div>
                    </td>
                    <td style={{ width: '33.33%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>TRƯỞNG BAN CHẤM THI</div>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569' }}>(Ký, ghi rõ họ tên và đóng dấu)</div>
                      <div style={{ height: '64px' }}></div>
                      <div style={{ fontWeight: 'bold' }}>{config.creatorName || ''}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
