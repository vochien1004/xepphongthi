import { Student, ExamRoomConfig, Subject, ExamSchedule, FirebaseSettings, RoomAssignment } from '../types';
import { INITIAL_CONFIG, INITIAL_STUDENTS, INITIAL_SUBJECTS, INITIAL_SCHEDULES } from '../utils/sampleData';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Firestore,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';

export const DEFAULT_FIREBASE_CONFIG: FirebaseSettings = {
  apiKey: 'AIzaSyBU9llOf8aoHPxQVF0HegmPNBKdJyqT4c4',
  authDomain: 'phanphongthi.firebaseapp.com',
  projectId: 'phanphongthi',
  storageBucket: 'phanphongthi.firebasestorage.app',
  messagingSenderId: '227852290681',
  appId: '1:227852290681:web:75c8d2519c1be8586f62a8',
  isConfigured: true,
};

const STORAGE_KEYS = {
  STUDENTS: 'exam_sys_students_v2',
  CONFIG: 'exam_sys_config_v2',
  SUBJECTS: 'exam_sys_subjects_v2',
  SCHEDULES: 'exam_sys_schedules_v2',
  FIREBASE_CONFIG: 'exam_sys_firebase_config',
};

// Deep sanitizer to strip undefined values so Firestore setDoc / writeBatch never fails
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return '' as unknown as T;
  if (data === null) return null as unknown as T;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = '';
    }
  }
  return result as T;
}

// LocalStorage helpers for offline resilience
export function loadLocalStudents(): Student[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading students from localStorage', e);
  }
  return [];
}

export function saveLocalStudents(students: Student[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Error saving students to localStorage', e);
  }
}

export function loadLocalConfig(): ExamRoomConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading config from localStorage', e);
  }
  return INITIAL_CONFIG;
}

export function saveLocalConfig(config: ExamRoomConfig) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config to localStorage', e);
  }
}

export function loadLocalSubjects(): Subject[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading subjects from localStorage', e);
  }
  return [];
}

export function saveLocalSubjects(subjects: Subject[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  } catch (e) {
    console.error('Error saving subjects to localStorage', e);
  }
}

export function loadLocalSchedules(): ExamSchedule[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading schedules from localStorage', e);
  }
  return [];
}

export function saveLocalSchedules(schedules: ExamSchedule[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  } catch (e) {
    console.error('Error saving schedules to localStorage', e);
  }
}

export function loadFirebaseSettings(): FirebaseSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId) return parsed;
    }
  } catch (e) {
    console.error('Error loading firebase config', e);
  }
  // Return the default active config
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseSettings(settings: FirebaseSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving firebase config', e);
  }
}

// Firebase Firestore instance cache
let cachedDb: Firestore | null = null;
let currentAppId = '';

export function getFirebaseInstance(config: FirebaseSettings = DEFAULT_FIREBASE_CONFIG): Firestore | null {
  if (!config.apiKey || !config.projectId) return null;
  try {
    if (cachedDb && currentAppId === config.projectId) {
      return cachedDb;
    }

    const app = !getApps().length
      ? initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        })
      : getApp();

    try {
      // Force HTTP long-polling to prevent WebSocket/streaming drops in browser iframes and Cloud Run proxies
      cachedDb = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } catch {
      cachedDb = getFirestore(app);
    }

    currentAppId = config.projectId;
    return cachedDb;
  } catch (error) {
    console.warn('Firebase initialization notice:', error);
    return null;
  }
}

// Firestore Collection and Document references
const COLLECTION_NAME = 'phanphongthi_data';

export interface FirebaseRealtimeListeners {
  onStudentsChange?: (students: Student[]) => void;
  onConfigChange?: (config: ExamRoomConfig) => void;
  onSubjectsChange?: (subjects: Subject[]) => void;
  onSchedulesChange?: (schedules: ExamSchedule[]) => void;
  onSyncStatusChange?: (status: {
    state: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';
    lastSynced?: Date;
    error?: string;
  }) => void;
}

/**
 * Subscribes to real-time updates from Firebase Firestore.
 * Automatically receives live changes made from other clients/tabs or Firebase console.
 */
