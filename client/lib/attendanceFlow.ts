export interface AttendanceRegistrationProfile {
  name: string;
  email: string;
  category: string;
  phone: string;
  birthday: string;
}

export interface AttendanceCurrentUser extends AttendanceRegistrationProfile {
  userId: string;
}

const PENDING_REGISTRATION_KEY = "attendance.pendingRegistrationProfile";
const CURRENT_USER_KEY = "attendance.currentUser";

export const setPendingRegistrationProfile = (profile: AttendanceRegistrationProfile) => {
  localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(profile));
};

export const getPendingRegistrationProfile = () => {
  const raw = localStorage.getItem(PENDING_REGISTRATION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AttendanceRegistrationProfile;
  } catch {
    return null;
  }
};

export const clearPendingRegistrationProfile = () => {
  localStorage.removeItem(PENDING_REGISTRATION_KEY);
};

export const setCurrentAttendanceUser = (user: AttendanceCurrentUser) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const getCurrentAttendanceUser = () => {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AttendanceCurrentUser;
  } catch {
    return null;
  }
};

export const clearCurrentAttendanceUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};
