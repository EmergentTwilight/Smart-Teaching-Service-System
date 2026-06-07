import { courseSelectionRequest } from './client';
import type { PaginatedRosterPayload, RosterExportQuery, RosterExportResult, RosterQuery } from '../types/enrollment';

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

const parseFileName = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
};

const getAccessToken = (): string | null => {
  const authStorage = localStorage.getItem('auth-storage');
  return authStorage ? JSON.parse(authStorage)?.state?.token ?? null : null;
};

const exportRosterFile = async (offeringId: string, params?: RosterExportQuery): Promise<RosterExportResult> => {
  const token = getAccessToken();
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const response = await fetch(
    `${baseUrl}/course-selection/teacher/offerings/${offeringId}/roster/export${buildQueryString(params)}`,
    {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  if (!response.ok) {
    throw new Error('导出失败');
  }

  const blob = await response.blob();
  const fileName = parseFileName(
    response.headers.get('content-disposition'),
    `roster-${offeringId}.xlsx`
  );

  return { blob, fileName };
};

export const rosterApi = {
  getOfferingRoster: (offeringId: string, params?: RosterQuery) =>
    courseSelectionRequest.get<PaginatedRosterPayload>(`/course-selection/teacher/offerings/${offeringId}/roster`, {
      params,
    }),
  exportOfferingRoster: exportRosterFile,
};
