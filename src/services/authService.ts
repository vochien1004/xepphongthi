import { FirebaseSettings } from '../types';
import {
  ensureFirebaseAdminAuth,
  signInFirebaseAdminWithGoogle,
  signOutFirebaseAdmin,
  loadFirebaseSettings,
  saveFirebaseSettings,
} from './storageService';

export interface AuthUser {
  uid?: string;
  email?: string;
  username: string;
  fullName: string;
  role: 'admin';
  loginTime: string;
  firebaseAuthenticated?: boolean;
  adminRoleVerified?: boolean;
}

const AUTH_STORAGE_KEY = 'exam_sys_auth_user_session';
const AUTH_REMEMBER_KEY = 'exam_sys_auth_remember';

export function getStoredAuth(): AuthUser | null {
  try {
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local) as AuthUser;
      return { ...parsed, role: 'admin' };
    }
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (session) {
      const parsed = JSON.parse(session) as AuthUser;
      return { ...parsed, role: 'admin' };
    }
  } catch (e) {
    console.error('Error reading auth state:', e);
  }
  return null;
}

export function saveAuthSession(user: AuthUser, remember: boolean = true): void {
  try {
    const serialized = JSON.stringify({ ...user, role: 'admin' });
    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      localStorage.setItem(AUTH_REMEMBER_KEY, 'true');
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_REMEMBER_KEY);
    }
  } catch (e) {
    console.error('Error saving auth session:', e);
  }
}

/**
 * Asynchronous login that authenticates with Firebase Auth (`request.auth != null`)
 * and verifies/initializes `/users/{request.auth.uid}` with `role: 'admin'`
 * so the admin account has full read/write permissions under the `isAdmin()` Firestore rule.
 */
export async function loginUserAsync(
  usernameOrEmail: string,
  password: string,
  remember: boolean = true,
  firebaseSettings?: FirebaseSettings
): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
  const cleanInput = usernameOrEmail.trim();
  const cleanUsername = cleanInput.toLowerCase();
  const cleanPassword = password.trim();
  const settings = firebaseSettings || loadFirebaseSettings();

  const isLocalAdmin =
    (cleanUsername === 'admin' && (cleanPassword === 'admin' || cleanPassword === 'admin123' || cleanPassword === '123456')) ||
    (cleanUsername === 'admin@phanphongthi.com' && (cleanPassword === '123456' || cleanPassword === 'admin' || cleanPassword === 'admin123')) ||
    (cleanUsername === 'admin@phanphongthi.edu.vn' && (cleanPassword === '123456' || cleanPassword === 'admin' || cleanPassword === 'admin123'));

  // Authenticate against Firebase Auth & ensure /users/{uid}.role == 'admin'
  const fbStatus = await ensureFirebaseAdminAuth(settings, {
    emailOrUsername: cleanInput,
    password: cleanPassword,
    fullName: 'Quản trị viên Hệ thống',
  });

  if (fbStatus.authenticated || isLocalAdmin) {
    // Save admin email/password in FirebaseSettings if user logged in with a valid email
    if (cleanInput.includes('@') && cleanPassword.length >= 6) {
      saveFirebaseSettings({
        ...settings,
        adminEmail: cleanInput,
        adminPassword: cleanPassword,
      });
    }

    const user: AuthUser = {
      uid: fbStatus.uid,
      email: fbStatus.email || (cleanInput.includes('@') ? cleanInput : settings.adminEmail || 'admin@phanphongthi.com'),
      username: cleanInput.includes('@') ? cleanInput.split('@')[0] : 'admin',
      fullName: 'Quản trị viên Hệ thống',
      role: 'admin',
      loginTime: new Date().toISOString(),
      firebaseAuthenticated: fbStatus.authenticated,
      adminRoleVerified: fbStatus.isAdminVerified,
    };

    saveAuthSession(user, remember);
    return { success: true, user };
  }

  return {
    success: false,
    message:
      'Thông tin đăng nhập không chính xác! Vui lòng nhập tài khoản Admin (admin@phanphongthi.com / 123456 hoặc admin / admin).',
  };
}

/**
 * Signs in using Google Account on Firebase Auth and grants/verifies `role: 'admin'` in `/users/{uid}`.
 */
export async function loginWithGoogleAsync(
  remember: boolean = true,
  firebaseSettings?: FirebaseSettings
): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
  const settings = firebaseSettings || loadFirebaseSettings();
  const fbStatus = await signInFirebaseAdminWithGoogle(settings);

  if (fbStatus.authenticated) {
    const user: AuthUser = {
      uid: fbStatus.uid,
      email: fbStatus.email || undefined,
      username: fbStatus.email ? fbStatus.email.split('@')[0] : 'admin',
      fullName: 'Quản trị viên Hệ thống',
      role: 'admin',
      loginTime: new Date().toISOString(),
      firebaseAuthenticated: true,
      adminRoleVerified: fbStatus.isAdminVerified,
    };

    saveAuthSession(user, remember);
    return { success: true, user, message: fbStatus.message };
  }

  return {
    success: false,
    message: fbStatus.message || 'Đăng nhập Google trên Firebase thất bại.',
  };
}

export function loginUser(
  username: string,
  password: string,
  remember: boolean = true
): { success: boolean; message?: string; user?: AuthUser } {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (cleanUsername === 'admin' && cleanPassword === 'admin') {
    const user: AuthUser = {
      username: 'admin',
      fullName: 'Quản trị viên Hệ thống',
      role: 'admin',
      loginTime: new Date().toISOString(),
    };

    saveAuthSession(user, remember);
    // Trigger background Firebase Admin Auth & /users/{uid} role == 'admin' provisioning
    ensureFirebaseAdminAuth(loadFirebaseSettings(), {
      emailOrUsername: username,
      password,
    }).catch(() => {});

    return { success: true, user };
  }

  return {
    success: false,
    message: 'Tên đăng nhập hoặc mật khẩu không chính xác! Vui lòng dùng: admin / admin hoặc Email Admin Firebase.',
  };
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    signOutFirebaseAdmin().catch(() => {});
  } catch (e) {
    console.error('Error removing auth session:', e);
  }
}
