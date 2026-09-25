import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Student, 
  RoomAssignment, 
  ExamRoomConfig, 
  Subject 
} from '../types';
import { arrangeRooms } from '../utils/roomArranger';
import { exportHtmlToPdf } from '../utils/pdfExport';
import { getExamTitles } from '../utils/examTitleHelper';
import * as XLSX from 'xlsx';
import { 
  Printer, 
  FileSpreadsheet, 
  FileDown,
  ClipboardCheck, 
  School,
  CheckCircle2,
  BookOpen,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface PrintSubmissionSheetProps {
  students: Student[];
  config: ExamRoomConfig;
  subjects: Subject[];
  rooms?: RoomAssignment[];
  onNavigateToStudents?: () => void;
}

export const PrintSubmissionSheet: React.FC<PrintSubmissionSheetProps> = ({
  students,
  config,
  subjects,
  onNavigateToStudents,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>('all');

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Extract unique grades from students
  const uniqueGrades = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const k = (s.khoi || '').trim();
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  // Filter subjects relevant to the selected grade
  const availableSubjects = useMemo(() => {
    if (selectedGrade === 'all') return subjects;
    return subjects.filter((s) => !s.grades || s.grades.length === 0 || s.grades.includes(selectedGrade));
  }, [subjects, selectedGrade]);

  // Compute room assignments dynamically based on config, selected subjects, and grades
  const generatedRoomList = useMemo(() => {
    if (!students || students.length === 0) return [];

    let targetSubjects: Subject[] = [];
    if (selectedSubjectId === 'all') {
      targetSubjects = availableSubjects.length > 0 ? availableSubjects : subjects;
      if (targetSubjects.length === 0) {
        targetSubjects = [{ id: 'default', code: 'CHUNG', name: 'Toàn trường', grades: [] }];
      }
    } else {
      const found = subjects.find((s) => s.id === selectedSubjectId);
      targetSubjects = found ? [found] : [{ id: selectedSubjectId, code: selectedSubjectId, name: selectedSubjectId, grades: [] }];
    }

    const roomsResult: (RoomAssignment & { subjectName: string; subjectId: string; isManualPlan: boolean })[] = [];

    targetSubjects.forEach((sub) => {
      const arranged = arrangeRooms(students, config, sub.id, sub.name);

      arranged.forEach((r) => {
        if (selectedGrade !== 'all' && r.grade !== selectedGrade) {
          return;
        }
        if (selectedRoomCode !== 'all' && r.roomCode !== selectedRoomCode) {
          return;
        }

        const planKeySubject = `${r.grade}_${sub.id}`;
        const isManual = Boolean(
          (config.manualRoomPlans && config.manualRoomPlans[planKeySubject]?.rooms?.length) ||
          (config.manualRoomPlans && config.manualRoomPlans[r.grade]?.rooms?.length) ||
          (config.manualRoomPlans && config.manualRoomPlans[`${r.grade}_all`]?.rooms?.length)
        );

        roomsResult.push({
          ...r,
          subjectId: sub.id,
          subjectName: sub.name,
          isManualPlan: isManual,
        });
      });
    });

    return roomsResult;
  }, [students, config, subjects, availableSubjects, selectedGrade, selectedSubjectId, selectedRoomCode]);

  // Extract available room codes for the room dropdown
  const availableRoomCodes = useMemo(() => {
    if (!students || students.length === 0) return [];

    let targetSubjects: Subject[] = [];
    if (selectedSubjectId === 'all') {
      targetSubjects = availableSubjects.length > 0 ? availableSubjects : subjects;
      if (targetSubjects.length === 0) {
        targetSubjects = [{ id: 'default', code: 'CHUNG', name: 'Toàn trường', grades: [] }];
      }
    } else {
      const found = subjects.find((s) => s.id === selectedSubjectId);
      targetSubjects = found ? [found] : [];
    }

    const roomCodes = new Set<string>();
    targetSubjects.forEach((sub) => {
      const arranged = arrangeRooms(students, config, sub.id, sub.name);
      arranged.forEach((r) => {
        if (selectedGrade === 'all' || r.grade === selectedGrade) {
          roomCodes.add(r.roomCode);
        }
      });
    });

    return Array.from(roomCodes).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students, config, subjects, availableSubjects, selectedGrade, selectedSubjectId]);

  // Reset selectedRoomCode to 'all' if current selectedRoomCode is not available
  useEffect(() => {
    if (selectedRoomCode !== 'all' && availableRoomCodes.length > 0 && !availableRoomCodes.includes(selectedRoomCode)) {
      setSelectedRoomCode('all');
    }
  }, [availableRoomCodes, selectedRoomCode]);

  // Statistics
  const totalExamineeCount = useMemo(() => {
    return generatedRoomList.reduce((sum, r) => sum + r.students.length, 0);
  }, [generatedRoomList]);

  const hasAnyManualPlan = useMemo(() => {
    return generatedRoomList.some((r) => r.isManualPlan);
  }, [generatedRoomList]);

  // Print via browser
  const handlePrint = () => {
    window.print();
  };

  // Export to PDF directly
  const handleExportPdf = async () => {
    if (!printContainerRef.current) return;
    if (generatedRoomList.length === 0) return;

    try {
      setIsExportingPdf(true);
      setPdfToast(null);

      let subjectLabel = 'Tat_Ca_Mon';
      if (selectedSubjectId !== 'all') {
        const found = subjects.find((s) => s.id === selectedSubjectId);
        subjectLabel = found ? found.name.replace(/[^a-zA-Z0-9]/g, '_') : selectedSubjectId;
      }
      const gradeLabel = selectedGrade === 'all' ? 'Tat_Ca_Khoi' : `Khoi_${selectedGrade}`;
      const roomLabel = selectedRoomCode === 'all' ? 'Tat_Ca_Phong' : `Phong_${selectedRoomCode}`;
      const fileName = `Phieu_Thu_Bai_${subjectLabel}_${gradeLabel}_${roomLabel}_${Date.now()}.pdf`;

      await exportHtmlToPdf(printContainerRef.current, fileName, {
        orientation: 'portrait',
        margin: [10, 15, 10, 15],
        onProgress: (current, total, statusText) => {
          setPdfToast({
            type: 'success',
            message: `${statusText} (${Math.round((current / total) * 100)}%)`,
          });
        },
      });

      setPdfToast({ type: 'success', message: `Đã xuất và tải về file PDF thành công (${generatedRoomList.length} phiếu thu bài)!` });
      setTimeout(() => setPdfToast(null), 4000);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setPdfToast({
        type: 'error',
        message: `Lỗi xuất PDF: ${err?.message || 'Không thể tạo file'}. Quý thầy cô có thể dùng nút "In trang" (chọn Lưu dạng PDF) để in trực tiếp.`,
      });
      setTimeout(() => setPdfToast(null), 6000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (generatedRoomList.length === 0) return;
    const wb = XLSX.utils.book_new();

    generatedRoomList.forEach((room) => {
      const data: any[] = [];
      room.students.forEach((s, idx) => {
        data.push({
          'TT': idx + 1,
          'Số BD': s.soBD,
          'Họ và tên': s.hoTen,
          'Lớp': s.lop,
          'Ngày sinh': s.ngaySinh,
          'Môn thi': room.subjectName,
          'Phòng thi': room.roomCode,
          'Mã đề/Số tờ': '',
          'Ký tên': '',
          'Điểm': '',
          'Ghi chú': s.ghiChu || '',
        });
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 25 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
      ];
      const sheetName = `Thu_${room.subjectName ? room.subjectName.substring(0, 5) + '_' : ''}${room.roomCode}_K${room.grade}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    let subjectTag = 'TatCaMon';
    if (selectedSubjectId !== 'all') {
      const s = subjects.find((sub) => sub.id === selectedSubjectId);
      if (s) subjectTag = s.name.replace(/\s+/g, '_');
    }
    XLSX.writeFile(wb, `Phieu_Thu_Bai_${subjectTag}_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel (Hidden during printing) */}
      <div className="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <ClipboardCheck className="w-4 h-4" />
              <span>Menu 5: Xuất Phiếu Thu Bài Thi & Ký Tên</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Phiếu Thu Bài Kiểm Tra Chuẩn Hành Chính
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bảng chữ ký nộp bài, ghi mã đề, điểm số và 3 chữ ký Giám thị 1, Giám thị 2, Giáo viên chấm. Lọc theo Khối & Môn, xuất PDF chuẩn A4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export PDF Button */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || generatedRoomList.length === 0}
              className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-md shadow-rose-500/20 cursor-pointer disabled:cursor-not-allowed"
              title="Xuất trực tiếp file PDF theo định dạng chuẩn A4"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tạo PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Xuất file PDF</span>
                </>
              )}
            </button>

            {/* Print / Save PDF via Browser */}
            <button
              onClick={handlePrint}
              disabled={generatedRoomList.length === 0}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-500/20 cursor-pointer disabled:cursor-not-allowed"
              title="Mở hộp thoại in hệ thống (có thể chọn Lưu dưới dạng PDF)"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu thu bài ({generatedRoomList.length} phòng)</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              disabled={generatedRoomList.length === 0}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
              title="Tải bảng phiếu thu bài dưới dạng Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Subject Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Môn kiểm tra:</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {selectedSubjectId === 'all' ? 'Tất cả' : '1 môn'}
              </span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">⚡ Tất cả các môn ({availableSubjects.length} môn)</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  Môn: {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Grade Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Khối lớp:</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {uniqueGrades.length} khối
              </span>
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">Tất cả Khối ({uniqueGrades.join(', ') || 'Chung'})</option>
              {uniqueGrades.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Room Code Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                <span>Phòng thi:</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {availableRoomCodes.length} phòng
              </span>
            </label>
            <select
              value={selectedRoomCode}
              onChange={(e) => setSelectedRoomCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">Tất cả các phòng ({availableRoomCodes.length})</option>
              {availableRoomCodes.map((r) => (
                <option key={r} value={r}>
                  Phòng {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status & Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs bg-slate-50/80 rounded-xl p-3 border border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-600 font-medium">
              Đang lọc:{' '}
              <strong className="text-indigo-700 font-semibold">
                {selectedSubjectId === 'all'
                  ? 'Tất cả các môn'
                  : subjects.find((s) => s.id === selectedSubjectId)?.name || selectedSubjectId}
              </strong>
              {' &bull; '}
              <strong className="text-blue-700 font-semibold">
                {selectedGrade === 'all' ? 'Tất cả Khối' : `Khối ${selectedGrade}`}
              </strong>
              {' &bull; '}
              <strong className="text-emerald-700 font-semibold">
                {selectedRoomCode === 'all' ? 'Tất cả Phòng' : `Phòng ${selectedRoomCode}`}
              </strong>
            </span>

            <span className="inline-flex items-center space-x-1.5 bg-indigo-100/70 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
              <span>{generatedRoomList.length} phòng</span>
            </span>

            <span className="inline-flex items-center space-x-1.5 bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              <span>{totalExamineeCount} lượt thí sinh</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {hasAnyManualPlan ? (
              <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 font-medium text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Áp dụng cấu hình phân phòng thủ công</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Phân phòng tự động</span>
              </span>
            )}
          </div>
        </div>

        {/* PDF Notification Toast */}
        {pdfToast && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              pdfToast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {pdfToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{pdfToast.message}</span>
          </div>
        )}
      </div>

      {/* Printable Document Sheets */}
      <div ref={printContainerRef} id="print-submission-sheet-container" className="print-container space-y-8">
        {generatedRoomList.length === 0 ? (
          <div className="no-print bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <School className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">Chưa có dữ liệu phòng thi để xuất phiếu thu bài!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hệ thống đang đợi dữ liệu thí sinh hoặc chưa có phòng nào thỏa mãn điều kiện lọc. Vui lòng tải lên danh sách học sinh hoặc kiểm tra cấu hình phòng thi.
            </p>
            {onNavigateToStudents && (
              <button
                onClick={onNavigateToStudents}
                className="mt-4 inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <span>Xem danh sách học sinh</span>
              </button>
            )}
          </div>
        ) : (
          generatedRoomList.map((room, rIdx) => (
            <div
              key={`sub_${room.subjectId}_${room.grade}_${room.roomCode}_${rIdx}`}
              className="print-page bg-white p-8 sm:p-10 shadow-md border-none max-w-[210mm] mx-auto font-admin text-black leading-relaxed text-[12pt]"
              style={{ fontFamily: "'Times New Roman', Tinos, Times, serif", fontSize: '12pt', border: 'none' }}
            >
              {/* TOP HEADER */}
              <table className="admin-header-table w-full mb-3" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '12px', fontSize: '14px', lineHeight: '1.4' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0, fontSize: '14px', lineHeight: '1.4' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.4', fontWeight: 'normal', textTransform: 'uppercase' }}>
                        {config.subDepartment || 'SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI'}
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.4', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline' }}>
                        {config.schoolName || 'TRƯỜNG PT DTNT THPT SA THẦY'}
                      </div>
                    </td>
                    <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0, fontSize: '14px', lineHeight: '1.4' }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.4', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.4', fontWeight: 'bold', textDecoration: 'underline' }}>
                        Độc lập - Tự do - Hạnh phúc
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* MAIN TITLE */}
              <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.025em', margin: 0, lineHeight: 1.3 }}>
                  {getExamTitles(config).submissionSheetTitle}
                </h1>

                <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center', color: '#000000', marginTop: '6px', marginBottom: '18px' }}>
                  <span>KHỐI: {room.grade}</span>
                  <span style={{ margin: '0 8px' }}>-</span>
                  <span>PHÒNG: {room.roomCode}</span>
                  <span style={{ margin: '0 8px', color: '#64748b', fontWeight: 'normal' }}>|</span>
                  <span style={{ textDecoration: 'underline', color: '#1e1b4b' }}>Môn: {room.subjectName}</span>
                </div>
              </div>

              {/* TABLE */}
              {(() => {
                return (
                  <table 
                    className="admin-table w-full"
                    style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse', 
                      tableLayout: 'fixed', 
                      border: '1px solid #000000',
                      fontFamily: "'Times New Roman', Tinos, Times, serif",
                      color: '#000000'
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', textAlign: 'center' }}>
                        <th style={{ width: '5%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4 }}>TT</th>
                        <th style={{ width: '8%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4, whiteSpace: 'nowrap' }}>Số BD</th>
                        <th style={{ width: '33%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'left', lineHeight: 1.4, whiteSpace: 'nowrap' }}>Họ và tên</th>
                        <th style={{ width: '7%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4, whiteSpace: 'nowrap' }}>Lớp</th>
                        <th style={{ width: '12%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4, whiteSpace: 'nowrap' }}>Ngày sinh</th>
                        <th style={{ width: '11%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4 }}>Mã đề/số tờ</th>
                        <th style={{ width: '10%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4 }}>Ký tên</th>
                        <th style={{ width: '6%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4 }}>Điểm</th>
                        <th style={{ width: '8%', border: '1px solid #000000', fontSize: '14px', fontWeight: 'bold', padding: '10px 4px', textAlign: 'center', lineHeight: 1.4 }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.students.map((st, idx) => (
                        <tr key={st.id}>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{st.soBD}</td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'left', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.hoTen}</td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{st.lop}</td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center', whiteSpace: 'nowrap' }}>{st.ngaySinh}</td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center' }}></td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center' }}></td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center' }}></td>
                          <td style={{ border: '1px solid #000000', fontSize: '14px', padding: '10px 8px', lineHeight: '1.4', textAlign: 'center' }}>{st.ghiChu || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}

              {/* FOOTER STATS */}
              <div style={{ fontSize: '14px', lineHeight: '1.8', marginTop: '12px' }} className="space-y-1">
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  - Tổng số thí sinh theo danh sách: <strong style={{ fontSize: '14px' }}>{room.students.length}</strong> học sinh.
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  - Tổng số bài thu được: ............... bài / ............... tờ giấy thi.
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  - Tổng số thí sinh vắng: ...... Gồm các số BD: ..........................................................................................
                </div>
              </div>

              {/* SIGNATURES (3 COLUMNS TABLE - NO BORDER) */}
              <table className="admin-signature-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '24px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '33.33%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '16px 8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.3 }}>Giáo viên chấm</div>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
                      <div style={{ minHeight: '90px', height: '90px' }}></div>
                    </td>
                    <td style={{ width: '33.33%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '16px 8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.3 }}>Giám thị 1</div>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
                      <div style={{ minHeight: '90px', height: '90px' }}></div>
                    </td>
                    <td style={{ width: '33.33%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '16px 8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.3 }}>Giám thị 2</div>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
                      <div style={{ minHeight: '90px', height: '90px' }}></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
