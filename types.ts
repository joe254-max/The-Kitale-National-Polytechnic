export enum UserRole {
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  LIBRARIAN = 'LIBRARIAN',
  ADMIN = 'ADMIN'
}

export enum ResourceType {
  LECTURE_NOTE = 'LECTURE_NOTE',
  PAST_PAPER = 'PAST_PAPER',
  TECHNICAL_MANUAL = 'TECHNICAL_MANUAL',
  RESEARCH_PAPER = 'RESEARCH_PAPER',
  EBOOK = 'EBOOK',
  VIDEO = 'VIDEO'
}

export enum AccessLevel {
  PUBLIC = 'PUBLIC',
  DEPARTMENT_RESTRICTED = 'DEPARTMENT_RESTRICTED',
  COURSE_RESTRICTED = 'COURSE_RESTRICTED'
}

export type DepartmentCode = 'EE' | 'ICT' | 'BUS' | 'BCE' | 'HOSP' | 'AS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  admissionNo?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  department: string;
  course: string;
  unitCode: string;
  uploaderId: string;
  uploadDate: string;
  fileUrl: string;
  thumbnailUrl: string;
  downloads: number;
  rating: number;
  accessLevel: AccessLevel;
  isApproved: boolean;
  uploaderName?: string;
  uploaderRole?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  department?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  department?: string;
}

export interface DeadlineItem {
  id: string;
  title: string;
  date: Date;
}