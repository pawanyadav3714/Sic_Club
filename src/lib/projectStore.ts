import { ProjectSubmission } from '../types';

const STORAGE_KEY = 'sic_submitted_projects_v1';

export const INITIAL_SAMPLE_PROJECTS: ProjectSubmission[] = [];

export function getStoredProjects(): ProjectSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge any lingering dummy sample projects
      const cleanList = parsed.filter(p => p.id !== 'proj-1' && p.id !== 'proj-2' && p.id !== 'proj-3' && p.user_id !== 'aditya-sample' && p.user_id !== 'neha-sample' && p.user_id !== 'rohit-sample');
      if (cleanList.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
      }
      return cleanList;
    }
    return [];
  } catch (e) {
    return [];
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