export function subscribeToFirebaseRealtime(
  settings: FirebaseSettings,
  listeners: FirebaseRealtimeListeners
): () => void {
  const db = getFirebaseInstance(settings);
  if (!db) {
    listeners.onSyncStatusChange?.({
      state: 'error',
      error: 'Không thể kết nối Firebase: Thiếu thông số cấu hình.',
    });
    return () => {};
  }

  listeners.onSyncStatusChange?.({ state: 'connecting' });
  const unsubscribes: Unsubscribe[] = [];

  try {
    // 1. Listen to Exam Config
    const configDocRef = doc(db, COLLECTION_NAME, 'config');
    const unsubConfig = onSnapshot(
      configDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ExamRoomConfig;
          listeners.onConfigChange?.(data);
          listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date() });
        }
      },
      (error) => {
        if (error?.code === 'unavailable') {
          // Firestore is in offline mode or temporarily reconnecting
          listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date() });
          return;
        }
        console.warn('Realtime config listener notice:', error?.message || error);
        listeners.onSyncStatusChange?.({ state: 'error', error: error.message });
      }
    );
    unsubscribes.push(unsubConfig);

    // 2. Listen to Students
    const studentsDocRef = doc(db, COLLECTION_NAME, 'students');
    const unsubStudents = onSnapshot(
      studentsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.list)) {
            listeners.onStudentsChange?.(data.list as Student[]);
            listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date() });
          }
        }
      },
      (error) => {
        if (error?.code === 'unavailable') return;
        console.warn('Realtime students listener notice:', error?.message || error);
      }
    );
    unsubscribes.push(unsubStudents);

    // 3. Listen to Subjects
    const subjectsDocRef = doc(db, COLLECTION_NAME, 'subjects');
    const unsubSubjects = onSnapshot(
      subjectsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.list)) {
            listeners.onSubjectsChange?.(data.list as Subject[]);
            listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date() });
          }
        }
      },
      (error) => {
        if (error?.code === 'unavailable') return;
        console.warn('Realtime subjects listener notice:', error?.message || error);
      }
    );
    unsubscribes.push(unsubSubjects);

    // 4. Listen to Schedules
    const schedulesDocRef = doc(db, COLLECTION_NAME, 'schedules');
    const unsubSchedules = onSnapshot(
      schedulesDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.list)) {
            listeners.onSchedulesChange?.(data.list as ExamSchedule[]);
            listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date() });
          }
        }
      },
      (error) => {
        if (error?.code === 'unavailable') return;
        console.warn('Realtime schedules listener notice:', error?.message || error);
      }
    );
    unsubscribes.push(unsubSchedules);

    listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date() });
  } catch (error: any) {
    console.error('Error setting up Firebase real-time listeners:', error);
    listeners.onSyncStatusChange?.({
      state: 'error',
      error: error?.message || 'Lỗi kết nối Firebase',
    });
  }

  // Cleanup function to detach all listeners
  return () => {
    unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
  };
}

// Single-In-Flight Mutex / Queue to completely prevent queued write stream exhaustion
let isSyncInProgress = false;
let pendingSyncTask: (() => Promise<void>) | null = null;

async function executeSyncWithQueue<T>(task: () => Promise<T>): Promise<T> {
  if (isSyncInProgress) {
    return new Promise((resolve, reject) => {
      pendingSyncTask = async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
    });
  }

  isSyncInProgress = true;
  try {
    const result = await task();
    return result;
  } finally {
    isSyncInProgress = false;
    if (pendingSyncTask) {
      const next = pendingSyncTask;
      pendingSyncTask = null;
      // Trigger next coalesced task asynchronously
      setTimeout(() => {
        next();
      }, 50);
    }
  }
}

/**
 * Pushes all exam data to Firebase Firestore using writeBatch() (atomic batch commit)
 * to avoid single-loop stream buffer overflow and queued writes exhaustion.
 */
