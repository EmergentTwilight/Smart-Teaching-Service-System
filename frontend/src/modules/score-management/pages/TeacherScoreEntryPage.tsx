import { Alert, Card, Space, Typography, message } from 'antd';
import type { Key } from 'react';
import { useEffect, useState } from 'react';
import { CourseOfferingSelector } from '../components/CourseOfferingSelector';
import { ModificationRequestModal } from '../components/ModificationRequestModal';
import { ScoreBatchToolbar } from '../components/ScoreBatchToolbar';
import { ScoreEntryTable } from '../components/ScoreEntryTable';
import { useCourseScores } from '../hooks/use-course-scores';
import type {
  CourseScoresPagination,
  DraftScorePatch,
  ModificationRequestPayload,
  TeacherScoreRow,
} from '../teacher/types';
import {
  buildDraftPayload,
  buildSubmitPayload,
  hasAnyScore,
  mergeRowValues,
  needsDraftSync,
  pickRowsForAction,
} from '../teacher/submit-utils';

export default function TeacherScoreEntryPage() {
  const [draftCourseOfferingId, setDraftCourseOfferingId] = useState('');
  const [courseOfferingId, setCourseOfferingId] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, DraftScorePatch>>({});
  const [activeModificationRow, setActiveModificationRow] = useState<TeacherScoreRow | null>(null);
  const [paginationParams, setPaginationParams] = useState<CourseScoresPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
  });

  const {
    rows,
    pagination,
    isFetching,
    isLoading,
    error,
    refetch,
    saveDraftMutation,
    submitScoresMutation,
    createModificationRequestMutation,
  } = useCourseScores(courseOfferingId, {
    page: paginationParams.page,
    pageSize: paginationParams.pageSize,
  });

  useEffect(() => {
    setPaginationParams((current) => ({
      ...current,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }));
  }, [pagination.page, pagination.pageSize, pagination.total]);

  useEffect(() => {
    setSelectedRowKeys([]);
    setDraftValues({});
  }, [courseOfferingId]);

  const mergedRows = rows.map((row) => ({
    ...row,
    ...draftValues[row.enrollmentId],
  }));

  const dirtyCount = Object.keys(draftValues).length;

  const handleLoadCourseScores = () => {
    const value = draftCourseOfferingId.trim();

    if (!value) {
      message.warning('请先输入开设课程ID');
      return;
    }

    setPaginationParams((current) => ({ ...current, page: 1 }));
    setCourseOfferingId(value);
  };

  const handleDraftChange = (enrollmentId: string, patch: DraftScorePatch) => {
    setDraftValues((current) => ({
      ...current,
      [enrollmentId]: {
        ...current[enrollmentId],
        ...patch,
      },
    }));
  };

  const handleSaveDraft = async () => {
    if (!courseOfferingId) {
      message.warning('请先加载课程成绩');
      return;
    }

    const targetRows = pickRowsForAction(rows, draftValues, selectedRowKeys);

    if (!targetRows.length) {
      message.warning('请先选择要保存的记录，或先编辑成绩');
      return;
    }

    const payload = buildDraftPayload(targetRows, draftValues).filter((row) => hasAnyScore(row));

    if (!payload.length) {
      message.warning('当前没有可提交的成绩内容');
      return;
    }

    await saveDraftMutation.mutateAsync({ scores: payload });
    setDraftValues({});
    message.success('草稿已保存');
  };

  const handleSubmitScores = async () => {
    if (!courseOfferingId) {
      message.warning('请先加载课程成绩');
      return;
    }

    const targetRows = pickRowsForAction(mergedRows, draftValues, selectedRowKeys).filter((row) =>
      hasAnyScore(mergeRowValues(row, draftValues[row.enrollmentId])),
    );

    if (!targetRows.length) {
      message.warning('请先选择要提交的记录');
      return;
    }

    let submitRows = targetRows;

    if (needsDraftSync(targetRows, draftValues)) {
      const draftPayload = buildDraftPayload(targetRows, draftValues).filter((row) => hasAnyScore(row));

      if (!draftPayload.length) {
        message.warning('当前没有可提交的成绩内容');
        return;
      }

      await saveDraftMutation.mutateAsync({ scores: draftPayload });

      const refreshed = await refetch();
      const latestRows = refreshed.data?.rows ?? [];
      const latestRowsByEnrollmentId = new Map(
        latestRows.map((row) => [row.enrollmentId, row] as const),
      );

      submitRows = targetRows.map(
        (row) => latestRowsByEnrollmentId.get(row.enrollmentId) ?? row,
      );
    }

    if (submitRows.some((row) => !row.scoreId)) {
      message.error('部分记录尚未生成 scoreId，暂时无法提交，请刷新后重试');
      return;
    }

    await submitScoresMutation.mutateAsync(buildSubmitPayload(submitRows));
    setSelectedRowKeys([]);
    setDraftValues({});
    message.success('成绩已提交');
  };

  const handleSubmitModification = async (payload: ModificationRequestPayload) => {
    if (!activeModificationRow?.scoreId) {
      message.warning('当前记录缺少 scoreId，暂时无法提交申请');
      return;
    }

    await createModificationRequestMutation.mutateAsync({
      scoreId: activeModificationRow.scoreId,
      payload,
    });
    setActiveModificationRow(null);
    message.success('改分申请已提交');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <CourseOfferingSelector
        value={draftCourseOfferingId}
        loading={isLoading || isFetching}
        onChange={setDraftCourseOfferingId}
        onSubmit={handleLoadCourseScores}
      />

      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            已覆盖的前端能力：列表展示、成绩编辑、草稿保存、提交、改分申请、共享类型与工具层。
          </Typography.Text>
        </Space>
      </Card>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="成绩数据加载失败"
          description={error instanceof Error ? error.message : '请检查接口或登录状态'}
        />
      ) : null}

      <ScoreBatchToolbar
        selectedCount={selectedRowKeys.length}
        dirtyCount={dirtyCount}
        disabled={!courseOfferingId}
        loading={
          isFetching ||
          saveDraftMutation.isPending ||
          submitScoresMutation.isPending ||
          createModificationRequestMutation.isPending
        }
        onRefresh={() => {
          void refetch();
        }}
        onSaveDraft={() => {
          void handleSaveDraft();
        }}
        onSubmit={() => {
          void handleSubmitScores();
        }}
      />

      <ScoreEntryTable
        rows={mergedRows}
        loading={isLoading || isFetching}
        selectedRowKeys={selectedRowKeys}
        draftValues={draftValues}
        pagination={pagination}
        onSelectionChange={setSelectedRowKeys}
        onDraftChange={handleDraftChange}
        onOpenModification={setActiveModificationRow}
        onPageChange={(page, pageSize) => {
          setPaginationParams((current) => ({
            ...current,
            page,
            pageSize,
          }));
        }}
      />

      <ModificationRequestModal
        open={Boolean(activeModificationRow)}
        row={activeModificationRow}
        loading={createModificationRequestMutation.isPending}
        onCancel={() => setActiveModificationRow(null)}
        onSubmit={handleSubmitModification}
      />
    </Space>
  );
}
