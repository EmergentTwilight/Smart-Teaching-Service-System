import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrollmentsApi } from '../api/enrollments';
import { curriculumApi } from '../api/curriculum';
import { coursesApi } from '../api/courses';
import { useAvailableOfferings } from '../hooks/useAvailableOfferings';
import { useMyEnrollments } from '../hooks/useMyEnrollments';
import type { AvailableOfferingItem } from '../types/course';
import type { EnrollmentItem } from '../types/enrollment';
import type { CurriculumProgress } from '../types/curriculum';
import StudentCourseSelectionPage from './StudentCourseSelectionPage';

vi.mock('../hooks/useAvailableOfferings', () => ({
  useAvailableOfferings: vi.fn(),
}));

vi.mock('../hooks/useMyEnrollments', () => ({
  useMyEnrollments: vi.fn(),
}));

vi.mock('../api/enrollments', () => ({
  enrollmentsApi: {
    createEnrollment: vi.fn(),
    dropEnrollment: vi.fn(),
    listMyEnrollments: vi.fn(),
  },
}));

vi.mock('../api/curriculum', () => ({
  curriculumApi: {
    getMyCurriculumProgress: vi.fn(),
  },
}));

vi.mock('../api/courses', () => ({
  coursesApi: {
    getOfferingDetail: vi.fn(),
  },
}));

const offering: AvailableOfferingItem = {
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
};

const availableOffering: AvailableOfferingItem = {
  ...offering,
  eligibility: {
    ...offering.eligibility,
    isAvailable: true,
    isEnrolled: false,
    reasons: [],
  },
};

const enrollment: EnrollmentItem = {
  enrollmentId: 'enrollment-1',
  status: 'enrolled',
  enrolledAt: '2026-06-01T08:00:00.000Z',
  droppedAt: null,
  courseOffering: {
    id: 'offering-1',
    courseName: '程序设计基础',
    courseCode: 'CS101',
    credits: 4,
    courseType: 'required',
    teacherName: '王老师',
    semesterName: '2025-2026 春季',
  },
};

