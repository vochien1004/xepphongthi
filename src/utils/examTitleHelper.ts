import { ExamRoomConfig } from '../types';

export function parseExamConfig(config?: Partial<ExamRoomConfig>) {
  let examName = config?.examName;
  let semester = config?.semester ?? '';
  let schoolYear = config?.schoolYear;

  // If examName or schoolYear are missing, parse from existing config?.examTitle
  if (!examName || !schoolYear) {
    const raw = (config?.examTitle || 'KIỂM TRA CUỐI HỌC KỲ - NĂM HỌC 2025 - 2026')
      .replace(/^DANH SÁCH HỌC SINH DỰ /i, '')
      .replace(/^PHIẾU THU BÀI - /i, '')
      .replace(/^PHIẾU THU BÀI /i, '')
      .replace(/^LỊCH KIỂM TRA /i, 'KIỂM TRA ')
      .trim();

    const parts = raw.split(/-\s*NĂM HỌC\s*/i);
    if (parts.length >= 2) {
      examName = parts[0].trim();
      schoolYear = parts[1].trim();
    } else {
      examName = raw || 'KIỂM TRA CUỐI HỌC KỲ';
      schoolYear = '2025 - 2026';
    }
  }

  return {
    examName: examName || 'KIỂM TRA CUỐI HỌC KỲ',
    semester: semester || '',
    schoolYear: schoolYear || '2025 - 2026',
  };
}

export function buildFullExamTitle(examName: string, semester?: string, schoolYear?: string): string {
  const cleanName = (examName || 'KIỂM TRA CUỐI HỌC KỲ').trim();
  const cleanSem = (semester || '').trim();
  const cleanYear = (schoolYear || '2025 - 2026').trim();

  let core = cleanName;
  if (cleanSem && !cleanName.toLowerCase().includes(cleanSem.toLowerCase())) {
    core = `${core} ${cleanSem}`;
  }
  if (cleanYear) {
    core = `${core} - NĂM HỌC ${cleanYear}`;
  }
  return core;
}

export function getExamTitles(config?: Partial<ExamRoomConfig>) {
  const { examName, semester, schoolYear } = parseExamConfig(config);
  const core = buildFullExamTitle(examName, semester, schoolYear);

  return {
    examName,
    semester,
    schoolYear,
    fullExamTitle: core,
    roomListTitle: `DANH SÁCH HỌC SINH DỰ ${core}`,
    submissionSheetTitle: `PHIẾU THU BÀI ${core}`,
    studentScheduleTitle: `LỊCH ${core}`,
    gradeEntrySheetTitle: `BẢNG GHI ĐIỂM ${core}`,
  };
}
