import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CourseDetailDrawer } from './CourseDetailDrawer';
import { CourseOfferingTable } from './CourseOfferingTable';
import { TimetableGrid } from './TimetableGrid';
import type { AvailableOfferingItem, CourseOfferingDetail } from '../types/course';
import type { TimetableSlot } from '../types/enrollment';

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
        enrollmentStateByOfferingId={new Map([
          ['offering-1', { enrollmentId: 'enrollment-1', status: 'enrolled' }],
        ])}
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
        enrollmentStateByOfferingId={new Map()}
      />
    );

    expect(screen.queryByRole('button', { name: '退选' })).not.toBeInTheDocument();
    expect(screen.getAllByText('已选').length).toBeGreaterThan(0);
  });

  it('hides unavailable reasons when the offering is already enrolled', () => {
    render(
      <CourseOfferingTable
        offerings={[
          buildOffering({
            eligibility: {
              isAvailable: false,
              isEnrolled: true,
              isFull: false,
              hasTimeConflict: false,
              prerequisiteSatisfied: true,
              withinCurriculum: false,
              reasons: ['课程已选', '课程不在培养方案中'],
            },
          }),
        ]}
        loading={false}
      />
    );

    expect(screen.getAllByText('已选').length).toBeGreaterThan(0);
    expect(screen.queryByText('课程不在培养方案中')).not.toBeInTheDocument();
  });

  it('allows enrolling again when my enrollment is already dropped', () => {
    const onEnroll = vi.fn();

    render(
      <CourseOfferingTable
        offerings={[buildOffering()]}
        loading={false}
        onEnroll={onEnroll}
        onDrop={vi.fn()}
        enrollmentStateByOfferingId={new Map([
          ['offering-1', { enrollmentId: 'enrollment-1', status: 'dropped' }],
        ])}
      />
    );

    const enrollButton = screen.getByRole('button', { name: /选\s*课/ });
    expect(enrollButton).not.toBeDisabled();

    fireEvent.click(enrollButton);

    expect(onEnroll).toHaveBeenCalledWith('offering-1');
    expect(screen.queryByText('已选')).not.toBeInTheDocument();
  });

  it('does not enable enrollment for non-open offerings', () => {
    const onEnroll = vi.fn();

    render(
      <CourseOfferingTable
        offerings={[
          buildOffering({
            status: 'planned',
            eligibility: {
              isAvailable: true,
              isEnrolled: false,
              isFull: false,
              hasTimeConflict: false,
              prerequisiteSatisfied: true,
              withinCurriculum: true,
              reasons: [],
            },
          }),
        ]}
        loading={false}
        onEnroll={onEnroll}
      />
    );

    expect(screen.getByRole('button', { name: /选\s*课/ })).toBeDisabled();
    expect(screen.getByText('课程开设未开放选课')).toBeInTheDocument();
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

  it('shows only the primary unavailable reason in course details', async () => {
    render(
      <CourseDetailDrawer
        open
        offeringId="offering-1"
        onClose={vi.fn()}
        loadDetail={() =>
          Promise.resolve(
            buildDetail({
              eligibility: {
                isAvailable: false,
                isEnrolled: false,
                isFull: false,
                hasTimeConflict: true,
                prerequisiteSatisfied: true,
                withinCurriculum: false,
                reasons: ['课程有时间冲突', '课程不在培养方案中'],
              },
            })
          )
        }
      />
    );

    expect(await screen.findByText('课程有时间冲突')).toBeInTheDocument();
    expect(screen.queryByText('课程不在培养方案中')).not.toBeInTheDocument();
  });
});

describe('TimetableGrid', () => {
  it('contains print isolation styles for the timetable area', () => {
    const slot: TimetableSlot = {
      enrollmentId: 'enrollment-1',
      courseOfferingId: 'offering-1',
      courseName: '程序设计基础',
      courseCode: 'CS101',
      teacherName: '王老师',
      credits: 4,
      dayOfWeek: 1,
      startWeek: 1,
      endWeek: 16,
      startPeriod: 1,
      endPeriod: 2,
      classroom: '第一教学楼 101',
    };

    render(<TimetableGrid slots={[slot]} semesterName="2025-2026 春季" />);

    expect(document.querySelector('.course-selection-timetable-print')).toBeInTheDocument();
    const styleText = Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .join('\n');

    expect(styleText).toContain('body *');
    expect(styleText).toContain('.course-selection-timetable-print');
    expect(styleText).toContain('.course-selection-print-hidden');
  });
});
