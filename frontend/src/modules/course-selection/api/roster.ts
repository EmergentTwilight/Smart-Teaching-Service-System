import { courseSelectionRequest } from './client';
import type { PaginatedRosterPayload, RosterExportQuery, RosterQuery } from '../types/enrollment';

const buildQueryString = (params?: RosterExportQuery) => {
  const searchParams = new URLSearchParams();
  if (params?.status) {
    searchParams.set('status', params.status);
  }
  if (params?.format) {
    searchParams.set('format', params.format);
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const getAccessToken = (): string | null => {
  const authStorage = localStorage.getItem('auth-storage');
  return authStorage ? JSON.parse(authStorage)?.state?.token ?? null : null;
};

const exportRosterFile = async (offeringId: string, params?: RosterExportQuery): Promise<Blob> => {
  const token = getAccessToken();
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const exportUrl = `${baseUrl}/course-selection/teacher/offerings/${offeringId}/roster/export${buildQueryString(params)}`;
  const response = await fetch(
    exportUrl,
    {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.message || '导出失败');
  }

  return response.blob();
};

export const rosterApi = {
  getOfferingRoster: (offeringId: string, params?: RosterQuery) =>
    courseSelectionRequest.get<PaginatedRosterPayload>(`/course-selection/teacher/offerings/${offeringId}/roster`, {
      params,
    }),
  exportOfferingRoster: exportRosterFile,
};
