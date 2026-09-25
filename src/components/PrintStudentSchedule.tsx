import React, { useState } from 'react';
import { 
  Student, 
  ExamSchedule, 
  RoomAssignment, 
  ExamRoomConfig,
  Subject 
} from '../types';
import { getExamTitles } from '../utils/examTitleHelper';
import { 
  Printer, 
  Search, 
  UserCheck, 
  Scissors, 
  Layers, 
  School,
  X,
  FileCheck
} from 'lucide-react';

interface PrintStudentScheduleProps {
  students: Student[];
  schedules: ExamSchedule[];
  rooms: RoomAssignment[];
  config: ExamRoomConfig;
  subjects?: Subject[];
  onNavigateToStudents?: () => void;
}

export const PrintStudentSchedule: React.FC<PrintStudentScheduleProps> = ({
  students,
  schedules,
  rooms,
  config,
  subjects = [],
  onNavigateToStudents,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'single' | 'compact2'>('compact2');

  const uniqueClasses = Array.from(new Set(students.map((s) => s.lop))).sort();

  // Find room for each student
  const getStudentRoom = (studentId: string): RoomAssignment | undefined => {
    return rooms.find((r) => r.students.some((s) => s.id === studentId));
  };

  // Get schedules for student based on their grade & assigned room & class-specific subjects
  const getStudentSchedules = (student: Student): ExamSchedule[] => {
    const studentRoom = getStudentRoom(student.id);
    const roomCode = studentRoom?.roomCode || 'P1';

    // Match schedules for this student's grade and room
    let studentSch = schedules.filter(
      (s) => s.grade === student.khoi && s.roomCode === roomCode
    );

    if (studentSch.length === 0) {
      // Fallback: match by grade if roomCode not explicitly mapped
      studentSch = schedules.filter((s) => s.grade === student.khoi);
    }

    // If class-specific subjects are configured for this student's class, filter to only those subjects
    const classAssignedSubjectIds = config.classSubjects?.[student.lop];
    if (classAssignedSubjectIds && classAssignedSubjectIds.length > 0 && subjects.length > 0) {
      const allowedNames = subjects
        .filter((sub) => classAssignedSubjectIds.includes(sub.id))
        .map((sub) => sub.name.trim().toLowerCase());

      studentSch = studentSch.filter((s) =>
        allowedNames.some((name) => s.subjectName.trim().toLowerCase().includes(name) || name.includes(s.subjectName.trim().toLowerCase()))
      );
    }

    return studentSch;
  };

  // Filter students to display
  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass === 'all' || s.lop === selectedClass;
    const matchStudent = selectedStudentId === 'all' || s.id === selectedStudentId;
    const matchSearch =
      s.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.soBD.toLowerCase().includes(searchTerm.toLowerCase());
    return matchClass && matchStudent && matchSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Control Toolbar (Hidden when printing) */}
      <div className="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Menu 6: Xuất Lịch Thi Cá Nhân Học Sinh</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Phiếu Báo Lịch Thi Cho Từng Học Sinh
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cung cấp chi tiết phòng thi, địa điểm, ngày thi và giờ tập trung của từng em.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu báo ({filteredStudents.length} học sinh)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          {/* Class Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Lọc theo Lớp:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudentId('all');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Tất cả các Lớp ({students.length} HS)</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Lớp {c} ({students.filter((s) => s.lop === c).length} HS)
                </option>
              ))}
            </select>
          </div>

          {/* Student Search */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tìm theo tên / SBD:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Nhập tên hoặc số BD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Direct Student Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Chọn cụ thể 1 học sinh:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Tất cả ({filteredStudents.length} học sinh)</option>
              {students
                .filter((s) => selectedClass === 'all' || s.lop === selectedClass)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.soBD} - {s.hoTen} ({s.lop})
                  </option>
                ))}
            </select>
          </div>

          {/* Print Layout Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Khổ in giấy A4:
            </label>
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={() => setLayoutMode('compact2')}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 px-2 rounded-lg text-xs font-bold border transition ${
                  layoutMode === 'compact2'
                    ? 'bg-blue-50 text-blue-700 border-blue-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Tiết kiệm giấy in (2 phiếu trên 1 tờ A4)"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>2 Phiếu / A4</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('single')}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 px-2 rounded-lg text-xs font-bold border transition ${
                  layoutMode === 'single'
                    ? 'bg-blue-50 text-blue-700 border-blue-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="1 phiếu trên 1 trang A4"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>1 Phiếu / A4</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Schedule Cards */}
      <div className="print-container space-y-6">
        {filteredStudents.length === 0 ? (
          <div className="no-print bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <School className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">Chưa có dữ liệu thí sinh để in phiếu báo thi!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hệ thống đang đợi dữ liệu thí sinh. Vui lòng tải lên file Excel hoặc đồng bộ từ Firebase để in thẻ dự thi / lịch thi cá nhân.
            </p>
            {onNavigateToStudents && (
              <button
                onClick={onNavigateToStudents}
                className="mt-4 inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <span>Tải lên danh sách học sinh</span>
              </button>
            )}
          </div>
        ) : (
          filteredStudents.map((st, idx) => {
            const studentSchedules = getStudentSchedules(st);
            const studentRoom = getStudentRoom(st.id);

            return (
              <div
                key={st.id}
                className={`${
                  layoutMode === 'compact2'
                    ? 'print-card-half'
                    : 'print-page'
                } bg-white p-6 sm:p-8 shadow-lg border border-slate-300 max-w-[210mm] mx-auto font-admin text-black leading-relaxed mb-6`}
              >
                {/* HEADER */}
                <table className="admin-header-table w-full mb-3 text-[12pt]" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                        <div className="text-[12px] font-normal uppercase tracking-wide">
                          {config.subDepartment}
                        </div>
                        <div className="text-[13px] font-bold uppercase underline underline-offset-4">
                          {config.schoolName}
                        </div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                        <div className="text-[12px] font-bold uppercase">
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="text-[12px] font-bold underline underline-offset-4">
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* TITLE */}
                <div className="text-center my-3 space-y-0.5">
                  <h1 className="text-[15px] font-bold uppercase tracking-wide">
                    {getExamTitles(config).studentScheduleTitle} - LỚP {st.lop}
                  </h1>
                </div>

                {/* STUDENT INFO BAR */}
                <div className="my-3 p-2 bg-slate-50/50 border border-black/20 text-[13px] flex flex-wrap items-center justify-between gap-y-1 font-medium">
                  <div>
                    Họ và tên: <strong className="font-bold text-[14px]">{st.hoTen}</strong>
                  </div>
                  <div>
                    Số báo danh: <strong className="font-bold font-mono text-[14px]">{st.soBD}</strong>
                  </div>
                  <div>
                    Lớp: <strong>{st.lop}</strong>
                  </div>
                  <div>
                    Ngày sinh: <strong>{st.ngaySinh}</strong>
                  </div>
                  {studentRoom && (
                    <div>
                      Phòng thi: <strong className="font-bold text-blue-900">{studentRoom.roomCode}</strong>
                    </div>
                  )}
                </div>

                {/* TIMETABLE */}
                <table 
                  className="admin-table w-full text-[12.5px]"
                  style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    tableLayout: 'fixed', 
                    border: '1px solid #000000',
                    marginTop: '8px',
                    marginBottom: '8px',
                    fontFamily: "'Times New Roman', Tinos, Times, serif",
                    color: '#000000'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', textAlign: 'center' }}>
                      <th style={{ width: '6%', border: '1px solid #000000', padding: '5px 2px', textAlign: 'center' }}>TT</th>
                      <th style={{ width: '22%', border: '1px solid #000000', padding: '5px 6px', textAlign: 'left' }}>Môn kiểm tra</th>
                      <th style={{ width: '16%', border: '1px solid #000000', padding: '5px 4px', textAlign: 'center' }}>Ngày kiểm tra</th>
                      <th style={{ width: '10%', border: '1px solid #000000', padding: '5px 2px', textAlign: 'center' }}>Buổi</th>
                      <th style={{ width: '12%', border: '1px solid #000000', padding: '5px 2px', textAlign: 'center' }}>Phòng</th>
                      <th style={{ width: '18%', border: '1px solid #000000', padding: '5px 6px', textAlign: 'left' }}>Địa điểm</th>
                      <th style={{ width: '16%', border: '1px solid #000000', padding: '5px 4px', textAlign: 'center' }}>Thời gian tập trung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ border: '1px solid #000000', textAlign: 'center', padding: '16px', fontStyle: 'italic', color: '#64748b' }}>
                          Chưa có lịch thi được phân cho môn/khối này.
                        </td>
                      </tr>
                    ) : (
                      studentSchedules.map((sch, sIdx) => (
                        <tr key={sch.id}>
                          <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>{sIdx + 1}</td>
                          <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>{sch.subjectName}</td>
                          <td style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'center' }}>{sch.examDate}</td>
                          <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center' }}>{sch.session}</td>
                          <td style={{ border: '1px solid #000000', padding: '4px 2px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>{sch.roomCode}</td>
                          <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'left' }}>{sch.location}</td>
                          <td style={{ border: '1px solid #000000', padding: '4px 4px', textAlign: 'center', fontWeight: 'bold' }}>{sch.assemblyTime}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* FOOTER & SIGNATURE TABLE */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '16px', fontSize: '13px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '60%', textAlign: 'left', verticalAlign: 'bottom', border: 'none', padding: 0, fontSize: '11.5px', fontStyle: 'italic', color: '#475569' }}>
                        * Học sinh có mặt đúng thời gian tập trung, mang theo thẻ học sinh / CCCD.
                      </td>
                      <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'bottom', border: 'none', padding: 0 }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>NGƯỜI LẬP</div>
                        <div style={{ height: '40px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px' }}>{config.creatorName}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
