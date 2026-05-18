import { courseSelectionRequest } from './client';
import type { PaginatedRosterPayload, RosterExportQuery, RosterQuery } from '../types/enrollment';

export const rosterApi = {
  getOfferingRoster: (offeringId: string, params?: RosterQuery) =>
    courseSelectionRequest.get<PaginatedRosterPayload>(`/course-selection/teacher/offerings/${offeringId}/roster`, {
      params,
    }),
  exportOfferingRoster: (offeringId: string, params?: RosterExportQuery) =>
    courseSelectionRequest.get<{ downloadToken: string; fileName: string; message: string }>(
      `/course-selection/teacher/offerings/${offeringId}/roster/export`,
      { params }
    ),
};
