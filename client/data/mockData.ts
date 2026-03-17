// Mock data for VISIATTEND Dashboard

export interface User {
  id: number;
  studentId: string;
  fullName: string;
  email: string;
  role: "admin" | "lecturer" | "student" | "employee" | "preacher" | "participant" | "foreign" | "member";
  profilePhoto?: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Class {
  id: number;
  classCode: string;
  className: string;
  description?: string;
  lecturerId: number;
  academicYear: string;
  semester: "ganjil" | "genap";
  isActive: boolean;
  createdAt: string;
}

export interface ClassEnrollment {
  id: number;
  classId: number;
  userId: number;
  enrollmentDate: string;
  isActive: boolean;
}

export interface Attendance {
  id: number;
  userId: number;
  classId: number;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime?: string;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "alpha";
  confidenceScore?: number;
  livenessVerified: boolean;
  deviceInfo?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  description?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: 1,
    studentId: "ADM001",
    fullName: "Admin User",
    email: "admin@visiattend.com",
    role: "admin",
    phoneNumber: "08123456789",
    isActive: true,
    lastLogin: "2024-03-17T10:30:00",
    createdAt: "2024-01-01T00:00:00",
  },
  {
    id: 2,
    studentId: "LEC001",
    fullName: "Brusche Zach",
    email: "Brusche.Zach@gmail.com",
    role: "lecturer",
    phoneNumber: "08234567890",
    isActive: true,
    lastLogin: "2024-03-17T09:15:00",
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 3,
    studentId: "STU001",
    fullName: "Yobel Fernindo Simbolon",
    email: "yobel.simbolon@gmail.com",
    role: "student",
    phoneNumber: "08345678901",
    isActive: true,
    lastLogin: "2024-03-17T07:45:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 4,
    studentId: "STU002",
    fullName: "Jordy Kastello Mail",
    email: "jordy.kastello@gmail.com",
    role: "student",
    phoneNumber: "08456789012",
    isActive: true,
    lastLogin: "2024-03-16T14:20:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 5,
    studentId: "STU003",
    fullName: "Berliano Keio Angerah Tari",
    email: "Berliano.Keio@gmail.com",
    role: "student",
    phoneNumber: "08567890123",
    isActive: true,
    lastLogin: "2024-03-17T06:50:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 6,
    studentId: "STU004",
    fullName: "Fetrik Cola",
    email: "fetrik.cola@gmail.com",
    role: "student",
    phoneNumber: "08678901234",
    isActive: true,
    lastLogin: "2024-03-15T11:30:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 7,
    studentId: "STU005",
    fullName: "Albertus Ahmad Rizaldi",
    email: "ahmad.rizaldi@gmail.com",
    role: "student",
    phoneNumber: "08789012345",
    isActive: false,
    lastLogin: "2024-03-10T13:00:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 8,
    studentId: "LEC002",
    fullName: "Pande Naingolan",
    email: "pande.naingolan@gmail.com",
    role: "lecturer",
    phoneNumber: "08890123456",
    isActive: true,
    lastLogin: "2024-03-17T08:00:00",
    createdAt: "2024-01-10T00:00:00",
  },
    {
    id: 9,
    studentId: "LEC002",
    fullName: "Jeconiah Lunardi",
    email: "jeconiah.lunardi@gmail.com",
    role: "preacher",
    phoneNumber: "08890123456",
    isActive: true,
    lastLogin: "2024-03-17T08:00:00",
    createdAt: "2024-01-10T00:00:00",
  },
    {
    id: 10,
    studentId: "LEC002",
    fullName: "Pieter Kurnia",
    email: "pieter.kurnia@gmail.com",
    role: "preacher",
    phoneNumber: "08890123456",
    isActive: true,
    lastLogin: "2024-03-17T08:00:00",
    createdAt: "2024-01-10T00:00:00",
  },
      {
    id: 11,
    studentId: "LEC002",
    fullName: "Franky Hutapea",
    email: "franky.hutapea@gmail.com",
    role: "preacher",
    phoneNumber: "08890123456",
    isActive: true,
    lastLogin: "2024-03-17T08:00:00",
    createdAt: "2024-01-10T00:00:00",
  },
];

