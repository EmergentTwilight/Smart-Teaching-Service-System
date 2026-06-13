import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TeacherScoreRow } from '../teacher/types';
import { ModificationRequestModal } from './ModificationRequestModal';
import { ScoreEntryTable } from './ScoreEntryTable';
import { ScoreFilterBar } from './ScoreFilterBar';
import { ScoreStatusTag } from './ScoreStatusTag';

const createRow = (overrides?: Partial<TeacherScoreRow>): TeacherScoreRow => ({
  id: 'row-1',
  scoreId: 'score-1',
  enrollmentId: 'enrollment-1',
  courseOfferingId: 'course-offering-1',
  studentId: 'student-1',
  studentNumber: '20230001',
  studentName: 'Alice',
  className: 'Class 1',
  usualScore: 80,
  midtermScore: 85,
  finalScore: 90,
  totalScore: 86.7,
  gradePoint: 3.7,
  gradeLetter: 'A-',
  status: 'DRAFT',
  hasPendingModificationRequest: false,
  enteredAt: '2026-04-25T10:00:00.000Z',
  modifiedAt: '2026-04-25T10:30:00.000Z',
  ...overrides,
});

describe('ScoreStatusTag', () => {
  it('should render EMPTY and pending request labels', () => {
    render(<ScoreStatusTag status="EMPTY" hasPendingModificationRequest />);

    expect(screen.getByText('未录入')).toBeInTheDocument();
    expect(screen.getByText('申请中')).toBeInTheDocument();
  });

  it('should render confirmed label', () => {
    render(<ScoreStatusTag status="CONFIRMED" />);

    expect(screen.getByText('已确认')).toBeInTheDocument();
  });
});

describe('ScoreEntryTable', () => {
  it('should disable modification request for editable draft rows', () => {
    render(
      <ScoreEntryTable
        rows={[createRow({ status: 'DRAFT' })]}
        selectedRowKeys={[]}
        draftValues={{}}
        pagination={{ page: 1, pageSize: 20, total: 1 }}
        onSelectionChange={vi.fn()}
        onDraftChange={vi.fn()}
        onOpenModification={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '申请改分' })).toBeDisabled();
  });

  it('should enable modification request for submitted rows without pending request', () => {
    const onOpenModification = vi.fn();

    render(
      <ScoreEntryTable
        rows={[createRow({ status: 'SUBMITTED' })]}
        selectedRowKeys={[]}
        draftValues={{}}
        pagination={{ page: 1, pageSize: 20, total: 1 }}
        onSelectionChange={vi.fn()}
        onDraftChange={vi.fn()}
        onOpenModification={onOpenModification}
        onPageChange={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: '申请改分' });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onOpenModification).toHaveBeenCalledWith(
      expect.objectContaining({
        enrollmentId: 'enrollment-1',
        status: 'SUBMITTED',
      }),
    );
  });

  it('should disable score inputs for confirmed rows', () => {
    render(
      <ScoreEntryTable
        rows={[createRow({ status: 'CONFIRMED' })]}
        selectedRowKeys={[]}
        draftValues={{}}
        pagination={{ page: 1, pageSize: 20, total: 1 }}
        onSelectionChange={vi.fn()}
        onDraftChange={vi.fn()}
        onOpenModification={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(3);
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it('should show weighted preview total after local draft edits', () => {
    render(
      <ScoreEntryTable
        rows={[createRow({ totalScore: 70, usualScore: 60, midtermScore: 75, finalScore: 75 })]}
        selectedRowKeys={[]}
        draftValues={{
          'enrollment-1': {
            usualScore: 100,
            midtermScore: 80,
            finalScore: 60,
          },
        }}
        pagination={{ page: 1, pageSize: 20, total: 1 }}
        onSelectionChange={vi.fn()}
        onDraftChange={vi.fn()}
        onOpenModification={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('预览 76，以后端为准')).toBeInTheDocument();
  });

  it('should show grade point and grade letter columns', () => {
    render(
      <ScoreEntryTable
        rows={[createRow({ gradePoint: 3.7, gradeLetter: 'A-' })]}
        selectedRowKeys={[]}
        draftValues={{}}
        pagination={{ page: 1, pageSize: 20, total: 1 }}
        onSelectionChange={vi.fn()}
        onDraftChange={vi.fn()}
        onOpenModification={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('3.70')).toBeInTheDocument();
    expect(screen.getByText('A-')).toBeInTheDocument();
  });
});

describe('ModificationRequestModal', () => {
  it('should submit only changed scores wrapped in proposedChanges', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ModificationRequestModal
        open
        row={createRow({ status: 'SUBMITTED', usualScore: 80, midtermScore: 85, finalScore: 90 })}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // 只改期末成绩，平时/期中保持原值
    const finalInput = screen.getByLabelText('期末成绩');
    fireEvent.change(finalInput, { target: { value: '95' } });

    const reasonInput = screen.getByPlaceholderText('请说明改分原因');
    fireEvent.change(reasonInput, { target: { value: '阅卷复核后加分' } });

    fireEvent.click(screen.getByRole('button', { name: '提交申请' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        proposedChanges: { finalScore: 95 },
        reason: '阅卷复核后加分',
      });
    });
  });

  it('should not submit when no score is changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ModificationRequestModal
        open
        row={createRow({ status: 'SUBMITTED' })}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const reasonInput = screen.getByPlaceholderText('请说明改分原因');
    fireEvent.change(reasonInput, { target: { value: '仅填理由但未改分' } });

    fireEvent.click(screen.getByRole('button', { name: '提交申请' }));

    // 没有任何分数改动时不应触发提交
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});

describe('ScoreFilterBar', () => {
  it('should render keyword input and status select', () => {
    render(
      <ScoreFilterBar
        keyword=""
        status=""
        onKeywordChange={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('按学号或姓名搜索')).toBeInTheDocument();
    expect(screen.getByText('全部状态')).toBeInTheDocument();
  });

  it('should call onKeywordChange when input changes', () => {
    const onKeywordChange = vi.fn();

    render(
      <ScoreFilterBar
        keyword=""
        status=""
        onKeywordChange={onKeywordChange}
        onStatusChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('按学号或姓名搜索'), {
      target: { value: 'Alice' },
    });

    expect(onKeywordChange).toHaveBeenCalledWith('Alice');
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <ScoreFilterBar
        keyword=""
        status=""
        disabled
        onKeywordChange={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('按学号或姓名搜索')).toBeDisabled();
  });

  it('should reflect controlled keyword value', () => {
    render(
      <ScoreFilterBar
        keyword="20230001"
        status=""
        onKeywordChange={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('20230001')).toBeInTheDocument();
  });
});
