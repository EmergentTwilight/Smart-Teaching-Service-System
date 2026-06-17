import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CourseDetailDrawer } from './CourseDetailDrawer';
import { CourseOfferingTable } from './CourseOfferingTable';
import type { AvailableOfferingItem, CourseOfferingDetail } from '../types/course';

const buildOffering = (overrides?: Partial<AvailableOfferingItem>): AvailableOfferingItem => ({
  courseOfferingId: 'offering-1',
  courseCode: 'CS101',
  courseName: '程序设计基础',
  credits: 4,
  courseType: 'required',
  teacherName: '王老师',
  capacity: 30,
  enrolledCount: 10,
  remainingCapacity: 20,
  status: 'open',
  eligibility: {
    isAvailable: false,
    isEnrolled: true,
    isFull: false,
    hasTimeConflict: false,
    prerequisiteSatisfied: true,
    withinCurriculum: true,
    reasons: ['课程已选'],
  },
  ...overrides,
});

const buildDetail = (overrides?: Partial<CourseOfferingDetail>): CourseOfferingDetail => ({
  courseOfferingId: 'offering-1',
  course: {
    id: 'course-1',
    code: 'CS101',
    name: '程序设计基础',
    credits: 4,
    courseType: 'required',
    category: '专业基础',
    description: '课程说明',
    assessmentMethod: '考试',
    status: 'active',
  },
  semester: {
    id: 'semester-1',
    name: '2025-2026 春季',
  },
  teacher: {
    id: 'teacher-1',
    realName: '王老师',
    teacherNumber: 'T001',
    title: '教授',
  },
  capacity: 30,
  enrolledCount: 10,
  remainingCapacity: 20,
  status: 'open',
  schedules: [],
  prerequisites: [],
  eligibility: {
    isAvailable: false,
    isEnrolled: true,
    isFull: false,
    hasTimeConflict: false,
    prerequisiteSatisfied: true,
    withinCurriculum: false,
    reasons: ['课程已选', '课程不在培养方案中'],
  },
  ...overrides,
});

describe('CourseOfferingTable', () => {
  it('calls drop with the exact enrollment id for the selected offering', () => {
    const onDrop = vi.fn();

    render(
      <CourseOfferingTable
        offerings={[buildOffering()]}
        loading={false}
        onDrop={onDrop}
        enrollmentIdByOfferingId={new Map([['offering-1', 'enrollment-1']])}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '退选' }));

    expect(onDrop).toHaveBeenCalledWith({
      offeringId: 'offering-1',
      enrollmentId: 'enrollment-1',
    });
  });

  it('does not render an actionable drop button without an exact enrollment id', () => {
    render(
      <CourseOfferingTable
        offerings={[buildOffering()]}
        loading={false}
        onDrop={vi.fn()}
        enrollmentIdByOfferingId={new Map()}
      />
    );

    expect(screen.queryByRole('button', { name: '退选' })).not.toBeInTheDocument();
    expect(screen.getByText('已选')).toBeInTheDocument();
  });
});

describe('CourseDetailDrawer', () => {
  it('prioritizes the enrolled state over unavailable reasons', async () => {
    render(
      <CourseDetailDrawer
        open
        offeringId="offering-1"
        onClose={vi.fn()}
        loadDetail={() => Promise.resolve(buildDetail())}
      />
    );

    expect(await screen.findByText('已选')).toBeInTheDocument();
    expect(screen.queryByText('不可选')).not.toBeInTheDocument();
    expect(screen.queryByText('课程不在培养方案中')).not.toBeInTheDocument();
  });
});