// Mock Classes
export const mockClasses: Class[] = [
  {
    id: 1,
    classCode: "101",
    className: "Predestination",
    description: "Learn the fundamentals of programming with Python",
    lecturerId: 9,
    academicYear: "2023/2024",
    semester: "ganjil",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 2,
    classCode: "102",
    className: "Irresestible Gods",
    description: "Understanding data structures and algorithms",
    lecturerId: 10,
    academicYear: "2023/2024",
    semester: "ganjil",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 3,
    classCode: "103",
    className: "Thrinity",
    description: "Design and implementation of database systems",
    lecturerId: 11,
    academicYear: "2023/2024",
    semester: "ganjil",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 4,
    classCode: "104",
    className: "Old Testament",
    description: "Modern web development with React and Node.js",
    lecturerId: 10,
    academicYear: "2023/2024",
    semester: "ganjil",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
];

// Mock Class Enrollments
export const mockClassEnrollments: ClassEnrollment[] = [
  { id: 1, classId: 1, userId: 3, enrollmentDate: "2024-01-15", isActive: true },
  { id: 2, classId: 1, userId: 4, enrollmentDate: "2024-01-15", isActive: true },
  { id: 3, classId: 1, userId: 5, enrollmentDate: "2024-01-15", isActive: true },
  { id: 4, classId: 1, userId: 6, enrollmentDate: "2024-01-15", isActive: true },
  { id: 5, classId: 1, userId: 7, enrollmentDate: "2024-01-15", isActive: true },
  { id: 6, classId: 2, userId: 3, enrollmentDate: "2024-01-15", isActive: true },
  { id: 7, classId: 2, userId: 4, enrollmentDate: "2024-01-15", isActive: true },
  { id: 8, classId: 2, userId: 5, enrollmentDate: "2024-01-15", isActive: true },
  { id: 9, classId: 3, userId: 6, enrollmentDate: "2024-01-15", isActive: true },
  { id: 10, classId: 3, userId: 7, enrollmentDate: "2024-01-15", isActive: true },
  { id: 11, classId: 4, userId: 3, enrollmentDate: "2024-01-15", isActive: true },
  { id: 12, classId: 4, userId: 4, enrollmentDate: "2024-01-15", isActive: true },
];

// Mock Attendances - Generate for last 7 days
export const mockAttendances: Attendance[] = (() => {
  const attendances: Attendance[] = [];
  const statuses: Array<"hadir" | "terlambat" | "izin" | "sakit" | "alpha"> = [
    "hadir",
    "terlambat",
    "izin",
    "sakit",
    "alpha",
  ];
  let id = 1;

  // Generate attendance for last 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split("T")[0];

    // Only generate for weekdays (Monday-Friday)
    if (date.getDay() >= 1 && date.getDay() <= 5) {
      // Generate for each student in each class
      for (let classId = 1; classId <= 2; classId++) {
        for (let userId = 3; userId <= 7; userId++) {
          const isEnrolled = mockClassEnrollments.some(
            (e) => e.classId === classId && e.userId === userId && e.isActive
          );

          if (isEnrolled) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const hour = 7 + Math.floor(Math.random() * 3);
            const minute = Math.floor(Math.random() * 60);

            attendances.push({
              id: id++,
              userId,
              classId,
              attendanceDate: dateStr,
              checkInTime: `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
              checkOutTime: `${dateStr}T${String(hour + 2).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`,
              status,
              confidenceScore: Math.random() * (99.99 - 85.5) + 85.5,
              livenessVerified: Math.random() > 0.1,
              deviceInfo: "Web Browser - Chrome",
              createdAt: `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
            });
          }
        }
      }
    }
  }

  return attendances;
})();

// Mock Activity Logs
export const mockActivityLogs: ActivityLog[] = [
  {
    id: 1,
    userId: 3,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 1,
    description: "Andi Wijaya checked in to CS101",
    createdAt: "2024-03-17T07:45:00",
  },
  {
    id: 2,
    userId: 4,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 2,
    description: "Siti Nurhaliza checked in to CS101",
    createdAt: "2024-03-17T07:50:00",
  },
  {
    id: 3,
    userId: 5,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 3,
    description: "Riko Pratama checked in to Data Structures",
    createdAt: "2024-03-17T07:42:00",
  },
  {
    id: 4,
    userId: 6,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 4,
    description: "Dewi Lestari checked in to Database Systems",
    createdAt: "2024-03-17T07:30:00",
  },
  {
    id: 5,
    userId: 1,
    action: "CREATE",
    entityType: "Class",
    entityId: 4,
    description: "Admin created new class: Web Development",
    createdAt: "2024-03-16T14:20:00",
  },
];

