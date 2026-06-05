export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  company: string;
  role: string;
  location: string;
  bio: string;
  is_admin: number;
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
