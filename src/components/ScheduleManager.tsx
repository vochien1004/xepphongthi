import React, { useState } from 'react';
import { 
  ExamSchedule, 
  Subject, 
  RoomAssignment, 
  Student 
} from '../types';
import { exportSchedulesToExcel } from '../utils/excel';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Edit2, 
  Download, 
  Wand2, 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  X,
  Layers,
  Filter
} from 'lucide-react';

interface ScheduleManagerProps {
  schedules: ExamSchedule[];
  onUpdateSchedules: (schedules: ExamSchedule[]) => void;
  subjects: Subject[];
  rooms: RoomAssignment[];
  onNavigateToStudents?: () => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  schedules,
  onUpdateSchedules,
  subjects,
  rooms,
  onNavigateToStudents,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Single Schedule Form State
  const [formData, setFormData] = useState<Partial<ExamSchedule>>({
    subjectName: 'Ngữ Văn',
    grade: '12',
    examDate: '12/05/2026',
    session: 'Sáng',
    roomCode: 'P1',
    location: 'Phòng 1 (Lớp 12B1)',
    assemblyTime: '07h15',
    examDuration: '90 phút',
  });

  // Batch Form State
  const [batchSubject, setBatchSubject] = useState<string>('Toán');
  const [batchGrade, setBatchGrade] = useState<string>('12');
  const [batchDate, setBatchDate] = useState<string>('12/05/2026');
  const [batchSession, setBatchSession] = useState<'Sáng' | 'Chiều'>('Chiều');
  const [batchAssemblyTime, setBatchAssemblyTime] = useState<string>('13h15');
  const [batchDuration, setBatchDuration] = useState<string>('90 phút');

  // Filtered schedules
  const filteredSchedules = schedules.filter((s) => {
    const matchGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    const matchSub = selectedSubject === 'all' || s.subjectName === selectedSubject;
    return matchGrade && matchSub;
  });

  // Unique lists for filters
  const uniqueGrades = Array.from(new Set(schedules.map((s) => s.grade))).sort((a, b) => Number(a) - Number(b));
  const uniqueSubjectNames = Array.from(new Set(schedules.map((s) => s.subjectName))).sort();

  // Open single add modal
  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setFormError(null);
    setFormData({
      subjectName: subjects[0]?.name || 'Ngữ Văn',
      grade: '12',
      examDate: '12/05/2026',
      session: 'Sáng',
      roomCode: 'P1',
      location: 'Phòng 1 (Lớp 12B1)',
      assemblyTime: '07h15',
      examDuration: '90 phút',
    });
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (sch: ExamSchedule) => {
    setEditingSchedule(sch);
    setFormError(null);
    setFormData({ ...sch });
    setIsModalOpen(true);
  };

  // Save single schedule
  const handleSaveSchedule = () => {
    if (!formData.subjectName || !formData.examDate) {
      setFormError('Vui lòng chọn Môn thi và Ngày thi!');
      return;
    }
    setFormError(null);

    if (editingSchedule) {
      const updated = schedules.map((s) =>
        s.id === editingSchedule.id ? ({ ...s, ...formData } as ExamSchedule) : s
      );
      onUpdateSchedules(updated);
      showToast('Đã cập nhật ca thi thành công!');
    } else {
      const newItem: ExamSchedule = {
        id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        subjectName: formData.subjectName || 'Ngữ Văn',
        grade: formData.grade || '12',
        examDate: formData.examDate || '12/05/2026',
        session: formData.session || 'Sáng',
        roomCode: formData.roomCode || 'P1',
        location: formData.location || `Phòng ${formData.roomCode}`,
        assemblyTime: formData.assemblyTime || '07h15',
        examDuration: formData.examDuration || '90 phút',
      };
      onUpdateSchedules([...schedules, newItem]);
      showToast('Đã thêm ca thi mới thành công!');
    }
    setIsModalOpen(false);
  };

  // Execute Delete schedule
  const executeDeleteSchedule = () => {
    if (!scheduleToDelete) return;
    const filtered = schedules.filter((s) => s.id !== scheduleToDelete.id);
    onUpdateSchedules(filtered);
    showToast(`Đã xóa ca thi môn ${scheduleToDelete.subjectName} (${scheduleToDelete.roomCode})`);
    setScheduleToDelete(null);
  };

