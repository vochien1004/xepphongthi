export interface Student {
  id: string;
  soBD: string;
  hoTen: string;
  lop: string;
  khoi: string;
  ngaySinh: string;
  gioiTinh: string;
  danToc: string;
  ghiChu?: string;
}

export interface ManualRoomSpec {
  roomCode: string; // e.g. 'P1'
  roomNumber: number; // e.g. 1
  capacity: number; // e.g. 24
  location?: string; // e.g. "Phòng 1 (Lớp 12A1)"
}

export interface GradeSubjectRoomPlan {
  grade: string;
  subjectId?: string; // optional: specific subject ID or 'all'/'default'
  roomCount: number;
  rooms: ManualRoomSpec[];
}

export interface ExamRoomConfig {
  defaultMaxPerRoom: number;
  sortBy: 'soBD' | 'ten' | 'lop';
  roomPrefix: string;
  schoolName: string;
  subDepartment: string;
  examTitle: string;
  creatorName: string;
  gradeConfigs: Record<string, { maxPerRoom: number }>;
  classSubjects?: Record<string, string[]>; // mapping: className -> array of subjectIds
  customClasses?: string[]; // user defined class names
  manualRoomPlans?: Record<string, GradeSubjectRoomPlan>; // key: `${grade}` or `${grade}_${subjectId}`
  allocationMode?: 'manual' | 'auto';
  examName?: string; // e.g. "KIỂM TRA CUỐI HỌC KỲ"
  semester?: string; // e.g. "HỌC KỲ I" or ""
  schoolYear?: string; // e.g. "2025 - 2026"
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  grades: string[]; // e.g. ['10', '11', '12']
}

export interface ExamSchedule {
  id: string;
  subjectName: string;
  grade: string;
  examDate: string; // DD/MM/YYYY or DD/MM/YY
  session: 'Sáng' | 'Chiều';
  roomCode: string; // P1, P2, ...
  location: string; // e.g. "Phòng 1 (Lớp 12B1)"
  assemblyTime: string; // e.g. "13h15", "07h15"
  examDuration?: string; // e.g. "90 phút"
}

export interface RoomAssignment {
  roomCode: string;
  roomNumber: number;
  grade: string;
  students: Student[];
  location?: string;
  subjectId?: string;
  subjectName?: string;
}

export interface FirebaseSettings {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  isConfigured: boolean;
}