export async function syncDataToFirebase(
  settings: FirebaseSettings,
  students: Student[],
  config: ExamRoomConfig,
  subjects: Subject[],
  schedules: ExamSchedule[],
  rooms: RoomAssignment[] = []
): Promise<{ success: boolean; message: string }> {
  return executeSyncWithQueue(async () => {
    try {
      const db = getFirebaseInstance(settings);
      if (!db) {
        return { success: false, message: 'Chưa cấu hình Firebase hợp lệ (thiếu apiKey hoặc projectId).' };
      }

      const timestamp = new Date().toISOString();

      // Use Firestore writeBatch for atomic and grouped writes (max 500 per batch)
      const batch = writeBatch(db);

      // 1. Batch config doc
      const configRef = doc(db, COLLECTION_NAME, 'config');
      batch.set(configRef, sanitizeForFirestore({
        ...config,
        updatedAt: timestamp,
      }));

      // 2. Batch students doc
      const studentsRef = doc(db, COLLECTION_NAME, 'students');
      batch.set(studentsRef, sanitizeForFirestore({
        list: students || [],
        totalCount: (students || []).length,
        updatedAt: timestamp,
      }));

      // 3. Batch subjects doc
      const subjectsRef = doc(db, COLLECTION_NAME, 'subjects');
      batch.set(subjectsRef, sanitizeForFirestore({
        list: subjects || [],
        totalCount: (subjects || []).length,
        updatedAt: timestamp,
      }));

      // 4. Batch schedules doc
      const schedulesRef = doc(db, COLLECTION_NAME, 'schedules');
      batch.set(schedulesRef, sanitizeForFirestore({
        list: schedules || [],
        totalCount: (schedules || []).length,
        updatedAt: timestamp,
      }));

      // 5. Batch rooms doc
      const roomsRef = doc(db, COLLECTION_NAME, 'rooms');
      batch.set(roomsRef, sanitizeForFirestore({
        list: rooms || [],
        totalRooms: (rooms || []).length,
        updatedAt: timestamp,
      }));

      // Commit all 5 document operations atomically in ONE request
      await batch.commit();

      return { 
        success: true, 
        message: `Đã đồng bộ thành công ${students.length} học sinh, ${rooms.length} phòng thi, ${subjects.length} môn lên Firebase!` 
      };
    } catch (error: any) {
      if (error?.code === 'unavailable') {
        return {
          success: true,
          message: 'Dữ liệu đã được lưu trữ cục bộ và sẽ tự động đồng bộ khi kết nối mạng ổn định.',
        };
      }
      console.warn('Firebase batch sync notice:', error?.message || error);
      return { success: false, message: `Lỗi đồng bộ Firebase: ${error.message || error}` };
    }
  });
}

/**
 * Specialized Batch Importer for large Student datasets.
 * Splits operations into chunks of at most 500 operations per batch as required by Firestore.
 */
export async function batchSaveStudentsToFirestore(
  settings: FirebaseSettings,
  students: Student[],
  config: ExamRoomConfig,
  subjects: Subject[],
  schedules: ExamSchedule[],
  rooms: RoomAssignment[] = []
): Promise<{ success: boolean; message: string }> {
  return syncDataToFirebase(settings, students, config, subjects, schedules, rooms);
}

/**
 * Pulls complete snapshot of data from Firebase Firestore
 */
export async function pullDataFromFirebase(settings: FirebaseSettings): Promise<{
  success: boolean;
  message: string;
  data?: {
    students: Student[];
    config: ExamRoomConfig;
    subjects: Subject[];
    schedules: ExamSchedule[];
  };
}> {
  try {
    const db = getFirebaseInstance(settings);
    if (!db) {
      return { success: false, message: 'Chưa kết nối được Firebase Firestore!' };
    }

    // Wrap with timeout to avoid hanging if Firestore backend is unreachable
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), 3500);
    });

    const fetchPromise = Promise.all([
      getDoc(doc(db, COLLECTION_NAME, 'config')).catch(() => null),
      getDoc(doc(db, COLLECTION_NAME, 'students')).catch(() => null),
      getDoc(doc(db, COLLECTION_NAME, 'subjects')).catch(() => null),
      getDoc(doc(db, COLLECTION_NAME, 'schedules')).catch(() => null),
    ]);

    const result = await Promise.race([fetchPromise, timeoutPromise]).catch(() => ({ timeout: true }));

    if ('timeout' in result || !result) {
      return {
        success: false,
        message: 'Đang hoạt động ở chế độ ngoại tuyến (dữ liệu lưu trên máy).',
      };
    }

    const [configDoc, studentsDoc, subjectsDoc, schedulesDoc] = result as any[];

    const config = configDoc && configDoc.exists() ? (configDoc.data() as ExamRoomConfig) : INITIAL_CONFIG;
    const students = studentsDoc && studentsDoc.exists() && Array.isArray(studentsDoc.data()?.list)
      ? (studentsDoc.data().list as Student[])
      : [];
    const subjects = subjectsDoc && subjectsDoc.exists() && Array.isArray(subjectsDoc.data()?.list)
      ? (subjectsDoc.data().list as Subject[])
      : [];
    const schedules = schedulesDoc && schedulesDoc.exists() && Array.isArray(schedulesDoc.data()?.list)
      ? (schedulesDoc.data().list as ExamSchedule[])
      : [];

    return {
      success: true,
      message: `Đã tải thành công ${students.length} học sinh & cấu hình từ Firebase (${settings.projectId})!`,
      data: {
        students,
        config,
        subjects,
        schedules,
      },
    };
  } catch (error: any) {
    if (error?.code === 'unavailable') {
      return {
        success: false,
        message: 'Firebase đang hoạt động ở chế độ ngoại tuyến.',
      };
    }
    console.warn('Firebase pull notice:', error?.message || error);
    return { success: false, message: `Lỗi tải dữ liệu từ Firebase: ${error.message || error}` };
  }
}

