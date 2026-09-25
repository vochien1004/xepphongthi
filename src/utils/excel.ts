import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Student, RoomAssignment, ExamSchedule, ExamRoomConfig, Subject, ManualRoomSpec } from '../types';

// Helper to normalize strings for header comparison (remove diacritics, spaces, lowercase)
export function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Convert Excel date or text to DD/MM/YYYY
export function formatExcelDate(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'number') {
    // Excel serial date to JS Date
    const utcDays = Math.floor(raw - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const day = String(dateInfo.getUTCDate()).padStart(2, '0');
    const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
    const year = dateInfo.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  if (raw instanceof Date) {
    const day = String(raw.getDate()).padStart(2, '0');
    const month = String(raw.getMonth() + 1).padStart(2, '0');
    const year = raw.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const str = String(raw).trim();
  // If already formatted like DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (d.length === 4 && y.length <= 2) {
      // YYYY-MM-DD
      const tmp = d;
      d = y;
      y = tmp;
    }
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.length === 2 ? '20' + y : y}`;
  }
  return str;
}

// Parse imported Excel file
export async function parseExcelStudents(file: File): Promise<Student[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of objects
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('File Excel không có dữ liệu hoặc không đúng định dạng!');
  }

  // Find column mapping
  const sampleRow = rawRows[0];
  const keys = Object.keys(sampleRow);

  const findKey = (candidates: string[]): string | undefined => {
    return keys.find((k) => {
      const norm = normalizeKey(k);
      return candidates.some((c) => norm.includes(c) || c === norm);
    });
  };

  const soBDKey = findKey(['sobd', 'sbd', 'sobaodanh', 'mahs', 'msnv', 'mso']) || keys[0];
  const hoTenKey = findKey(['hoten', 'hovaten', 'tenhocsinh', 'ten', 'fullname', 'name']);
  const hoLotKey = findKey(['holot', 'ho', 'tendem']);
  const tenKey = findKey(['ten', 'first']);
  const lopKey = findKey(['lop', 'class', 'malop']) || 'Lop';
  const khoiKey = findKey(['khoi', 'grade', 'khoihoc']) || 'Khoi';
  const ngaySinhKey = findKey(['ngaysinh', 'ngay_sinh', 'dob', 'namsinh', 'birth']) || 'NgaySinh';
  const gioiTinhKey = findKey(['gioitinh', 'gioi_tinh', 'sex', 'gender', 'phai']) || 'GioiTinh';
  const danTocKey = findKey(['dantoc', 'dan_toc', 'ethnic']) || 'DanToc';
  const ghiChuKey = findKey(['ghichu', 'ghi_chu', 'note', 'remarks']) || 'GhiChu';

  const students: Student[] = [];

  rawRows.forEach((row, index) => {
    let hoTen = '';
    if (hoTenKey && row[hoTenKey]) {
      hoTen = String(row[hoTenKey]).trim();
    } else if (hoLotKey && tenKey) {
      hoTen = `${String(row[hoLotKey] || '').trim()} ${String(row[tenKey] || '').trim()}`.trim();
    } else if (tenKey && row[tenKey]) {
      hoTen = String(row[tenKey]).trim();
    }

    const soBD = String(row[soBDKey] || '').trim() || `SBD${String(index + 1).padStart(4, '0')}`;
    const lop = String(row[lopKey] || '').trim() || '12A1';
    
    // Auto infer Khoi from Lop if Khoi is missing or generic
    let khoi = String(row[khoiKey] || '').trim();
    if (!khoi || khoi.length === 0) {
      const match = lop.match(/\d+/);
      if (match) {
        khoi = match[0].substring(0, 2); // 10, 11, 12
      } else {
        khoi = '12';
      }
    }
    // Standardize khoi format: "10", "11", "12"
    khoi = khoi.replace(/[^0-9]/g, '');
    if (!khoi) khoi = '12';

    const ngaySinh = formatExcelDate(row[ngaySinhKey]);
    let gioiTinh = String(row[gioiTinhKey] || '').trim();
    if (['1', 'nam', 'm', 'male'].includes(gioiTinh.toLowerCase())) gioiTinh = 'Nam';
    else if (['0', 'nu', 'nữ', 'f', 'female'].includes(gioiTinh.toLowerCase())) gioiTinh = 'Nữ';
    else if (!gioiTinh) gioiTinh = 'Nam';

    const danToc = String(row[danTocKey] || '').trim() || 'Kinh';
    const ghiChu = String(row[ghiChuKey] || '').trim();

    if (hoTen || soBD) {
      students.push({
        id: `std_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        soBD,
        hoTen: hoTen || `Học sinh ${index + 1}`,
        lop,
        khoi,
        ngaySinh,
        gioiTinh,
        danToc,
        ghiChu,
      });
    }
  });

  return students;
}

