import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  normalizeCourseScoresResult,
  scoreManagementApi,
} from '../api/score-management';
import type {
  CourseScoresQueryParams,
  ModificationRequestPayload,
  SaveDraftScoresPayload,
  SubmitScoresPayload,
} from '../teacher/types';

export function useCourseScores(courseOfferingId: string, params?: CourseScoresQueryParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [
      'score-management',
      'teacher',
      'course-scores',
      courseOfferingId,
      params?.page ?? 1,
      params?.pageSize ?? null,
    ],
    enabled: Boolean(courseOfferingId),
    queryFn: async () => {
      const result = await scoreManagementApi.getCourseScores(courseOfferingId, params);
      return normalizeCourseScoresResult(result, courseOfferingId, params);
    },
  });

  const invalidateScores = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['score-management', 'teacher', 'course-scores', courseOfferingId],
    });
  };

  const saveDraftMutation = useMutation({
    mutationFn: (payload: SaveDraftScoresPayload) =>
      scoreManagementApi.saveDraftScores(courseOfferingId, payload),
    onSuccess: invalidateScores,
  });

  const submitScoresMutation = useMutation({
    mutationFn: (payload: SubmitScoresPayload) =>
      scoreManagementApi.submitScores(courseOfferingId, payload),
    onSuccess: invalidateScores,
  });

  const createModificationRequestMutation = useMutation({
    mutationFn: ({ scoreId, payload }: { scoreId: string; payload: ModificationRequestPayload }) =>
      scoreManagementApi.createModificationRequest(scoreId, payload),
    onSuccess: invalidateScores,
  });

  return {
    ...query,
    rows: query.data?.rows ?? [],
    pagination: query.data?.pagination ?? {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      total: 0,
    },
    saveDraftMutation,
    submitScoresMutation,
    createModificationRequestMutation,
  };
}