  // Batch Auto-Generate schedules for all rooms of selected Grade
  const handleBatchGenerate = () => {
    const targetRooms = rooms.filter((r) => r.grade === batchGrade);
    if (targetRooms.length === 0) {
      setBatchError(`Chưa có phòng thi nào được xếp cho Khối ${batchGrade}. Hãy sang Menu 2 để xếp phòng trước!`);
      return;
    }
    setBatchError(null);

    // Remove existing duplicates for same subject and grade
    const filteredOut = schedules.filter(
      (s) => !(s.grade === batchGrade && s.subjectName === batchSubject)
    );

    const newEntries: ExamSchedule[] = targetRooms.map((room) => ({
      id: `sch_b_${Date.now()}_${room.roomCode}`,
      subjectName: batchSubject,
      grade: batchGrade,
      examDate: batchDate,
      session: batchSession,
      roomCode: room.roomCode,
      location: room.location || `Phòng ${room.roomCode}`,
      assemblyTime: batchAssemblyTime,
      examDuration: batchDuration,
    }));

    onUpdateSchedules([...filteredOut, ...newEntries]);
    setIsBatchModalOpen(false);
    showToast(`Đã tự động tạo lịch thi môn ${batchSubject} cho toàn bộ ${newEntries.length} phòng của Khối ${batchGrade}!`);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <CalendarDays className="w-4 h-4" />
              <span>Menu 3: Quản lý Thời Khóa Biểu Thi</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Lịch Kiểm Tra Chi Tiết</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Quản lý ca thi theo Môn, Ngày thi, Buổi (Sáng/Chiều), Phòng thi, Địa điểm và Thời gian tập trung (13h15, 07h15...).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md"
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
              <span>Tạo lịch nhanh cho tất cả phòng</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl transition border border-white/20"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm ca thi lẻ</span>
            </button>
            <button
              onClick={() => exportSchedulesToExcel(schedules)}
              className="flex items-center space-x-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl transition"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Lọc theo Khối:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="all">Tất cả Khối</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-700">Môn thi:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="all">Tất cả Môn</option>
                {uniqueSubjectNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Tổng cộng: <strong className="text-blue-700">{filteredSchedules.length}</strong> ca thi
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">TT</th>
                <th className="py-3 px-4">Môn kiểm tra</th>
                <th className="py-3 px-4">Khối</th>
                <th className="py-3 px-4">Ngày kiểm tra</th>
                <th className="py-3 px-4">Buổi</th>
                <th className="py-3 px-4">Phòng thi</th>
                <th className="py-3 px-4">Địa điểm</th>
                <th className="py-3 px-4">Thời gian tập trung</th>
                <th className="py-3 px-4 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium">Chưa có lịch thi nào được lập!</p>
                    <p className="text-xs text-slate-400 mt-1">Bấm "Tạo lịch nhanh" hoặc "Thêm ca thi lẻ" để thiết lập.</p>
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((sch, idx) => (
                  <tr key={sch.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-4 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-blue-900">{sch.subjectName}</td>
                    <td className="py-2.5 px-4">
                      <span className="bg-slate-200 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-sm">
                        K{sch.grade}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{sch.examDate}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${
                          sch.session === 'Sáng'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {sch.session}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold font-mono text-blue-700">{sch.roomCode}</td>
                    <td className="py-2.5 px-4 text-slate-700">{sch.location}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center space-x-1 text-slate-900 font-bold bg-slate-100 px-2.5 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{sch.assemblyTime}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sch)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          title="Sửa ca thi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleToDelete(sch)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          title="Xóa ca thi"
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
        </div>
      </div>

      {/* Batch Auto-Generate Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wand2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Tạo lịch thi tự động cho các phòng</h3>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              {batchError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 text-xs font-medium">
                  {batchError}
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-800 text-xs">
                Chức năng này sẽ áp dụng ngày thi, giờ tập trung cho <strong>tất cả phòng thi</strong> của Khối được chọn chỉ bằng 1 cú nhấp.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn Khối học
                  </label>
                  <select
                    value={batchGrade}
                    onChange={(e) => setBatchGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="12">Khối 12</option>
                    <option value="11">Khối 11</option>
                    <option value="10">Khối 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn kiểm tra
                  </label>
                  <select
                    value={batchSubject}
                    onChange={(e) => setBatchSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày thi (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    placeholder="12/05/2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buổi thi
                  </label>
                  <select
                    value={batchSession}
                    onChange={(e) => setBatchSession(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="Sáng">Sáng</option>
                    <option value="Chiều">Chiều</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian tập trung
                  </label>
                  <input
                    type="text"
                    value={batchAssemblyTime}
                    onChange={(e) => setBatchAssemblyTime(e.target.value)}
                    placeholder="VD: 13h15 hoặc 07h15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian làm bài
                  </label>
                  <input
                    type="text"
                    value={batchDuration}
                    onChange={(e) => setBatchDuration(e.target.value)}
                    placeholder="VD: 90 phút, 120 phút"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleBatchGenerate}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Tạo lịch ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Add / Edit Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingSchedule ? 'Sửa ca thi' : 'Thêm ca thi mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs sm:text-sm">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 text-xs font-medium">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn kiểm tra
                  </label>
                  <select
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khối
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="12">Khối 12</option>
                    <option value="11">Khối 11</option>
                    <option value="10">Khối 10</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày thi
                  </label>
                  <input
                    type="text"
                    value={formData.examDate}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    placeholder="12/05/2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buổi thi
                  </label>
                  <select
                    value={formData.session}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Sáng">Sáng</option>
                    <option value="Chiều">Chiều</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phòng thi
                  </label>
                  <input
                    type="text"
                    value={formData.roomCode}
                    onChange={(e) => setFormData({ ...formData, roomCode: e.target.value })}
                    placeholder="VD: P1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian tập trung
                  </label>
                  <input
                    type="text"
                    value={formData.assemblyTime}
                    onChange={(e) => setFormData({ ...formData, assemblyTime: e.target.value })}
                    placeholder="VD: 13h15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa điểm (Phòng & Tên lớp thực tế)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="VD: Phòng 1 (Lớp 12B1)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Lưu ca thi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Delete Schedule Modal */}
      {scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xóa ca thi khỏi lịch?</h3>
              <p className="text-xs text-slate-600 mt-2">
                Bạn có chắc chắn muốn xóa ca thi môn <strong>"{scheduleToDelete.subjectName}"</strong> - Phòng {scheduleToDelete.roomCode} ({scheduleToDelete.examDate} - Buổi {scheduleToDelete.session})?
              </p>
              <div className="mt-5 flex space-x-2 justify-center">
                <button
                  type="button"
                  onClick={() => setScheduleToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeDeleteSchedule}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs animate-bounce border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
