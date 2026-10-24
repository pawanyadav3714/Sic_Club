export type UserRole = 'pending' | 'member' | 'coordinator' | 'admin' | 'core_member' | 'rejected';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  branch: string;
  registration_no: string;
  session: string;
  domain?: string;
  designation?: string;
  past_project_repo?: string;
  experience?: string;
  phone_no?: string;
  avatar_url?: string;
  role: UserRole;
  status?: 'pending' | 'approved' | 'rejected' | string;
  auth_provider?: 'email' | 'google';
  created_at: string;
  core_status?: 'enrolled' | 'upcoming';
}

export interface ClubPost {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface MembershipApplication {
  id: string;
  user_id: string;
  selected_post_id: string;
  past_project_repo?: string;
  experience?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  created_at: string;
  user?: UserProfile;
  post?: ClubPost;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_role?: string;
  author_avatar?: string;
  category?: 'Event Notice' | 'Workshop' | 'Hackathon' | 'Recruitment' | 'General Notice';
  event_date?: string;
  event_location?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  channel: string;
  created_at: string;
}

export interface ProjectSubmission {
  id: string;
  user_id: string;
  author_name: string;
  author_email: string;
  author_avatar?: string;
  domain: string;
  title: string;
  description: string;
  repo_url?: string;
  live_demo_url?: string;
  status: 'In-Review' | 'Published' | 'Approved' | 'Changes Requested' | 'Declined';
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export type EventCategory =
  | 'workshop'
  | 'fest_hackathon'
  | 'competition'
  | 'seminar_lecture'
  | 'external_event'
  | 'internal_meeting';

export type EventStatus =
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'changes_requested'
  | 'rejected';

export type EventVisibility = 'public' | 'members';

export interface EventProposal {
  id: string;
  // 1. Event Basic Information
  title: string;
  summary: string;
  description: string;
  category: EventCategory;
  venue: string;
  cover_image_path: string;

  // 2. Timings & Deadlines (Schedule)
  event_starts_at: string; // ISO or YYYY-MM-DDTHH:mm
  event_ends_at: string; // ISO or YYYY-MM-DDTHH:mm
  registration_opens_at: string; // ISO or YYYY-MM-DDTHH:mm
  registration_closes_at: string; // ISO or YYYY-MM-DDTHH:mm (Deadline)

  // 3. Logistics & Audience Control
  capacity: number;
  registered_count: number;
  waitlist_count: number;
  visibility: EventVisibility;
  assigned_team: string;

  // Approval Process Workflow
  status: EventStatus;
  submitted_by_id: string;
  submitted_by_name: string;
  submitted_by_role: string;
  submitted_by_avatar?: string;
  
  // Problem Statements for competitions/hackathons
  problem_statements?: string[];

  reviewed_by_id?: string;
  reviewed_by_name?: string;
  review_notes?: string;
  reviewed_at?: string;

  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone_no?: string;
  branch?: string;
  registration_no?: string;
  // Team registration fields
  registration_type?: 'individual' | 'team';
  team_name?: string;
  category?: 'software' | 'hardware';
  team_members?: { name: string; registration_no: string; branch: string; phone_no: string }[];
  selected_problem_statement?: string;
  
  type?: 'confirmed' | 'waitlist';
  status?: 'confirmed' | 'waitlist' | 'waitlisted';
  waitlist_position?: number;
  registered_at: string;
}

