import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarRange, 
  CheckCircle2, 
  Sparkles, 
  Save, 
  FileText, 
  ClipboardCheck, 
  School,
  Building2
} from 'lucide-react';
import { ExamRoomConfig } from '../types';
import { parseExamConfig, buildFullExamTitle, getExamTitles } from '../utils/examTitleHelper';

interface ExamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExamRoomConfig;
  onSaveConfig: (updatedConfig: ExamRoomConfig) => void;
}

export const ExamConfigModal: React.FC<ExamConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const initial = parseExamConfig(config);

  const [examName, setExamName] = useState(initial.examName);
  const [semester, setSemester] = useState(initial.semester);
  const [schoolYear, setSchoolYear] = useState(initial.schoolYear);
  const [schoolName, setSchoolName] = useState(config.schoolName || 'TRƯỜNG PT DTNT THPT SA THẦY');
  const [subDepartment, setSubDepartment] = useState(config.subDepartment || 'SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI');
  const [creatorName, setCreatorName] = useState(config.creatorName || 'Võ Chiến');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseExamConfig(config);
      setExamName(parsed.examName);
      setSemester(parsed.semester);
      setSchoolYear(parsed.schoolYear);
      setSchoolName(config.schoolName || 'TRƯỜNG PT DTNT THPT SA THẦY');
      setSubDepartment(config.subDepartment || 'SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI');
      setCreatorName(config.creatorName || 'Võ Chiến');
      setSavedToast(false);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Live preview title
  const previewFullTitle = buildFullExamTitle(examName, semester, schoolYear);
  const previewListTitle = `DANH SÁCH HỌC SINH DỰ ${previewFullTitle}`;
  const previewSubmissionTitle = `PHIẾU THU BÀI ${previewFullTitle}`;

  // Quick suggestion chips
  const examNameSuggestions = [
    'KIỂM TRA CUỐI HỌC KỲ',
    'KIỂM TRA GIỮA HỌC KỲ',
    'KIỂM TRA ĐỊNH KỲ',
    'KIỂM TRA THƯỜNG XUYÊN',
    'THI THỬ TỐT NGHIỆP THPT',
  ];

  const semesterSuggestions = [
    { label: 'Để trống', value: '' },
    { label: 'Học kỳ I', value: 'HỌC KỲ I' },
    { label: 'Học kỳ II', value: 'HỌC KỲ II' },
    { label: 'Học kỳ 1', value: 'HỌC KỲ 1' },
    { label: 'Học kỳ 2', value: 'HỌC KỲ 2' },
  ];

  const yearSuggestions = [
    '2024 - 2025',
    '2025 - 2026',
    '2026 - 2027',
  ];

  const handleSave = () => {
    const updatedTitle = buildFullExamTitle(examName, semester, schoolYear);

    const updatedConfig: ExamRoomConfig = {
      ...config,
      examName: examName.trim(),
      semester: semester.trim(),
      schoolYear: schoolYear.trim(),
      examTitle: updatedTitle,
      schoolName: schoolName.trim(),
      subDepartment: subDepartment.trim(),
      creatorName: creatorName.trim() || 'Võ Chiến',
    };

    onSaveConfig(updatedConfig);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <CalendarRange className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Cấu Hình Kỳ Kiểm Tra & Năm Học</h3>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Đồng bộ lên Firebase & tự động cập nhật tiêu đề tất cả danh sách, phiếu thu bài
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {savedToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã lưu thành công! Dữ liệu đang được đồng bộ lên Firebase.</span>
            </div>
          )}

          {/* 1. Tên kỳ kiểm tra */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              1. Tên Kỳ Kiểm Tra <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="VD: KIỂM TRA CUỐI HỌC KỲ"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 self-center mr-1">Gợi ý nhanh:</span>
              {examNameSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setExamName(item)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    examName === item
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 2 & 3: Học kỳ & Năm học */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Học kỳ */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                2. Học Kỳ (nếu có)
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="VD: Để trống hoặc HỌC KỲ I, HỌC KỲ II"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {semesterSuggestions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSemester(item.value)}
                    className={`text-[10.5px] px-2 py-0.5 rounded-md border font-medium transition cursor-pointer ${
                      semester === item.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Năm học */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                3. Năm Học <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="VD: 2025 - 2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {yearSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSchoolYear(item)}
                    className={`text-[10.5px] px-2 py-0.5 rounded-md border font-mono font-medium transition cursor-pointer ${
                      schoolYear === item
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4, 5 & 6: Tên trường, Cơ quan cấp trên & Họ tên Người lập */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 flex items-center space-x-1.5">
                <School className="w-3.5 h-3.5 text-slate-500" />
                <span>Tên Trường:</span>
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="TRƯỜNG PT DTNT THPT SA THẦY"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Sở GD&ĐT / Đơn vị chủ quản:</span>
              </label>
              <input
                type="text"
                value={subDepartment}
                onChange={(e) => setSubDepartment(e.target.value)}
                placeholder="SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Người lập biểu mẫu:</span>
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Võ Chiến"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-800 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Xem Trước Tiêu Đề Xuất Thực Tế (Chuẩn Hành Chính)</span>
            </div>

            {/* Preview Danh Sách Phòng Thi */}
            <div className="bg-white p-3 rounded-lg border border-slate-300 space-y-1 shadow-2xs font-admin">
              <div className="flex items-center space-x-1.5 text-[11px] font-sans font-bold text-slate-500">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Tiêu đề Danh sách học sinh dự kiểm tra:</span>
              </div>
              <div className="text-center font-bold text-[14px] text-black tracking-wide uppercase py-1">
                {previewListTitle}
              </div>
              <div className="text-center text-[12px] font-bold text-black flex items-center justify-center space-x-2">
                <span>KHỐI: 10</span>
                <span>-</span>
                <span>PHÒNG: P1</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-blue-900 underline">Môn: Toán</span>
              </div>
            </div>

            {/* Preview Phiếu Thu Bài */}
            <div className="bg-white p-3 rounded-lg border border-slate-300 space-y-1 shadow-2xs font-admin">
              <div className="flex items-center space-x-1.5 text-[11px] font-sans font-bold text-slate-500">
                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tiêu đề Phiếu thu bài kiểm tra:</span>
              </div>
              <div className="text-center font-bold text-[14px] text-black tracking-wide uppercase py-1">
                {previewSubmissionTitle}
              </div>
              <div className="text-center text-[12px] font-bold text-black flex items-center justify-center space-x-2">
                <span>KHỐI: 10</span>
                <span>-</span>
                <span>PHÒNG: P1</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-indigo-900 underline">Môn: Toán</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu & Đồng Bộ Lên Firebase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
