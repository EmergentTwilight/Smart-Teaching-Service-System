import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { curriculumApi } from '../api/curriculum';
import type { CurriculumPayload, CurriculumProgress } from '../types/curriculum';
import StudentCurriculumPage from './StudentCurriculumPage';

vi.mock('antd', async () => {
  const React = await import('react');

  const block = (tag = 'div') =>
    ({ children, title, extra, ...props }: { children?: ReactNode; title?: ReactNode; extra?: ReactNode }) =>
      React.createElement(tag, props, title, extra, children);

  return {
    Alert: ({ message, description, action }: { message?: ReactNode; description?: ReactNode; action?: ReactNode }) =>
      React.createElement('div', { role: 'alert' }, message, description, action),
    Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) =>
      React.createElement('button', { type: 'button', onClick, disabled }, children),
    Card: block(),
    Col: block(),
    Empty: ({ description, children }: { description?: ReactNode; children?: ReactNode }) =>
      React.createElement('div', null, description, children),
    List: ({ dataSource = [], renderItem }: { dataSource?: unknown[]; renderItem?: (item: unknown) => React.ReactNode }) =>
      React.createElement('div', null, dataSource.map((item, index) => React.createElement('div', { key: index }, renderItem?.(item)))),
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
  courseGroups: [],
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
    totalCredits: 0,
    requiredCredits: 0,
    electiveCredits: 0,
    generalCredits: 0,
  },
  remaining: {
    totalCredits: 160,
    requiredCredits: 100,
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
});
