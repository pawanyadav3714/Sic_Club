import { ProjectSubmission } from '../types';

const STORAGE_KEY = 'sic_submitted_projects_v1';

export const INITIAL_SAMPLE_PROJECTS: ProjectSubmission[] = [
  {
    id: 'proj-1',
    user_id: 'aditya-sample',
    author_name: 'Aditya Kumar',
    author_email: 'aditya.member@sic.edu',
    author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    domain: 'Tech / Coding',
    title: 'Low-Cost Smart Irrigation System',
    description: 'IoT-based soil moisture monitoring & automated water delivery powered by ESP32 and solar sensors.',
    repo_url: 'https://github.com/sic-club/smart-irrigation',
    live_demo_url: 'https://irrigation-demo.sic.edu',
    status: 'In-Review',
    category: 'Hardware & IoT',
    tags: ['IoT', 'ESP32', 'Automation', 'Agriculture'],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'proj-2',
    user_id: 'neha-sample',
    author_name: 'Neha Singh',
    author_email: 'neha.singh@sic.edu',
    author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    domain: 'AI & Data Science',
    title: 'AI Automated Defect Inspector',
    description: 'Computer vision pipeline detecting structural micro-cracks using YOLOv8 edge models.',
    repo_url: 'https://github.com/sic-club/ai-defect-inspector',
    live_demo_url: 'https://defect-ai.sic.edu',
    status: 'Published',
    category: 'Computer Vision',
    tags: ['PyTorch', 'YOLOv8', 'AI', 'Robotics'],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'proj-3',
    user_id: 'rohit-sample',
    author_name: 'Rohit Sharma',
    author_email: 'rohit.s@sic.edu',
    author_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    domain: 'Electronics & Hardware',
    title: 'Autonomous Rover with LiDaR Mapping',
    description: 'Self-navigating rover constructing 3D point-cloud maps in enclosed environments.',
    repo_url: 'https://github.com/sic-club/autonomous-lidar-rover',
    status: 'In-Review',
    category: 'Robotics',
    tags: ['LiDaR', 'ROS2', 'Robotics', 'C++'],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  }
];

export function getStoredProjects(): ProjectSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_PROJECTS));
      return INITIAL_SAMPLE_PROJECTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_SAMPLE_PROJECTS;
  }
}

export function saveProjectSubmission(proj: Omit<ProjectSubmission, 'id' | 'created_at' | 'updated_at'>): ProjectSubmission {
  const newProj: ProjectSubmission = {
    ...proj,
    id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = getStoredProjects();
  current.unshift(newProj);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('sic_project_updated', { detail: newProj }));
  } catch (e) {
    console.error('Failed to save project submission', e);
  }

  return newProj;
}

export function updateProjectStatus(id: string, status: ProjectSubmission['status']): ProjectSubmission | null {
  const current = getStoredProjects();
  const idx = current.findIndex(p => p.id === id);
  if (idx === -1) return null;

  current[idx].status = status;
  current[idx].updated_at = new Date().toISOString();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('sic_project_updated', { detail: current[idx] }));
  } catch (e) {
    console.error('Failed to update project status', e);
  }

  return current[idx];
}
