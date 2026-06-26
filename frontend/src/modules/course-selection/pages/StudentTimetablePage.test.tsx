import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrollmentsApi } from '../api/enrollments';
import { useMyEnrollments } from '../hooks/useMyEnrollments';
import StudentTimetablePage from './StudentTimetablePage';

vi.mock('antd', async () => {
  const React = await import('react');

  const block = (tag = 'div') => {
    const MockAntdBlock = ({
      children,
      title,
      extra,
      ...props
    }: {
      children?: ReactNode;
      title?: ReactNode;
      extra?: ReactNode;
    }) => React.createElement(tag, props, title, extra, children);

    MockAntdBlock.displayName = `MockAntdBlock(${tag})`;
    return MockAntdBlock;
  };

  const Descriptions = Object.assign(
    ({ children }: { children?: ReactNode }) => React.createElement('dl', null, children),
    {
      Item: ({ label, children }: { label?: ReactNode; children?: ReactNode }) =>
        React.createElement('div', null, React.createElement('dt', null, label), React.createElement('dd', null, children)),
    }
  );

  const Form = Object.assign(
    ({ children }: { children?: ReactNode }) => React.createElement('form', null, children),
    {
      Item: ({ label, children }: { label?: ReactNode; children?: ReactNode }) =>
        React.createElement('label', null, label, children),
    }
  );

  return {
    Alert: ({ message, description, action }: { message?: ReactNode; description?: ReactNode; action?: ReactNode }) =>
      React.createElement('div', { role: 'alert' }, message, description, action),
    Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) =>
      React.createElement('button', { type: 'button', onClick }, children),
    Card: block(),
    Descriptions,
    Empty: ({ description }: { description?: ReactNode }) => React.createElement('div', null, description),
    Form,
    Select: ({
      options = [],
      placeholder,
      value,
      onChange,
    }: {
      options?: Array<{ value: string; label: string }>;
      placeholder?: string;
      value?: string;
      onChange?: (value: string) => void;
    }) =>
      React.createElement(
        'select',
        {
          'aria-label': placeholder,
          value: value ?? '',
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange?.(event.target.value),
        },
        options.map((option) =>
          React.createElement('option', { key: option.value, value: option.value }, option.label)
        )
      ),
    Space: block('span'),
    Spin: () => React.createElement('div', null, '加载中'),
    Tag: ({ children }: { children?: ReactNode }) => React.createElement('span', null, children),
    Typography: {
      Title: block('h2'),
      Text: block('span'),
    },
  };
});

vi.mock('@ant-design/icons', async () => {
  const React = await import('react');
  return {
    PrinterOutlined: () => React.createElement('span', null),
    ReloadOutlined: () => React.createElement('span', null),
  };
});

vi.mock('../api/enrollments', () => ({
  enrollmentsApi: {
    listMyTimetableSemesters: vi.fn(),
    getMyTimetable: vi.fn(),
  },
}));

vi.mock('../hooks/useMyEnrollments', () => ({
  useMyEnrollments: vi.fn(),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <StudentTimetablePage />
    </QueryClientProvider>
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useMyEnrollments).mockReturnValue({
    isLoading: false,
    data: {
      items: [
        {
          enrollmentId: 'enrollment-1',
          status: 'enrolled',
          enrolledAt: '2026-02-23T00:00:00.000Z',
          courseOffering: {
            id: 'offering-1',
            courseName: '算法设计',
            courseCode: 'CS301',
            credits: 4,
            courseType: 'required',
            teacherName: '王老师',
            semesterName: '2026 春季',
          },
        },
      ],
      summary: {
        enrolledCount: 1,
        enrolledCredits: 4,
      },
      pagination: {
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1,
      },
    },
  } as ReturnType<typeof useMyEnrollments>);
  vi.mocked(enrollmentsApi.listMyTimetableSemesters).mockResolvedValue({
    defaultSemesterId: 'semester-current',
    items: [
      {
        id: 'semester-current',
        name: '2026 春季',
        status: 'current',
        startDate: '2026-02-23T00:00:00.000Z',
        endDate: '2026-07-10T00:00:00.000Z',
        isCurrent: true,
        isDefault: true,
        enrolledCount: 1,
        scheduledItemCount: 1,
        missingScheduleCount: 0,
      },
      {
        id: 'semester-history',
        name: '2025 秋季',
        status: 'ended',
        startDate: '2025-09-01T00:00:00.000Z',
        endDate: '2026-01-16T00:00:00.000Z',
        isCurrent: false,
        isDefault: false,
        enrolledCount: 2,
        scheduledItemCount: 2,
        missingScheduleCount: 0,
      },
    ],
  });
  vi.mocked(enrollmentsApi.getMyTimetable).mockImplementation(async (params) => ({
    semester: {
      id: params?.semesterId ?? 'semester-current',
      name: params?.semesterId === 'semester-history' ? '2025 秋季' : '2026 春季',
    },
    printable: true,
    items: [],
    missingScheduleItems: [],
  }));
});

describe('StudentTimetablePage', () => {
  it('selects a saved historical semester instead of typing raw semester id', async () => {
    renderPage();

    const select = await screen.findByLabelText('选择或搜索学期');
    await waitFor(() => {
      expect(enrollmentsApi.getMyTimetable).toHaveBeenCalledWith({
        semesterId: 'semester-current',
      });
    });

    fireEvent.change(select, { target: { value: 'semester-history' } });

    await waitFor(() => {
      expect(enrollmentsApi.getMyTimetable).toHaveBeenCalledWith({
        semesterId: 'semester-history',
      });
    });
  });
});
