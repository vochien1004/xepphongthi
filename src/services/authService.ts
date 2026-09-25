export interface AuthUser {
  username: string;
  fullName: string;
  role: 'admin';
  loginTime: string;
}

const AUTH_STORAGE_KEY = 'exam_sys_auth_user_session';
const AUTH_REMEMBER_KEY = 'exam_sys_auth_remember';

export function getStoredAuth(): AuthUser | null {
  try {
    // Check localStorage first (remembered)
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    if (local) {
      return JSON.parse(local) as AuthUser;
    }
    // Check sessionStorage
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (session) {
      return JSON.parse(session) as AuthUser;
    }
  } catch (e) {
    console.error('Error reading auth state:', e);
  }
  return null;
}

export function loginUser(username: string, password: string, remember: boolean = true): { success: boolean; message?: string; user?: AuthUser } {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (cleanUsername === 'admin' && cleanPassword === 'admin') {
    const user: AuthUser = {
      username: 'admin',
      fullName: 'Quản trị viên Hệ thống',
      role: 'admin',
      loginTime: new Date().toISOString(),
    };

    try {
      const serialized = JSON.stringify(user);
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

    return { success: true, user };
  }

  return {
    success: false,
    message: 'Tên đăng nhập hoặc mật khẩu không chính xác! Vui lòng dùng: admin / admin',
  };
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Error removing auth session:', e);
  }
}
