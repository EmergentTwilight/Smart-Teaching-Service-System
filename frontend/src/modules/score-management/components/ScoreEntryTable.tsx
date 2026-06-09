import { Button, InputNumber, Space, Table, Typography } from 'antd';
import type { TableProps } from 'antd';
import type { Key } from 'react';
import {
  SCORE_LIMITS,
  formatDateTime,
  formatGradePoint,
} from '../shared';
import type {
  CourseScoresPagination,
  DraftScorePatch,
  EditableScoreValues,
  TeacherScoreRow,
} from '../teacher/types';
import { ScoreStatusTag } from './ScoreStatusTag';

interface ScoreEntryTableProps {
  rows: TeacherScoreRow[];
  loading?: boolean;
  selectedRowKeys: Key[];
  draftValues: Record<string, DraftScorePatch>;
  pagination: CourseScoresPagination;
  onSelectionChange: (keys: Key[]) => void;
  onDraftChange: (enrollmentId: string, patch: DraftScorePatch) => void;
  onOpenModification: (row: TeacherScoreRow) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

function isRowEditable(status: TeacherScoreRow['status']): boolean {
  return status === 'EMPTY' || status === 'DRAFT';
}

function mergeValues(row: TeacherScoreRow, patch?: DraftScorePatch): EditableScoreValues {
  return {
    usualScore: patch?.usualScore ?? row.usualScore,
    midtermScore: patch?.midtermScore ?? row.midtermScore,
    finalScore: patch?.finalScore ?? row.finalScore,
  };
}

function getPreviewTotal(row: TeacherScoreRow, patch?: DraftScorePatch): number | null {
  const { usualScore, midtermScore, finalScore } = mergeValues(row, patch);

  if (
    typeof usualScore !== 'number' ||
    typeof midtermScore !== 'number' ||
    typeof finalScore !== 'number'
  ) {
    return null;
  }

  return Number((usualScore * 0.3 + midtermScore * 0.2 + finalScore * 0.5).toFixed(1));
}

function ScoreInput({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <InputNumber
      min={SCORE_LIMITS.MIN}
      max={SCORE_LIMITS.MAX}
      value={value ?? null}
      disabled={disabled}
      style={{ width: '100%' }}
      placeholder="留空"
      onChange={(nextValue) => onChange(typeof nextValue === 'number' ? nextValue : null)}
    />
  );
}

export function ScoreEntryTable({
  rows,
  loading = false,
  selectedRowKeys,
  draftValues,
  pagination,
  onSelectionChange,
  onDraftChange,
  onOpenModification,
  onPageChange,
}: ScoreEntryTableProps) {
  const columns: TableProps<TeacherScoreRow>['columns'] = [
    {
      title: '学号',
      dataIndex: 'studentNumber',
      width: 140,
      fixed: 'left',
    },
    {
      title: '姓名',
      dataIndex: 'studentName',
      width: 120,
      fixed: 'left',
    },
    {
      title: '班级',
      dataIndex: 'className',
      width: 140,
      render: (value: string | null) => value || '--',
    },
    {
      title: '平时',
      dataIndex: 'usualScore',
      width: 120,
      render: (_value: number | null, row) => {
        const merged = mergeValues(row, draftValues[row.enrollmentId]);
        return (
          <ScoreInput
            value={merged.usualScore}
            disabled={!isRowEditable(row.status)}
            onChange={(value) => onDraftChange(row.enrollmentId, { usualScore: value })}
          />
        );
      },
    },
    {
      title: '期中',
      dataIndex: 'midtermScore',
      width: 120,
      render: (_value: number | null, row) => {
        const merged = mergeValues(row, draftValues[row.enrollmentId]);
        return (
          <ScoreInput
            value={merged.midtermScore}
            disabled={!isRowEditable(row.status)}
            onChange={(value) => onDraftChange(row.enrollmentId, { midtermScore: value })}
          />
        );
      },
    },
    {
      title: '期末',
      dataIndex: 'finalScore',
      width: 120,
      render: (_value: number | null, row) => {
        const merged = mergeValues(row, draftValues[row.enrollmentId]);
        return (
          <ScoreInput
            value={merged.finalScore}
            disabled={!isRowEditable(row.status)}
            onChange={(value) => onDraftChange(row.enrollmentId, { finalScore: value })}
          />
        );
      },
    },
    {
      title: '总评',
      dataIndex: 'totalScore',
      width: 180,
      render: (_value: number | null, row) => {
        const preview = getPreviewTotal(row, draftValues[row.enrollmentId]);

        return (
          <Space direction="vertical" size={0}>
            <Typography.Text>{row.totalScore ?? '--'}</Typography.Text>
            <Typography.Text type="secondary">
              {preview === null ? '需填完三项后预览' : `预览 ${preview}，以后端为准`}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: '绩点',
      dataIndex: 'gradePoint',
      width: 100,
      render: (value: number | null) => formatGradePoint(value),
    },
    {
      title: '等级',
      dataIndex: 'gradeLetter',
      width: 100,
      render: (value: string | null) => value ?? '--',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 170,
      render: (_value: TeacherScoreRow['status'], row) => (
        <ScoreStatusTag
          status={row.status}
          hasPendingModificationRequest={row.hasPendingModificationRequest}
        />
      ),
    },
    {
      title: '最近更新',
      dataIndex: 'modifiedAt',
      width: 180,
      render: (value: string | null, row) => formatDateTime(value ?? row.enteredAt),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_value: unknown, row) => (
        <Button
          type="link"
          disabled={
            isRowEditable(row.status) || !row.scoreId || row.hasPendingModificationRequest
          }
          onClick={() => onOpenModification(row)}
        >
          申请改分
        </Button>
      ),
    },
  ];

  return (
    <Table<TeacherScoreRow>
      rowKey="enrollmentId"
      loading={loading}
      columns={columns}
      dataSource={rows}
      scroll={{ x: 1480 }}
      rowSelection={{
        selectedRowKeys,
        onChange: onSelectionChange,
        getCheckboxProps: (row) => ({
          disabled: !isRowEditable(row.status),
        }),
      }}
      pagination={{
        current: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        onChange: onPageChange,
      }}
    />
  );
}