const progress: CurriculumProgress = {
  curriculumId: 'curriculum-1',
  requirements: {
    totalCredits: 160,
    requiredCredits: 100,
    electiveCredits: 40,
    generalCredits: 20,
  },
  selected: {
    totalCredits: 4,
    requiredCredits: 4,
    electiveCredits: 0,
    generalCredits: 0,
  },
  remaining: {
    totalCredits: 156,
    requiredCredits: 96,
    electiveCredits: 40,
    generalCredits: 20,
  },
  byCourseType: [],
  warnings: [],
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

interface RenderPageOptions {
  offerings?: AvailableOfferingItem[];
  enrollments?: EnrollmentItem[];
}

const renderPage = ({
  offerings = [offering],
  enrollments = [enrollment],
}: RenderPageOptions = {}) => {
  const enrolledItems = enrollments.filter((item) => item.status === 'enrolled');

  vi.mocked(useAvailableOfferings).mockReturnValue({
    available: {
      data: {
        items: offerings,
        pagination: {
          page: 1,
          pageSize: 20,
          total: offerings.length,
          totalPages: 1,
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    },
  } as ReturnType<typeof useAvailableOfferings>);

  vi.mocked(useMyEnrollments).mockReturnValue({
    data: {
      items: enrollments,
      summary: {
        enrolledCount: enrolledItems.length,
        enrolledCredits: enrolledItems.reduce(
          (sum, item) => sum + item.courseOffering.credits,
          0
        ),
      },
      pagination: {
        page: 1,
        pageSize: 100,
        total: enrollments.length,
        totalPages: 1,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useMyEnrollments>);

  vi.mocked(curriculumApi.getMyCurriculumProgress).mockResolvedValue(progress);
  vi.mocked(enrollmentsApi.createEnrollment).mockResolvedValue({
    enrollment: {
      id: 'enrollment-1',
      status: 'enrolled',
      enrolledAt: '2026-06-01T08:00:00.000Z',
      droppedAt: null,
    },
    courseOffering: {
      id: 'offering-1',
      courseCode: 'CS101',
      courseName: '程序设计基础',
      capacity: 30,
      enrolledCount: 11,
      remainingCapacity: 19,
    },
    creditSummary: {
      currentSelectedCredits: 4,
      maxCredits: 30,
    },
  });
  vi.mocked(enrollmentsApi.dropEnrollment).mockResolvedValue({
    enrollment: {
      id: 'enrollment-1',
      status: 'dropped',
      enrolledAt: '2026-06-01T08:00:00.000Z',
      droppedAt: '2026-06-01T09:00:00.000Z',
    },
    courseOffering: {
      id: 'offering-1',
      courseCode: 'CS101',
      courseName: '程序设计基础',
      capacity: 30,
      enrolledCount: 9,
      remainingCapacity: 21,
    },
  });
  vi.mocked(coursesApi.getOfferingDetail).mockRejectedValue(new Error('not used'));

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <StudentCourseSelectionPage />
    </QueryClientProvider>
  );
};

describe('StudentCourseSelectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a controlled enrollment confirmation and submits the exact offering id', async () => {
    renderPage({
      offerings: [availableOffering],
      enrollments: [],
    });

    fireEvent.click(screen.getByRole('button', { name: /选\s*课/ }));

    expect(screen.getAllByText('确认选课').length).toBeGreaterThan(0);
    expect(screen.getByText(/确认选择课程/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /确认\s*选课/ }));

    await waitFor(() => {
      expect(enrollmentsApi.createEnrollment).toHaveBeenCalledWith(
        expect.objectContaining({
          courseOfferingId: 'offering-1',
          clientRequestId: expect.stringMatching(/^enroll-/),
        })
      );
    });
  });

  it('allows re-enrollment when my latest enrollment is dropped', async () => {
    const droppedEnrollment: EnrollmentItem = {
      ...enrollment,
      status: 'dropped',
      droppedAt: '2026-06-01T09:00:00.000Z',
    };

    renderPage({
      offerings: [offering],
      enrollments: [droppedEnrollment],
    });

    expect(screen.queryByRole('button', { name: '退选' })).not.toBeInTheDocument();

    const enrollButton = screen.getByRole('button', { name: /选\s*课/ });
    expect(enrollButton).not.toBeDisabled();

    fireEvent.click(enrollButton);
    fireEvent.click(screen.getByRole('button', { name: /确认\s*选课/ }));

    await waitFor(() => {
      expect(enrollmentsApi.createEnrollment).toHaveBeenCalledWith(
        expect.objectContaining({
          courseOfferingId: 'offering-1',
        })
      );
    });
  });

  it('opens a controlled drop confirmation and submits the exact enrollment id', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '退选' }));

    expect(screen.getAllByText('确认退选').length).toBeGreaterThan(0);
    expect(screen.getByText(/确认退选课程/)).toBeInTheDocument();
    expect(screen.getAllByText('程序设计基础（CS101）').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '确认退选' }));

    await waitFor(() => {
      expect(enrollmentsApi.dropEnrollment).toHaveBeenCalledWith(
        'enrollment-1',
        expect.objectContaining({
          reason: undefined,
          clientRequestId: expect.stringMatching(/^drop-/),
        })
      );
    });
  });

  it('keeps a visible backend failure reason in the drop confirmation', async () => {
    renderPage();
    vi.mocked(enrollmentsApi.dropEnrollment).mockRejectedValueOnce(
      new Error('当前选课阶段不允许退选')
    );

    fireEvent.click(screen.getByRole('button', { name: '退选' }));
    fireEvent.click(screen.getByRole('button', { name: '确认退选' }));

    expect(await screen.findByText('退选请求未完成')).toBeInTheDocument();
    expect(screen.getByText('当前选课阶段不允许退选')).toBeInTheDocument();
    expect(screen.getAllByText('确认退选').length).toBeGreaterThan(0);
  });
});
