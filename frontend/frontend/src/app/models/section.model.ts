// src/app/models/section.model.ts
export interface Section {
  id: string;
  name: string;
}

// src/app/models/class.model.ts
export interface Class {
  id: string;
  name: string;
  section_id: string;
}

// src/app/models/day.model.ts
export interface Day {
  id: string;
  day_number: number;
  class_id?: string;
  topic?: string;
  quiz_link?: string;
  project_link?: string;
  material_link?: string;
  exercise_link?: string;
}

// src/app/models/video.model.ts
export interface Video {
  id: string;
  day_id: string;
  language: 'english' | 'telugu';
  youtube_id: string;
  youtube_link?: string;
}

// src/app/models/category.model.ts
export interface Category {
  id: string;
  name: string;
  section_id: string;
}

// src/app/models/job.model.ts
export interface Job {
  id: string;
  job_id: string;
  title: string;
  days: number;
  role: string;
  industries: string;
  description: string;
  category_id: string;
}

// src/app/models/skill.model.ts
export interface Skill {
  id: string;
  name: string;
  job_id: string;
}

// src/app/models/learning-path-day.model.ts
export interface LearningPathDay {
  id: string;
  day_number: number;
  topic: string;
  material_link?: string;
  exercise_link?: string;
  project_link?: string;
  skill_id: string;
}