// Mock Achievements/Badges
export const mockAchievements: Achievement[] = [
  {
    id: "perfect-attendance",
    name: "Perfect Attendance",
    description: "100% attendance for one month",
    icon: "🏆",
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Always arrive on time",
    icon: "🐦",
  },
  {
    id: "most-improved",
    name: "Most Improved",
    description: "Highest improvement in attendance",
    icon: "📈",
  },
  {
    id: "streak-master",
    name: "Streak Master",
    description: "30 consecutive days of attendance",
    icon: "🔥",
  },
  {
    id: "super-student",
    name: "Super Student",
    description: "Enrolled in 4 or more classes",
    icon: "⭐",
  },
];

// Mock User Achievements (which users have which badges)
export const mockUserAchievements: Record<number, string[]> = {
  3: ["perfect-attendance", "early-bird", "streak-master"],
  4: ["perfect-attendance", "super-student"],
  5: ["most-improved"],
  6: ["perfect-attendance", "early-bird"],
  7: [],
};

// Helper functions
export function getClassById(id: number): Class | undefined {
  return mockClasses.find((c) => c.id === id);
}

export function getUserById(id: number): User | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getStudentsInClass(classId: number): User[] {
  const enrollmentUserIds = mockClassEnrollments
    .filter((e) => e.classId === classId && e.isActive)
    .map((e) => e.userId);
  return mockUsers.filter((u) => enrollmentUserIds.includes(u.id));
}

export function getClassesForUser(userId: number): Class[] {
  const classIds = mockClassEnrollments
    .filter((e) => e.userId === userId && e.isActive)
    .map((e) => e.classId);
  return mockClasses.filter((c) => classIds.includes(c.id));
}

export function getAttendanceStats(userId?: number, classId?: number) {
  const filtered = mockAttendances.filter(
    (a) => (!userId || a.userId === userId) && (!classId || a.classId === classId)
  );

  const stats = {
    totalAttendance: filtered.length,
    hadir: filtered.filter((a) => a.status === "hadir").length,
    terlambat: filtered.filter((a) => a.status === "terlambat").length,
    izin: filtered.filter((a) => a.status === "izin").length,
    sakit: filtered.filter((a) => a.status === "sakit").length,
    alpha: filtered.filter((a) => a.status === "alpha").length,
  };

  const presentCount = stats.hadir + stats.terlambat;
  const attendancePercentage = stats.totalAttendance > 0
    ? ((presentCount / stats.totalAttendance) * 100).toFixed(2)
    : "0.00";

  return {
    ...stats,
    attendancePercentage: parseFloat(attendancePercentage),
  };
}

export function getTodayAttendanceStats(): {
  checkedIn: number;
  pending: number;
  absent: number;
} {
  const today = new Date().toISOString().split("T")[0];
  const todayAttendances = mockAttendances.filter(
    (a) => a.attendanceDate === today
  );
  
  const totalStudents = mockUsers.filter((u) => u.role === "student" && u.isActive).length;

  return {
    checkedIn: todayAttendances.filter(
      (a) => a.status === "hadir" || a.status === "terlambat"
    ).length,
    pending: totalStudents - todayAttendances.length,
    absent: todayAttendances.filter((a) => a.status === "alpha").length,
  };
}

export function getRecentActivities(limit: number = 10): ActivityLog[] {
  return mockActivityLogs.slice(0, limit);
}

export function getAttendanceTrend(days: number = 7, classId?: number) {
  const trend: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayAttendances = mockAttendances.filter((a) => {
      const match = a.attendanceDate === dateStr;
      return classId ? match && a.classId === classId : match;
    });

    const hadirCount = dayAttendances.filter(
      (a) => a.status === "hadir" || a.status === "terlambat"
    ).length;

    trend[dateStr] = hadirCount;
  }

  return trend;
}

export function getLeaderboardData(classId?: number, period: "week" | "month" | "year" = "year") {
  const students = mockUsers.filter((u) => u.role === "student" && u.isActive);

  return students
    .map((student) => {
      const stats = getAttendanceStats(student.id, classId);
      const achievements = mockUserAchievements[student.id] || [];

      return {
        userId: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        totalHadir: stats.hadir,
        totalTerlambat: stats.terlambat,
        attendancePercentage: stats.attendancePercentage,
        achievements,
      };
    })
    .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}
