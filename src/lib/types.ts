export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  company: string;
  role: string;
  function_id: number;
  seniority_id: number;
  location: string;
  city: string;
  state: string;
  zip: string;
  dma_slug: string;
  dma_name: string;
  bio: string;
  avatar_key: string;
  cover_key: string;
  pronouns: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  company_id: number;
  is_admin: number;
  discover_region_only: number;
  discover_peers_only: number;
  status: string; // pending | approved | declined
  onboarded: number;
  approved_at: number | null;
  approved_by: number | null;
  apply_note: string;
  needs_password: number; // 1 = account created without a password (set on approval)
  created_at: number;
}

export interface Company {
  id: number;
  name: string;
  logo_key: string;
  cover_key: string;
  website: string;
  industry: string;
  industry_id: number;
  size: string;
  location: string;
  city: string;
  state: string;
  zip: string;
  dma_slug: string;
  dma_name: string;
  linkedin: string;
  description: string;
  created_by: number | null;
  created_at: number;
}

export interface Topic {
  id: number;
  title: string;
  category_id: number;
  dma_slug: string;
  dma_name: string;
  created_by: number;
  created_at: number;
  last_activity_at: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  created_at: number;
}

export interface Post {
  id: number;
  topic_id: number;
  user_id: number;
  body: string;
  created_at: number;
}

export interface Briefing {
  id: number;
  kind: string; // 'article' | 'link'
  title: string;
  summary: string;
  body: string;
  url: string;
  cover_key: string;
  cover_url: string;
  category_id: number;
  author_id: number | null;
  published: number;
  published_at: number | null;
  status: string; // pending | approved | declined
  submitted_by: number | null;
  created_at: number;
  updated_at: number;
}

export interface EventRow {
  id: number;
  title: string;
  description: string;
  location: string;
  city: string;
  state: string;
  zip: string;
  dma_slug: string;
  dma_name: string;
  is_virtual: number;
  meeting_url: string;
  status: string; // pending | approved | declined
  submitted_by: number | null;
  starts_at: number;
  capacity: number;
  created_at: number;
}

export interface Connection {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: string; // pending | accepted
  created_at: number;
  responded_at: number | null;
}

export interface Report {
  id: number;
  reporter_id: number;
  target_type: string; // topic | post | member
  target_id: number;
  reason: string;
  status: string; // open | resolved | dismissed
  created_at: number;
  resolved_by: number | null;
  resolved_at: number | null;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  body: string;
  created_at: number;
  read_at: number | null;
}

export interface InviteRequest {
  id: number;
  name: string;
  email: string;
  note: string;
  status: string; // new | handled | dismissed
  created_at: number;
}
