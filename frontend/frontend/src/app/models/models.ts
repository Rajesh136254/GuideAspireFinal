// src/app/models/models.ts
export interface Section {
  id: number;
  name: string;
}

export interface Class {
  id: number;
  name: string;
  section_id: string;
}

export interface Day {
  id: string;
  day_number: number;
  class_id?: string;
  topic?: string;
  quiz_link?: string;
  project_link?: string;
  resource_link?: string; // Changed from material_link to resource_link for summer special
}

export interface Video {
  id: string;
  day_id: string;
  language: 'english' | 'telugu';
  youtube_id: string;
  youtube_link?: string;
}

export interface Category {
  id: number;
  name: string;
  section_id: string;
}

export interface Job {
  id: number;
  job_id: string;
  title: string;
  days: number;
  role: string;
  industries: string;
  description: string;
  category_id: string;
}

export interface Skill {
  id: number;
  name: string;
  job_id: string;
}

export interface LearningPathDay {
  id: number;
  day_number: number;
  topic: string;
  material_link?: string;
  exercise_link?: string;
  project_link?: string;
  skill_id: string;
}

// Add these interfaces to your existing models.ts file

export interface Content {
  id: string;
  title: string;
  description?: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export interface DayContent {
  id: string;
  day_id: string;
  content: string | Content;
  video?: Video; // Add video as optional property
  created_at?: string;
  updated_at?: string;
}

export interface Progress {
  id: string;
  user_id: string;
  course_id: string;
  day_id?: string;
  skill_id?: string;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  preferences?: {
    language?: string;
    notifications?: boolean;
  };
  created_at?: string;
  updated_at?: string;
}