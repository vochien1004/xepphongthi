import { Student, ExamRoomConfig, Subject, ExamSchedule } from '../types';

export const INITIAL_CONFIG: ExamRoomConfig = {
  defaultMaxPerRoom: 24,
  sortBy: 'soBD',
  roomPrefix: 'P',
  schoolName: 'TRƯỜNG PT DTNT THPT SA THẦY',
  subDepartment: 'SỞ GIÁO DỤC ĐÀO TẠO QUẢNG NGÃI',
  examName: 'KIỂM TRA CUỐI HỌC KỲ',
  semester: '',
  schoolYear: '2025 - 2026',
  examTitle: 'KIỂM TRA CUỐI HỌC KỲ - NĂM HỌC 2025 - 2026',
  creatorName: 'VÕ CHIẾN',
  gradeConfigs: {
    '10': { maxPerRoom: 24 },
    '11': { maxPerRoom: 24 },
    '12': { maxPerRoom: 24 },
  },
  classSubjects: {},
  customClasses: [],
};

// Danh sách môn thi mặc định (trống cho đến khi thêm/tải lên)
export const INITIAL_SUBJECTS: Subject[] = [];

// Không chứa bất kỳ dữ liệu học sinh mẫu nào (chờ tải file lên)
export const INITIAL_STUDENTS: Student[] = [];

// Không chứa bất kỳ lịch thi mẫu nào
export const INITIAL_SCHEDULES: ExamSchedule[] = [];