// Generate Excel Sample File for download with formatting
export async function downloadSampleExcelTemplate() {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('DanhSachHocSinh', { views: [{ showGridLines: true }] });

  ws.columns = [
    { header: 'SoBD', key: 'soBD', width: 12 },
    { header: 'HoTen', key: 'hoTen', width: 25 },
    { header: 'Lop', key: 'lop', width: 10 },
    { header: 'Khoi', key: 'khoi', width: 8 },
    { header: 'NgaySinh', key: 'ngaySinh', width: 14 },
    { header: 'GioiTinh', key: 'gioiTinh', width: 10 },
    { header: 'DanToc', key: 'danToc', width: 12 },
    { header: 'GhiChu', key: 'ghiChu', width: 20 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 11, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  const sampleData = [
    { SoBD: '12001', HoTen: 'Nguyễn Văn An', Lop: '12A1', Khoi: '12', NgaySinh: '15/04/2008', GioiTinh: 'Nam', DanToc: 'Kinh', GhiChu: 'Phòng 1' },
    { SoBD: '12002', HoTen: 'Y Blôk Niê', Lop: '12A1', Khoi: '12', NgaySinh: '22/08/2008', GioiTinh: 'Nam', DanToc: 'Gia Rai', GhiChu: '' },
    { SoBD: '12003', HoTen: 'Trần Thị Bích', Lop: '12A1', Khoi: '12', NgaySinh: '10/11/2008', GioiTinh: 'Nữ', DanToc: 'Kinh', GhiChu: '' },
    { SoBD: '12004', HoTen: 'A Dũng', Lop: '12A2', Khoi: '12', NgaySinh: '05/01/2008', GioiTinh: 'Nam', DanToc: 'Ba Na', GhiChu: '' },
    { SoBD: '12005', HoTen: 'Lê Thị Cẩm Duyên', Lop: '12A2', Khoi: '12', NgaySinh: '18/09/2008', GioiTinh: 'Nữ', DanToc: 'Kinh', GhiChu: '' },
    { SoBD: '11001', HoTen: 'Đỗ Hoàng Giang', Lop: '11B1', Khoi: '11', NgaySinh: '09/03/2009', GioiTinh: 'Nam', DanToc: 'Kinh', GhiChu: '' },
    { SoBD: '10001', HoTen: 'Y Hùng Ksor', Lop: '10C1', Khoi: '10', NgaySinh: '14/12/2010', GioiTinh: 'Nam', DanToc: 'Xơ Đăng', GhiChu: '' },
  ];

  sampleData.forEach((item) => {
    const row = ws.addRow([item.SoBD, item.HoTen, item.Lop, item.Khoi, item.NgaySinh, item.GioiTinh, item.DanToc, item.GhiChu]);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.alignment = { horizontal: colNumber === 2 || colNumber === 8 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveBufferAsFile(buffer, 'Mau_Danh_Sach_Hoc_Sinh.xlsx');
}

// Export Rooms to Excel with formatting
export async function exportRoomsToExcel(rooms: RoomAssignment[], schoolName: string, examTitle: string) {
  const workbook = new ExcelJS.Workbook();

  rooms.forEach((room) => {
    const ws = workbook.addWorksheet(`${room.roomCode}_K${room.grade}`.substring(0, 31), { views: [{ showGridLines: true }] });

    ws.columns = [
      { header: 'TT', key: 'tt', width: 6 },
      { header: 'Số BD', key: 'soBD', width: 12 },
      { header: 'Họ và tên', key: 'hoTen', width: 26 },
      { header: 'Lớp', key: 'lop', width: 10 },
      { header: 'Khối', key: 'khoi', width: 8 },
      { header: 'Ngày sinh', key: 'ngaySinh', width: 14 },
      { header: 'Giới tính', key: 'gioiTinh', width: 10 },
      { header: 'Dân tộc', key: 'danToc', width: 12 },
      { header: 'Ghi chú', key: 'ghiChu', width: 15 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', size: 11, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    room.students.forEach((s, idx) => {
      const row = ws.addRow([
        idx + 1,
        s.soBD,
        s.hoTen,
        s.lop,
        s.khoi,
        s.ngaySinh,
        s.gioiTinh,
        s.danToc,
        s.ghiChu || '',
      ]);
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 11 };
        cell.alignment = { horizontal: colNumber === 3 || colNumber === 9 ? 'left' : 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveBufferAsFile(buffer, `Danh_Sach_Phong_Thi_${Date.now()}.xlsx`);
}

// Export Schedules to Excel with formatting
export async function exportSchedulesToExcel(schedules: ExamSchedule[]) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('LichThi', { views: [{ showGridLines: true }] });

  ws.columns = [
    { header: 'TT', key: 'tt', width: 6 },
    { header: 'Khối', key: 'khoi', width: 8 },
    { header: 'Môn kiểm tra', key: 'mon', width: 20 },
    { header: 'Ngày kiểm tra', key: 'ngay', width: 14 },
    { header: 'Buổi kiểm tra', key: 'buoi', width: 12 },
    { header: 'Phòng kiểm tra', key: 'phong', width: 14 },
    { header: 'Địa điểm', key: 'diaDiem', width: 24 },
    { header: 'Thời gian tập trung', key: 'thoiGian', width: 18 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 11, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  schedules.forEach((s, idx) => {
    const row = ws.addRow([
      idx + 1,
      s.grade,
      s.subjectName,
      s.examDate,
      s.session,
      s.roomCode,
      s.location,
      s.assemblyTime,
    ]);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.alignment = { horizontal: [3, 7].includes(colNumber) ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveBufferAsFile(buffer, `Lich_Kiem_Tra_${Date.now()}.xlsx`);
}

// Interface for Grade Entry Export
export interface GradeExportOptions {
  sttMode?: 'per_room' | 'continuous';
  includeRoomSummary?: boolean;
  includeSignatures?: boolean;
  selectedSubjectIds?: string[]; // If specified, only export these subject IDs
}

// Helper to sanitize Excel worksheet name (max 31 chars, no invalid characters)
export function sanitizeSheetName(name: string, fallback: string = 'Sheet'): string {
  if (!name) return fallback;
  const clean = name.replace(/[:\\/?*\[\]]/g, '').trim();
  return (clean || fallback).substring(0, 31);
}

// Helper to save buffer as downloadable file in browser
function saveBufferAsFile(buffer: ExcelJS.Buffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export Grade Entry File to Excel by Grade and Subject (1 Sheet = 1 Subject, Rooms from P1 to Pn)
// EXACT 9 COLUMNS & EXACT BOLD HEADERS + FULL BORDERS LIKE IMAGE:
// TT | Số BD | Họ và tên | Lớp | Ngày sinh | Dân tộc | Khối | Điểm | Ghi chú
export async function exportGradeEntryExcelFile(
  students: Student[],
  config: ExamRoomConfig,
  subjects: Subject[],
  grade: string,
  options: GradeExportOptions = {}
): Promise<{ success: boolean; sheetCount: number; fileName: string; totalExaminees: number }> {
  const {
    sttMode = 'per_room',
    selectedSubjectIds,
  } = options;

  // Filter subjects for the target grade
  let targetSubjects = subjects.filter((s) => !s.grades || s.grades.length === 0 || s.grades.includes(grade));
  if (selectedSubjectIds && selectedSubjectIds.length > 0) {
    targetSubjects = targetSubjects.filter((s) => selectedSubjectIds.includes(s.id));
  }

  // Fallback if no subjects configured
  if (targetSubjects.length === 0) {
    targetSubjects = [{ id: 'default', code: 'CHUNG', name: 'Môn thi chung', grades: [grade] }];
  }

  const workbook = new ExcelJS.Workbook();
  const usedSheetNames = new Set<string>();
  let totalExaminees = 0;
  let sheetsAdded = 0;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Times New Roman',
    size: 11,
    bold: true,
  };

  const roomHeaderFont: Partial<ExcelJS.Font> = {
    name: 'Times New Roman',
    size: 11,
    bold: true,
  };

  const dataFont: Partial<ExcelJS.Font> = {
    name: 'Times New Roman',
    size: 11,
    bold: false,
  };

  targetSubjects.forEach((subject) => {
    // Filter students for this grade
    let gradeStudents = students.filter((s) => (s.khoi || '').trim() === grade);

    // Filter by class-subject restriction if defined
    if (config.classSubjects) {
      gradeStudents = gradeStudents.filter((s) => {
        const allowed = config.classSubjects?.[s.lop];
        return !allowed || allowed.length === 0 || allowed.includes(subject.id);
      });
    }

    if (gradeStudents.length === 0) return;

    // Arrange rooms for this subject and grade
    const maxPerRoom = config.gradeConfigs?.[grade]?.maxPerRoom || config.defaultMaxPerRoom || 24;
    
    // Check manual room plan
    const planKey = `${grade}_${subject.id}`;
    const manualPlan = (config.manualRoomPlans && config.manualRoomPlans[planKey]) ||
      (config.manualRoomPlans && config.manualRoomPlans[grade]) ||
      (config.manualRoomPlans && config.manualRoomPlans[`${grade}_all`]);

    const prefix = config.roomPrefix || 'P';
    const roomList: { roomCode: string; roomNumber: number; location: string; students: Student[] }[] = [];

    // Sort students
    const sortedStudents = [...gradeStudents].sort((a, b) => {
      if (config.sortBy === 'soBD') {
        return a.soBD.localeCompare(b.soBD, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.hoTen.localeCompare(b.hoTen, 'vi', { sensitivity: 'base' });
    });

    if (manualPlan && manualPlan.rooms && manualPlan.rooms.length > 0) {
      let stIdx = 0;
      manualPlan.rooms.forEach((spec: ManualRoomSpec, rIdx: number) => {
        const cap = Math.max(0, spec.capacity || 0);
        const rStudents = sortedStudents.slice(stIdx, stIdx + cap);
        stIdx += cap;
        const rNum = spec.roomNumber || rIdx + 1;
        const rCode = spec.roomCode || `${prefix}${rNum}`;
        const loc = spec.location || `Phòng ${rNum}`;
        if (rStudents.length > 0) {
          roomList.push({ roomCode: rCode, roomNumber: rNum, location: loc, students: rStudents });
        }
      });
      // Handle remaining students
      if (stIdx < sortedStudents.length) {
        const remaining = sortedStudents.slice(stIdx);
        if (roomList.length > 0) {
          roomList[roomList.length - 1].students.push(...remaining);
        } else {
          const nextNum = manualPlan.rooms.length + 1;
          roomList.push({
            roomCode: `${prefix}${nextNum}`,
            roomNumber: nextNum,
            location: `Phòng ${nextNum}`,
            students: remaining,
          });
        }
      }
    } else {
      // Auto room plan
      const numRooms = Math.ceil(sortedStudents.length / maxPerRoom);
      for (let r = 0; r < numRooms; r++) {
        const start = r * maxPerRoom;
        const end = Math.min(start + maxPerRoom, sortedStudents.length);
        const rStudents = sortedStudents.slice(start, end);
        if (rStudents.length > 0) {
          const rNum = r + 1;
          roomList.push({
            roomCode: `${prefix}${rNum}`,
            roomNumber: rNum,
            location: `Phòng ${rNum}`,
            students: rStudents,
          });
        }
      }
    }

    if (roomList.length === 0) return;

    // Ensure rooms are sorted P1, P2, P3... to the end
    roomList.sort((a, b) => a.roomNumber - b.roomNumber);

    // Unique Sheet Name (1 sheet = 1 subject name)
    let baseSheetName = sanitizeSheetName(subject.name, `Mon_${subject.code || sheetsAdded + 1}`);
    let finalSheetName = baseSheetName;
    let counter = 1;
    while (usedSheetNames.has(finalSheetName.toLowerCase())) {
      finalSheetName = `${baseSheetName.substring(0, 28)}_${counter++}`;
    }
    usedSheetNames.add(finalSheetName.toLowerCase());

    const ws = workbook.addWorksheet(finalSheetName, {
      views: [{ showGridLines: true }]
    });

    // Column widths matching exact layout
    ws.columns = [
      { key: 'tt', width: 6 },        // TT
      { key: 'soBD', width: 12 },      // Số BD
      { key: 'hoTen', width: 26 },     // Họ và tên
      { key: 'lop', width: 10 },       // Lớp
      { key: 'ngaySinh', width: 14 },  // Ngày sinh
      { key: 'danToc', width: 12 },    // Dân tộc
      { key: 'khoi', width: 8 },       // Khối
      { key: 'diem', width: 10 },      // Điểm
      { key: 'ghiChu', width: 16 },    // Ghi chú
    ];

    // Row 1: Header row (EXACTLY 9 columns) - Bold and Borders
    const headerRow = ws.addRow([
      'TT',
      'Số BD',
      'Họ và tên',
      'Lớp',
      'Ngày sinh',
      'Dân tộc',
      'Khối',
      'Điểm',
      'Ghi chú',
    ]);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
    });

    let overallStt = 1;
    let subjectExaminees = 0;

    // Display rooms from P1 to the end
    roomList.forEach((room) => {
      // Room Code Row (e.g. P1, P2...) - Bold with borders across all 9 cells
      const roomRow = ws.addRow([room.roomCode, '', '', '', '', '', '', '', '']);
      roomRow.height = 20;

      roomRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = roomHeaderFont;
        cell.border = thinBorder;
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      // Student Rows
      room.students.forEach((st, sIdx) => {
        const stt = sttMode === 'per_room' ? (sIdx + 1) : overallStt++;
        const row = ws.addRow([
          stt,
          st.soBD,
          st.hoTen,
          st.lop,
          st.ngaySinh || '',
          st.danToc || 'Kinh',
          st.khoi || grade,
          '', // Điểm (Ô trống để nhập điểm)
          st.ghiChu || '',
        ]);
        row.height = 20;

        const alignments: ('center' | 'left')[] = [
          'center', // TT
          'center', // Số BD
          'left',   // Họ và tên
          'center', // Lớp
          'center', // Ngày sinh
          'center', // Dân tộc
          'center', // Khối
          'center', // Điểm
          'left',   // Ghi chú
        ];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = dataFont;
          cell.border = thinBorder;
          const align = alignments[colNumber - 1] || 'center';
          cell.alignment = {
            horizontal: align,
            vertical: 'middle',
          };
        });

        subjectExaminees++;
      });
    });

    sheetsAdded++;
    totalExaminees += subjectExaminees;
  });

  if (sheetsAdded === 0) {
    throw new Error(`Không tìm thấy dữ liệu học sinh hoặc phòng thi cho Khối ${grade}!`);
  }

  const fileName = `File_Nhap_Diem_Khoi_${grade}_${Date.now()}.xlsx`;

  // Write and download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  saveBufferAsFile(buffer, fileName);

  return {
    success: true,
    sheetCount: sheetsAdded,
    fileName,
    totalExaminees,
  };
}

