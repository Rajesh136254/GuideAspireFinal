export interface Profile {
  name: string;
  email: string;
  progress: number[];
  role?: string;
  profilePicture?: string;
}

export interface Content {
  id: number;
  title: string;
  description: string;
  videos: Video[];
  topic?: string;
  quiz_link?: string;
  project_link?: string;
}

export interface Video {
  id: number;
  title: string;
  url: string;
  description: string;
  youtube_id?: string;
}

export interface ProgressPayload {
  email: string;
  classNumber: number;
  dayNumber: number;
}

export interface ProfileUpdatePayload {
  email: string;
  progress: number[];
  name?: string;
  password?: string;
}