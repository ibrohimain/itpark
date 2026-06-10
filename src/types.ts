export type UserRole = 
  | 'user' 
  | 'shogirt' 
  | 'yoramchi ustoz' 
  | 'o\'quvchi' 
  | 'ustoz' 
  | 'direktor o\'rin bosari' 
  | 'dasturchi' 
  | 'mobilograf' 
  | 'backent' 
  | 'frontend' 
  | 'dizayner' 
  | 'xodim III darajali' 
  | 'xodim II darajali' 
  | 'xodim I darajali' 
  | 'director' 
  | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  major?: string;
  points?: number; // For rating
  birthYear?: number;
  age?: number;
  bio?: string;
  statuses?: Array<{ id: string; text: string; createdAt: string; }>;
  spentBalance?: number; // Cash spent on paying off fines
  joinedDate?: string;
  leftDate?: string;
  isGraduated?: boolean;
  graduatedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  studentIds: string[];
  createdAt: string;
}

export interface CourseRequest {
  id: string;
  courseId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'rejected';
  fullName: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'lesson' | 'grade' | 'homework' | 'system';
  read: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  createdBy: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  courseId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  room: string;
  staffId: string;
}

export interface Homework {
  id: string;
  courseId: string;
  groupId?: string;
  title: string;
  description: string;
  dueDate: string;
  staffId: string;
}

export interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  content: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  markedBy: string;
  paid?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'holiday' | 'event' | 'trip' | 'meeting';
  createdBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  courseId: string;
  amount: number;
  date: string;
  month: string;
  recordedBy: string;
  createdAt: string;
  method: 'cash' | 'card' | 'transfer';
  status: 'paid' | 'pending';
}
