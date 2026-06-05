export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  company: string;
  role: string;
  location: string;
  bio: string;
  avatar_key: string;
  pronouns: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  company_id: number;
  is_admin: number;
  created_at: number;
}

export interface Company {
  id: number;
  name: string;
  logo_key: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  description: string;
  created_by: number | null;
  created_at: number;
}

export interface Topic {
  id: number;
  title: string;
  created_by: number;
  created_at: number;
  last_activity_at: number;
}

export interface Post {
  id: number;
  topic_id: number;
  user_id: number;
  body: string;
  created_at: number;
}

export interface EventRow {
  id: number;
  title: string;
  description: string;
  location: string;
  starts_at: number;
  capacity: number;
  created_at: number;
}
