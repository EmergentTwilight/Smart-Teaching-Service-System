import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { curriculumApi } from '../api/curriculum';
import type { CurriculumPayload, CurriculumProgress } from '../types/curriculum';
import StudentCurriculumPage from './StudentCurriculumPage';

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

  const List = Object.assign(
    ({ dataSource = [], renderItem }: { dataSource?: unknown[]; renderItem?: (item: unknown) => React.ReactNode }) =>
      React.createElement('div', null, dataSource.map((item, index) => React.createElement('div', { key: index }, renderItem?.(item)))),
    {
      Item: ({ children }: { children?: ReactNode }) => React.createElement('div', null, children),
    }
  );

  return {
    Alert: ({ message, description, action }: { message?: ReactNode; description?: ReactNode; action?: ReactNode }) =>
      React.createElement('div', { role: 'alert' }, message, description, action),
    Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) =>
      React.createElement('button', { type: 'button', onClick, disabled }, children),
    Card: block(),
    Col: block(),
    Empty: ({ description, children }: { description?: ReactNode; children?: ReactNode }) =>
      React.createElement('div', null, description, children),
    List,
    Progress: () => React.createElement('div', null),
    Row: block(),
    Space: block('span'),
    Spin: () => React.createElement('div', null, '加载中'),
    Tag: ({ children }: { children?: ReactNode }) => React.createElement('span', null, children),
    Typography: {
      Title: block('h2'),
      Text: block('span'),
      Paragraph: block('p'),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock('@ant-design/icons', async () => {
  const React = await import('react');
  return {
    ExclamationCircleOutlined: () => React.createElement('span', null),
    InfoCircleOutlined: () => React.createElement('span', null),
  };
});

vi.mock('../api/curriculum', () => ({
  curriculumApi: {
    getMyCurriculum: vi.fn(),
    getMyCurriculumProgress: vi.fn(),
    confirmMyCurriculum: vi.fn(),
  },
}));

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: () => ({
    getPropertyValue: () => '',
  }),
});

const curriculumPayload: CurriculumPayload = {
  curriculum: {
    id: 'curriculum-1',
    name: '软件工程 2024 级培养方案',
    year: 2024,
    major: {
      id: 'major-1',
      name: '软件工程',
      code: 'SE',
    },
    totalCredits: 160,
    requiredCredits: 100,
    electiveCredits: 40,
  },
  courseGroups: [
    {
      courseType: 'required',
      courseTypeName: '专业必修课',
      courses: [
        {
          courseId: 'course-1',
          courseCode: 'CS101',
          courseName: '程序设计基础',
          credits: 4,
          courseType: 'required',
          semesterSuggestion: 1,
          status: 'active',
          studyStatus: 'completed',
        },
        {
          courseId: 'course-2',
          courseCode: 'CS201',
          courseName: '数据结构',
          credits: 4,
          courseType: 'required',
          semesterSuggestion: 3,
          status: 'active',
          studyStatus: 'in_progress',
        },
        {
          courseId: 'course-3',
          courseCode: 'CS301',
          courseName: '算法设计',
          credits: 4,
          courseType: 'required',
          semesterSuggestion: 4,
          status: 'active',
          studyStatus: 'not_started',
        },
      ],
    },
  ],
  confirmation: {
    requiredBeforeSelection: true,
    confirmed: false,
    confirmedAt: null,
    message: '请先确认当前培养方案后再进入正式选课流程。',
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
    totalCredits: 8,
    requiredCredits: 8,
    electiveCredits: 0,
    generalCredits: 0,
  },
  completed: {
    totalCredits: 4,
    requiredCredits: 4,
    electiveCredits: 0,
    generalCredits: 0,
  },
  inProgress: {
    totalCredits: 4,
    requiredCredits: 4,
    electiveCredits: 0,
    generalCredits: 0,
  },
  remaining: {
    totalCredits: 152,
    requiredCredits: 92,
    electiveCredits: 40,
    generalCredits: 20,
  },
  byCourseType: [
    {
      courseType: 'required',
      selectedCredits: 8,
      completedCredits: 4,
      inProgressCredits: 4,
      requirementCredits: 100,
      courseCount: 2,
    },
  ],
  warnings: [],
};

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
      <StudentCurriculumPage />
    </QueryClientProvider>
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(curriculumApi.getMyCurriculum).mockResolvedValue(curriculumPayload);
  vi.mocked(curriculumApi.getMyCurriculumProgress).mockResolvedValue(progress);
  vi.mocked(curriculumApi.confirmMyCurriculum).mockResolvedValue({
    confirmation: {
      requiredBeforeSelection: true,
      confirmed: true,
      confirmedAt: '2026-03-01T00:00:00.000Z',
      message: '当前培养方案已确认。',
    },
  });
});

describe('StudentCurriculumPage', () => {
  it('confirms the current curriculum through the backend API', async () => {
    renderPage();

    const button = await screen.findByRole('button', { name: '确认培养方案' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(curriculumApi.confirmMyCurriculum).toHaveBeenCalledWith('curriculum-1');
    });
  });

  it('shows completed, in-progress, and not-started course states', async () => {
    renderPage();

    expect(await screen.findByText('已修读')).toBeInTheDocument();
    expect(screen.getAllByText('正在修读').length).toBeGreaterThan(0);
    expect(screen.getByText('未修读')).toBeInTheDocument();
    expect(screen.getAllByLabelText('已修读 4 学分，正在修读 4 学分').length).toBeGreaterThan(0);
  });
});
