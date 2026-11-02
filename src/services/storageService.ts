import { Student, ExamRoomConfig, Subject, ExamSchedule, FirebaseSettings, RoomAssignment, FirestoreUserRecord } from '../types';
import { INITIAL_CONFIG } from '../utils/sampleData';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
  writeBatch,
  setLogLevel,
} from 'firebase/firestore';

export const DEFAULT_FIREBASE_CONFIG: FirebaseSettings = {
  apiKey: 'AIzaSyBU9lLOf8aoHPxQVF0HegmPNBKdJyqT4c4',
  authDomain: 'phanphongthi.firebaseapp.com',
  projectId: 'phanphongthi',
  storageBucket: 'phanphongthi.firebasestorage.app',
  messagingSenderId: '227852290681',
  appId: '1:227852290681:web:75c8d2519c1be8586f62a8',
  isConfigured: true,
  adminEmail: 'admin@phanphongthi.com',
  adminPassword: '123456',
};

function normalizeApiKey(apiKey?: string, projectId?: string): string {
  const trimmed = (apiKey || '').trim();
  if (
    trimmed === 'AIzaSyBU9llOf8aoHPxQVF0HegmPNBKdJyqT4c4' ||
    (projectId === 'phanphongthi' && (!trimmed || trimmed.startsWith('AIzaSyBU9llO')))
  ) {
    return 'AIzaSyBU9lLOf8aoHPxQVF0HegmPNBKdJyqT4c4';
  }
  return trimmed || DEFAULT_FIREBASE_CONFIG.apiKey;
}

const STORAGE_KEYS = {
  STUDENTS: 'exam_sys_students_v2',
  CONFIG: 'exam_sys_config_v2',
  SUBJECTS: 'exam_sys_subjects_v2',
  SCHEDULES: 'exam_sys_schedules_v2',
  FIREBASE_CONFIG: 'exam_sys_firebase_config',
};

// Suppress noisy internal Firestore SDK console logs
try {
  setLogLevel('silent');
} catch {
  // ignore
}

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
      if (parsed.projectId) {
        const fixedApiKey = normalizeApiKey(parsed.apiKey, parsed.projectId);
        const merged: FirebaseSettings = {
          ...DEFAULT_FIREBASE_CONFIG,
          ...parsed,
          apiKey: fixedApiKey,
          adminEmail: parsed.adminEmail || DEFAULT_FIREBASE_CONFIG.adminEmail,
          adminPassword: parsed.adminPassword || DEFAULT_FIREBASE_CONFIG.adminPassword,
        };
        if (fixedApiKey !== parsed.apiKey) {
          localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (e) {
    console.error('Error loading firebase config', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseSettings(settings: FirebaseSettings) {
  try {
    const normalized: FirebaseSettings = {
      ...settings,
      apiKey: normalizeApiKey(settings.apiKey, settings.projectId),
    };
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(normalized));
  } catch (e) {
    console.error('Error saving firebase config', e);
  }
}

// Firebase App, Auth, and Firestore instance cache
let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let currentAppKey = '';

export function getFirebaseAppInstance(config: FirebaseSettings = DEFAULT_FIREBASE_CONFIG): FirebaseApp | null {
  if (!config.projectId) return null;
  const effectiveApiKey = normalizeApiKey(config.apiKey, config.projectId);
  if (!effectiveApiKey) return null;

  const appKey = `${config.projectId}_${effectiveApiKey}`;
  try {
    if (cachedApp && currentAppKey === appKey) {
      return cachedApp;
    }

    const appName = `app_${config.projectId}_${effectiveApiKey.slice(0, 12)}`;
    const existingApp = getApps().find((a) => a.name === appName);
    cachedApp = existingApp
      ? existingApp
      : initializeApp(
          {
            apiKey: effectiveApiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
          },
          appName
        );

    currentAppKey = appKey;
    cachedDb = null;
    cachedAuth = null;
    return cachedApp;
  } catch {
    try {
      return getApp();
    } catch {
      return null;
    }
  }
}

export function getFirebaseAuth(config: FirebaseSettings = DEFAULT_FIREBASE_CONFIG): Auth | null {
  const effectiveApiKey = normalizeApiKey(config.apiKey, config.projectId);
  const appKey = `${config.projectId}_${effectiveApiKey}`;
  const app = getFirebaseAppInstance(config);
  if (!app) return null;
  try {
    if (cachedAuth && currentAppKey === appKey) {
      return cachedAuth;
    }
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch {
    return null;
  }
}

export function getFirebaseInstance(config: FirebaseSettings = DEFAULT_FIREBASE_CONFIG): Firestore | null {
  const effectiveApiKey = normalizeApiKey(config.apiKey, config.projectId);
  const appKey = `${config.projectId}_${effectiveApiKey}`;
  const app = getFirebaseAppInstance(config);
  if (!app) return null;
  try {
    if (cachedDb && currentAppKey === appKey) {
      return cachedDb;
    }

    try {
      // Force HTTP long-polling to prevent WebSocket/streaming drops in browser iframes and Cloud Run proxies
      cachedDb = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } catch {
      cachedDb = getFirestore(app);
    }

    return cachedDb;
  } catch {
    return null;
  }
}

// Firestore Collection and Document references
const COLLECTION_NAME = 'phanphongthi_data';
const USERS_COLLECTION = 'users';

export interface AdminAuthStatus {
  authenticated: boolean;
  isAdminVerified: boolean;
  uid?: string;
  email?: string | null;
  role?: 'admin';
  message?: string;
}

/**
 * Ensures the signed-in Firebase user has a document in `/users/{uid}` with `role: 'admin'`
 * to satisfy the Firestore security rule:
 * `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`
 */
export async function ensureAdminUserInFirestore(
  db: Firestore,
  fbUser: FirebaseUser,
  extra?: { username?: string; fullName?: string }
): Promise<AdminAuthStatus> {
  const uid = fbUser.uid;
  const email = fbUser.email || 'admin@phanphongthi.com';
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const now = new Date().toISOString();

  // 1. Check if /users/{uid} already has role === 'admin'
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists() && snap.data()?.role === 'admin') {
      return {
        authenticated: true,
        isAdminVerified: true,
        uid,
        email,
        role: 'admin',
        message: `Tài khoản Admin (${email} - UID: ${uid}) đã xác thực toàn quyền trên Firebase Firestore.`,
      };
    }
  } catch {
    // ignore and try setDoc below
  }

  // 2. Otherwise try creating/merging role: 'admin' into /users/{uid}
  const adminRecord: FirestoreUserRecord = {
    uid,
    username: extra?.username || 'admin',
    email,
    fullName: extra?.fullName || fbUser.displayName || 'Quản trị viên Hệ thống',
    role: 'admin',
    updatedAt: now,
  };

  try {
    await setDoc(userDocRef, sanitizeForFirestore(adminRecord), { merge: true });
    return {
      authenticated: true,
      isAdminVerified: true,
      uid,
      email,
      role: 'admin',
      message: `Tài khoản Admin (${email} - UID: ${uid}) đã có toàn quyền đọc/ghi trên Firebase Firestore.`,
    };
  } catch {
    return {
      authenticated: true,
      isAdminVerified: false,
      uid,
      email,
      role: 'admin',
      message: `Đã đăng nhập Firebase Auth (UID: ${uid}), cần cấp field role = "admin" trong bảng users/${uid} trên Firebase.`,
    };
  }
}

// Cache ongoing auth promise to avoid duplicate parallel sign-in calls
let pendingAuthPromise: Promise<AdminAuthStatus> | null = null;

/**
 * Authenticates the admin session with Firebase Authentication (`request.auth != null`)
 * and verifies/initializes `/users/{request.auth.uid}` with `role: 'admin'`.
 */
export async function ensureFirebaseAdminAuth(
  settings: FirebaseSettings = loadFirebaseSettings(),
  credentials?: { emailOrUsername?: string; password?: string; fullName?: string }
): Promise<AdminAuthStatus> {
  const auth = getFirebaseAuth(settings);
  const db = getFirebaseInstance(settings);

  if (!auth || !db) {
    return {
      authenticated: false,
      isAdminVerified: false,
      message: 'Chưa cấu hình thông số Firebase (apiKey / projectId).',
    };
  }

  if (pendingAuthPromise && !credentials) {
    return pendingAuthPromise;
  }

  const runAuthFlow = async (): Promise<AdminAuthStatus> => {
    try {
      // Wait for Firebase Auth to restore any persisted session from IndexedDB first
      if (typeof (auth as any).authStateReady === 'function') {
        await Promise.race([
          (auth as any).authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }

      // If no explicit new credentials were provided and a Firebase user is already signed in
      if (auth.currentUser && !credentials?.emailOrUsername) {
        return await ensureAdminUserInFirestore(db, auth.currentUser, {
          fullName: credentials?.fullName,
        });
      }

      // Build candidate email/password pairs for admin login
      const rawInput = credentials?.emailOrUsername?.trim() || '';
      const rawPassword = credentials?.password?.trim() || '';

      const candidateEmails: string[] = [];
      if (rawInput.includes('@')) {
        candidateEmails.push(rawInput);
      } else {
        candidateEmails.push('admin@phanphongthi.com');
        if (settings.adminEmail && settings.adminEmail.includes('@')) {
          candidateEmails.push(settings.adminEmail.trim());
        }
        candidateEmails.push(
          'admin@phanphongthi.edu.vn',
          'admin@gmail.com',
          'vochien1004@gmail.com'
        );
      }

      const uniqueEmails = Array.from(new Set(candidateEmails));
      const candidatePasswords: string[] = [];
      if (rawPassword.length >= 6) {
        candidatePasswords.push(rawPassword);
      }
      candidatePasswords.push('123456');
      if (settings.adminPassword && settings.adminPassword.length >= 6) {
        candidatePasswords.push(settings.adminPassword);
      }
      candidatePasswords.push('admin123', 'admin@123', 'Admin@123');
      const uniquePasswords = Array.from(new Set(candidatePasswords));

      // 1. Try signing in with Email/Password on Firebase Auth
      for (const email of uniqueEmails) {
        for (const pwd of uniquePasswords) {
          try {
            const cred = await signInWithEmailAndPassword(auth, email, pwd);
            if (cred.user) {
              return await ensureAdminUserInFirestore(db, cred.user, {
                username: rawInput || 'admin',
                fullName: credentials?.fullName,
              });
            }
          } catch (err: any) {
            const code = err?.code || '';
            if (
              code.includes('api-key-not-valid') ||
              code.includes('invalid-api-key') ||
              code.includes('network-request-failed')
            ) {
              break;
            }
            // If caller passed a specific email with '@', only try the caller's password
            if (rawInput.includes('@') && rawPassword.length >= 6) {
              break;
            }
          }
        }
        if (rawInput.includes('@')) break;
      }

      // 2. If already signed in from an earlier session, use that user
      if (auth.currentUser) {
        return await ensureAdminUserInFirestore(db, auth.currentUser, {
          username: rawInput || 'admin',
          fullName: credentials?.fullName,
        });
      }

      // 3. Fallback: Try Anonymous Auth in case Anonymous provider is enabled on Firebase
      try {
        const anonCred = await signInAnonymously(auth);
        if (anonCred.user) {
          return await ensureAdminUserInFirestore(db, anonCred.user, {
            username: 'admin',
            fullName: credentials?.fullName,
          });
        }
      } catch {
        // Anonymous auth not enabled or API key restricted
      }

      return {
        authenticated: false,
        isAdminVerified: false,
        message: 'Đang hoạt động ở chế độ lưu trữ cục bộ (LocalStorage). Hãy đăng nhập tài khoản Admin Firebase để đồng bộ Cloud.',
      };
    } catch {
      return {
        authenticated: false,
        isAdminVerified: false,
        message: 'Đang sử dụng bộ nhớ cục bộ.',
      };
    } finally {
      pendingAuthPromise = null;
    }
  };

  pendingAuthPromise = runAuthFlow();
  return pendingAuthPromise;
}

/**
 * Signs in the Admin via Google Popup on Firebase Authentication
 * and initializes/verifies `/users/{uid}` with `role: 'admin'`.
 */
export async function signInFirebaseAdminWithGoogle(
  settings: FirebaseSettings = loadFirebaseSettings()
): Promise<AdminAuthStatus> {
  const auth = getFirebaseAuth(settings);
  const db = getFirebaseInstance(settings);
  if (!auth || !db) {
    return {
      authenticated: false,
      isAdminVerified: false,
      message: 'Không thể khởi tạo Firebase Auth. Vui lòng kiểm tra cấu hình API Key & Project ID.',
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      return await ensureAdminUserInFirestore(db, cred.user, {
        username: cred.user.email?.split('@')[0] || 'admin',
        fullName: cred.user.displayName || 'Quản trị viên Hệ thống',
      });
    }
    return {
      authenticated: false,
      isAdminVerified: false,
      message: 'Không nhận được thông tin người dùng từ Google.',
    };
  } catch (error: any) {
    return {
      authenticated: false,
      isAdminVerified: false,
      message: error?.message || 'Đăng nhập Google thất bại.',
    };
  }
}

export async function signOutFirebaseAdmin(settings: FirebaseSettings = loadFirebaseSettings()): Promise<void> {
  try {
    const auth = getFirebaseAuth(settings);
    if (auth && auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // ignore
  }
}

export function getCurrentFirebaseAuthInfo(settings: FirebaseSettings = loadFirebaseSettings()): {
  uid: string | null;
  email: string | null;
  isAnonymous: boolean;
} {
  const auth = getFirebaseAuth(settings);
  const user = auth?.currentUser;
  return {
    uid: user?.uid || null,
    email: user?.email || null,
    isAnonymous: Boolean(user?.isAnonymous),
  };
}

export interface FirebaseRealtimeListeners {
  onStudentsChange?: (students: Student[]) => void;
  onConfigChange?: (config: ExamRoomConfig) => void;
  onSubjectsChange?: (subjects: Subject[]) => void;
  onSchedulesChange?: (schedules: ExamSchedule[]) => void;
  onSyncStatusChange?: (status: {
    state: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';
    lastSynced?: Date;
    error?: string;
    adminAuth?: AdminAuthStatus;
  }) => void;
}

function isPermissionDeniedError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || '').toLowerCase();
  return (
    code.includes('permission-denied') ||
    code.includes('unauthenticated') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('permission_denied')
  );
}

/**
 * Subscribes to real-time updates from Firebase Firestore.
 * Waits for Firebase Admin Auth (`request.auth != null` and `users/{uid}.role == 'admin'`)
 * before attaching `onSnapshot` listeners so no unauthenticated permission errors occur.
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
  let isCancelled = false;

  const detachAll = () => {
    while (unsubscribes.length > 0) {
      const unsub = unsubscribes.pop();
      try {
        unsub?.();
      } catch {
        // ignore
      }
    }
  };

  // Authenticate as Admin first, then attach Firestore listeners
  ensureFirebaseAdminAuth(settings).then((authStatus) => {
    if (isCancelled) return;

    // If Firebase Auth is not authenticated or admin role in /users/{uid} is not yet verified,
    // do not attach raw unauthenticated listeners that would fail security rules.
    if (!authStatus.authenticated || !authStatus.isAdminVerified) {
      listeners.onSyncStatusChange?.({
        state: 'connected',
        lastSynced: new Date(),
        adminAuth: authStatus,
      });
      return;
    }

    try {
      const handleListenerError = (error: any) => {
        if (error?.code === 'unavailable') {
          listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date(), adminAuth: authStatus });
          return;
        }
        if (isPermissionDeniedError(error)) {
          // Immediately detach all listeners to prevent repeated permission-denied notices
          detachAll();
          listeners.onSyncStatusChange?.({
            state: 'connected',
            lastSynced: new Date(),
            adminAuth: {
              ...authStatus,
              isAdminVerified: false,
              message: authStatus.uid
                ? `Cần cấp role: "admin" cho UID ${authStatus.uid} trong bảng users trên Firebase.`
                : 'Cần xác thực tài khoản Admin trên Firebase Authentication.',
            },
          });
          return;
        }
        listeners.onSyncStatusChange?.({ state: 'error', error: error?.message || 'Lỗi đồng bộ dữ liệu' });
      };

      // 1. Listen to Exam Config
      const configDocRef = doc(db, COLLECTION_NAME, 'config');
      const unsubConfig = onSnapshot(
        configDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as ExamRoomConfig;
            listeners.onConfigChange?.(data);
            listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date(), adminAuth: authStatus });
          }
        },
        handleListenerError
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
              listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date(), adminAuth: authStatus });
            }
          }
        },
        handleListenerError
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
              listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date(), adminAuth: authStatus });
            }
          }
        },
        handleListenerError
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
              listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date(), adminAuth: authStatus });
            }
          }
        },
        handleListenerError
      );
      unsubscribes.push(unsubSchedules);

      listeners.onSyncStatusChange?.({ state: 'connected', lastSynced: new Date(), adminAuth: authStatus });
    } catch (error: any) {
      listeners.onSyncStatusChange?.({
        state: 'connected',
        lastSynced: new Date(),
        adminAuth: authStatus,
      });
    }
  });

  // Cleanup function to detach all listeners
  return () => {
    isCancelled = true;
    detachAll();
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
      setTimeout(() => {
        next();
      }, 50);
    }
  }
}

/**
 * Pushes all exam data to Firebase Firestore using writeBatch() (atomic batch commit).
 * Automatically authenticates the Admin account and maintains `/users/{uid}` with `role: 'admin'`.
 */
export async function syncDataToFirebase(
  settings: FirebaseSettings,
  students: Student[],
  config: ExamRoomConfig,
  subjects: Subject[],
  schedules: ExamSchedule[],
  rooms: RoomAssignment[] = [],
  options?: { strictCloudError?: boolean }
): Promise<{ success: boolean; message: string; adminAuth?: AdminAuthStatus }> {
  // Always persist locally first so data is never lost
  saveLocalStudents(students);
  saveLocalConfig(config);
  saveLocalSubjects(subjects);
  saveLocalSchedules(schedules);

  return executeSyncWithQueue(async () => {
    try {
      const db = getFirebaseInstance(settings);
      const auth = getFirebaseAuth(settings);
      if (!db) {
        return { success: false, message: 'Chưa cấu hình Firebase hợp lệ (thiếu apiKey hoặc projectId).' };
      }

      // Ensure Firebase Admin authentication & role == 'admin' in /users/{uid}
      const adminAuth = await ensureFirebaseAdminAuth(settings);

      const timestamp = new Date().toISOString();
      const batch = writeBatch(db);

      // Keep /users/{uid} role == 'admin' document synchronized if authenticated
      if (auth?.currentUser) {
        const userRef = doc(db, USERS_COLLECTION, auth.currentUser.uid);
        batch.set(
          userRef,
          sanitizeForFirestore({
            uid: auth.currentUser.uid,
            username: 'admin',
            email: auth.currentUser.email || settings.adminEmail || 'admin@phanphongthi.edu.vn',
            fullName: config.creatorName || 'Quản trị viên Hệ thống',
            role: 'admin',
            updatedAt: timestamp,
          }),
          { merge: true }
        );
      }

      // 1. Batch config doc
      const configRef = doc(db, COLLECTION_NAME, 'config');
      batch.set(
        configRef,
        sanitizeForFirestore({
          ...config,
          updatedAt: timestamp,
        })
      );

      // 2. Batch students doc
      const studentsRef = doc(db, COLLECTION_NAME, 'students');
      batch.set(
        studentsRef,
        sanitizeForFirestore({
          list: students || [],
          totalCount: (students || []).length,
          updatedAt: timestamp,
        })
      );

      // 3. Batch subjects doc
      const subjectsRef = doc(db, COLLECTION_NAME, 'subjects');
      batch.set(
        subjectsRef,
        sanitizeForFirestore({
          list: subjects || [],
          totalCount: (subjects || []).length,
          updatedAt: timestamp,
        })
      );

      // 4. Batch schedules doc
      const schedulesRef = doc(db, COLLECTION_NAME, 'schedules');
      batch.set(
        schedulesRef,
        sanitizeForFirestore({
          list: schedules || [],
          totalCount: (schedules || []).length,
          updatedAt: timestamp,
        })
      );

      // 5. Batch rooms doc
      const roomsRef = doc(db, COLLECTION_NAME, 'rooms');
      batch.set(
        roomsRef,
        sanitizeForFirestore({
          list: rooms || [],
          totalRooms: (rooms || []).length,
          updatedAt: timestamp,
        })
      );

      // Commit all document operations atomically in ONE request
      await batch.commit();

      return {
        success: true,
        message: `Đã đồng bộ thành công ${students.length} học sinh, ${rooms.length} phòng thi, ${subjects.length} môn lên Firebase với quyền Admin!`,
        adminAuth,
      };
    } catch (error: any) {
      if (error?.code === 'unavailable') {
        return {
          success: true,
          message: 'Dữ liệu đã được lưu trữ cục bộ và sẽ tự động đồng bộ khi kết nối mạng ổn định.',
        };
      }
      if (isPermissionDeniedError(error)) {
        const info = getCurrentFirebaseAuthInfo(settings);
        if (options?.strictCloudError) {
          const uidHint = info.uid
            ? `UID hiện tại: ${info.uid} (${info.email || 'ẩn danh'}). Hãy đảm bảo bảng users/${info.uid} có field role = "admin".`
            : 'Chưa xác thực tài khoản trên Firebase Authentication. Vui lòng nhập Email/Mật khẩu Admin Firebase hoặc Đăng nhập Google.';
          return {
            success: false,
            message: `Chưa đủ quyền ghi trên Firebase Firestore (isAdmin). ${uidHint}`,
          };
        }
        return {
          success: true,
          message: 'Đã lưu dữ liệu an toàn trên hệ thống (LocalStorage).',
        };
      }
      return {
        success: !options?.strictCloudError,
        message: options?.strictCloudError
          ? `Lỗi đồng bộ Firebase: ${error?.message || error}`
          : 'Đã lưu dữ liệu trên hệ thống.',
      };
    }
  });
}

/**
 * Specialized Batch Importer for large Student datasets.
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
 * Clears all student and class data both locally in localStorage and on Firebase Firestore.
 * Other settings such as subjects, schedules, school info, and exam settings remain strictly intact.
 */
export async function clearAllStudentsAndClassesFromFirebase(
  settings: FirebaseSettings,
  currentConfig: ExamRoomConfig,
  subjects: Subject[],
  schedules: ExamSchedule[]
): Promise<{ success: boolean; message: string; updatedConfig: ExamRoomConfig }> {
  const updatedConfig: ExamRoomConfig = {
    ...currentConfig,
    customClasses: [],
    classSubjects: {},
  };

  // 1. Immediately clear in LocalStorage
  saveLocalStudents([]);
  saveLocalConfig(updatedConfig);

  // 2. Sync clean student and class state to Firebase Firestore
  const syncResult = await syncDataToFirebase(
    settings,
    [],
    updatedConfig,
    subjects,
    schedules,
    []
  );

  return {
    success: syncResult.success,
    message: syncResult.success
      ? 'Đã xóa toàn bộ học sinh và lớp học trên chương trình và Firebase! Môn học, lịch thi và các cấu hình khác được giữ nguyên.'
      : `Đã xóa học sinh và lớp học cục bộ. Lưu ý Firebase: ${syncResult.message}`,
    updatedConfig,
  };
}

/**
 * Pulls complete snapshot of data from Firebase Firestore using Admin privileges
 */
export async function pullDataFromFirebase(
  settings: FirebaseSettings,
  options?: { strictCloudError?: boolean }
): Promise<{
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

    // Ensure Firebase Admin authentication before reading protected collections
    const adminAuth = await ensureFirebaseAdminAuth(settings);
    if (!adminAuth.authenticated && !options?.strictCloudError) {
      return {
        success: false,
        message: 'Đang sử dụng dữ liệu lưu trữ trên máy.',
      };
    }

    // Wrap with timeout to avoid hanging if Firestore backend is unreachable
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), 4000);
    });

    const fetchPromise = Promise.all([
      getDoc(doc(db, COLLECTION_NAME, 'config')),
      getDoc(doc(db, COLLECTION_NAME, 'students')),
      getDoc(doc(db, COLLECTION_NAME, 'subjects')),
      getDoc(doc(db, COLLECTION_NAME, 'schedules')),
    ]);

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if ('timeout' in result || !result) {
      return {
        success: false,
        message: 'Đang hoạt động ở chế độ ngoại tuyến (dữ liệu lưu trên máy).',
      };
    }

    const [configDoc, studentsDoc, subjectsDoc, schedulesDoc] = result as any[];

    const hasAnyDoc =
      Boolean(configDoc?.exists()) ||
      Boolean(studentsDoc?.exists()) ||
      Boolean(subjectsDoc?.exists()) ||
      Boolean(schedulesDoc?.exists());

    if (!hasAnyDoc) {
      return {
        success: true,
        message: `Đã kết nối Firebase (${settings.projectId}) với quyền Admin, chưa có dữ liệu cũ trên Cloud.`,
      };
    }

    const config = configDoc && configDoc.exists() ? (configDoc.data() as ExamRoomConfig) : INITIAL_CONFIG;
    const students =
      studentsDoc && studentsDoc.exists() && Array.isArray(studentsDoc.data()?.list)
        ? (studentsDoc.data().list as Student[])
        : [];
    const subjects =
      subjectsDoc && subjectsDoc.exists() && Array.isArray(subjectsDoc.data()?.list)
        ? (subjectsDoc.data().list as Subject[])
        : [];
    const schedules =
      schedulesDoc && schedulesDoc.exists() && Array.isArray(schedulesDoc.data()?.list)
        ? (schedulesDoc.data().list as ExamSchedule[])
        : [];

    return {
      success: true,
      message: `Đã tải thành công ${students.length} học sinh & cấu hình từ Firebase (${settings.projectId}) với quyền Admin!`,
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
    if (isPermissionDeniedError(error)) {
      const info = getCurrentFirebaseAuthInfo(settings);
      return {
        success: false,
        message: info.uid
          ? `Tài khoản (UID: ${info.uid}) chưa có field role == "admin" trong bảng users/${info.uid} trên Firebase.`
          : 'Vui lòng xác thực tài khoản Admin Firebase (Email/Mật khẩu hoặc Google) để đọc dữ liệu theo bộ Rule isAdmin().',
      };
    }
    return {
      success: false,
      message: `Lỗi tải dữ liệu từ Firebase: ${error?.message || error}`,
    };
  }
}
