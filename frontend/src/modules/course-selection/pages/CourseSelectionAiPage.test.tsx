import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiAdvisor } from '../hooks/useAiAdvisor';
import CourseSelectionAiPage from './CourseSelectionAiPage';
import type { AiAdvicePayload } from '../types/ai';

vi.mock('../hooks/useAiAdvisor', () => ({
  useAiAdvisor: vi.fn(),
}));

const recommendMutate = vi.fn();
const explainMutate = vi.fn();
const saveRecordMutate = vi.fn();
const deleteRecordMutate = vi.fn();

const advice: AiAdvicePayload = {
  disclaimer: 'AI 建议仅供参考。',
  creditProgressSummary: {
    currentSelectedCredits: 6,
    targetCredits: 160,
    maxCredits: 28,
  },
  recommendations: [
    {
      courseOfferingId: 'offering-1',
      courseCode: 'CS101',
      courseName: '程序设计基础',
      credits: 4,
      teacherName: '王老师',
      recommendationScore: 0.9,
      reasons: ['属于当前培养方案范围'],
      risks: [],
      eligibilitySnapshot: {
        isAvailable: true,
      },
    },
  ],
  conflictNotes: [],
  mode: 'full',
  suggestionMode: 'full',
  degradedMode: 'full',
  llmUsed: true,
  model: 'test-model',
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <CourseSelectionAiPage />
    </MemoryRouter>
  );

describe('CourseSelectionAiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recommendMutate.mockReset();
    explainMutate.mockReset();
    saveRecordMutate.mockReset();
    deleteRecordMutate.mockReset();
    vi.mocked(useAiAdvisor).mockReturnValue({
      recommend: {
        mutate: recommendMutate,
        isPending: false,
        data: null,
      },
      explain: {
        mutate: explainMutate,
        isPending: false,
        data: null,
      },
      savedRecords: {
        data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
        isFetching: false,
      },
      saveRecord: {
        mutate: saveRecordMutate,
        isPending: false,
      },
      deleteRecord: {
        mutate: deleteRecordMutate,
        isPending: false,
      },
    } as unknown as ReturnType<typeof useAiAdvisor>);
  });

  it('submits preference payload without student identity fields', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('目标学分'), { target: { value: '22' } });
    fireEvent.click(screen.getByLabelText('避免早课'));
    fireEvent.change(screen.getByLabelText('偏好说明'), {
      target: { value: '想稳妥一点，不要课太满。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送提问' }));

    await waitFor(() => {
      expect(recommendMutate).toHaveBeenCalledTimes(1);
    });

    const payload = recommendMutate.mock.calls[0][0];
    expect(payload).toMatchObject({
      maxRecommendations: 5,
      preferences: {
        targetCredits: 22,
        avoidEarlyMorning: true,
        preferRequiredCourses: true,
        preferGraduationProgress: true,
        riskTolerance: 'low',
        naturalLanguagePreference: '想稳妥一点，不要课太满。',
      },
    });
    expect(JSON.stringify(payload)).not.toContain('student_id');
    expect(JSON.stringify(payload)).not.toContain('studentId');
  });

  it('shows the AI safety boundary copy', () => {
    renderPage();

    expect(screen.getByText('仅展示解释与建议，不会写入选课记录。')).toBeInTheDocument();
  });

  it('shows newer recommendation requests above previous conversations', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('偏好说明'), {
      target: { value: '第一次偏好' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送提问' }));

    await waitFor(() => {
      expect(recommendMutate).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText('偏好说明'), {
      target: { value: '第二次偏好' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送提问' }));

    await waitFor(() => {
      expect(recommendMutate).toHaveBeenCalledTimes(2);
    });

    const pageText = document.body.textContent ?? '';

    expect(pageText.indexOf('补充偏好：第二次偏好')).toBeLessThan(
      pageText.indexOf('补充偏好：第一次偏好')
    );
  });

  it('shows explain conversations above existing recommendation conversations', async () => {
    recommendMutate.mockImplementation((_payload, options) => {
      options.onSuccess(advice);
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('偏好说明'), {
      target: { value: '先生成推荐' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送提问' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看解释' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '查看解释' }));

    await waitFor(() => {
      expect(explainMutate).toHaveBeenCalledTimes(1);
    });

    const pageText = document.body.textContent ?? '';

    expect(pageText.indexOf('我想确认“程序设计基础”是否适合本学期选。')).toBeLessThan(
      pageText.indexOf('补充偏好：先生成推荐')
    );
  });

  it('saves a generated recommendation snapshot', async () => {
    const longSummaryAdvice = {
      ...advice,
      recommendationSummary: '这是一段很长的推荐摘要'.repeat(30),
    };
    recommendMutate.mockImplementation((_payload, options) => {
      options.onSuccess(longSummaryAdvice);
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('偏好说明'), {
      target: { value: '保存这次推荐' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送提问' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(saveRecordMutate).toHaveBeenCalledTimes(1);
    });
    expect(saveRecordMutate.mock.calls[0][0]).toMatchObject({
      recordType: 'recommendation',
      title: 'AI 推荐建议',
      question: expect.stringContaining('保存这次推荐'),
      resultPayload: expect.objectContaining({
        recommendations: advice.recommendations,
        recommendationSummary: longSummaryAdvice.recommendationSummary,
      }),
    });
    expect(saveRecordMutate.mock.calls[0][0].title.length).toBeLessThanOrEqual(120);
  });

  it('renders saved records and can restore them into the conversation', async () => {
    vi.mocked(useAiAdvisor).mockReturnValue({
      recommend: { mutate: recommendMutate, isPending: false, data: null },
      explain: { mutate: explainMutate, isPending: false, data: null },
      savedRecords: {
        data: {
          items: [
            {
              id: 'saved-1',
              studentId: 'student-1',
              semesterId: null,
              courseOfferingId: null,
              recordType: 'recommendation',
              title: '已保存推荐',
              question: '这是保存的问题',
              requestPayload: null,
              resultPayload: advice as unknown as Record<string, unknown>,
              createdAt: '2026-06-23T00:00:00.000Z',
              updatedAt: '2026-06-23T00:00:00.000Z',
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
        isFetching: false,
      },
      saveRecord: { mutate: saveRecordMutate, isPending: false },
      deleteRecord: { mutate: deleteRecordMutate, isPending: false },
    } as unknown as ReturnType<typeof useAiAdvisor>);

    renderPage();

    expect(screen.getByText('已保存推荐')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看' }));

    await waitFor(() => {
      expect(screen.getByText('这是保存的问题')).toBeInTheDocument();
    });
    expect(screen.getByText(/程序设计基础/)).toBeInTheDocument();
  });

  it('deletes saved records through the AI advisor hook', () => {
    vi.mocked(useAiAdvisor).mockReturnValue({
      recommend: { mutate: recommendMutate, isPending: false, data: null },
      explain: { mutate: explainMutate, isPending: false, data: null },
      savedRecords: {
        data: {
          items: [
            {
              id: 'saved-1',
              studentId: 'student-1',
              semesterId: null,
              courseOfferingId: null,
              recordType: 'recommendation',
              title: '已保存推荐',
              question: null,
              requestPayload: null,
              resultPayload: advice as unknown as Record<string, unknown>,
              createdAt: '2026-06-23T00:00:00.000Z',
              updatedAt: '2026-06-23T00:00:00.000Z',
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
        isFetching: false,
      },
      saveRecord: { mutate: saveRecordMutate, isPending: false },
      deleteRecord: { mutate: deleteRecordMutate, isPending: false },
    } as unknown as ReturnType<typeof useAiAdvisor>);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(deleteRecordMutate).toHaveBeenCalledWith('saved-1', expect.any(Object));
  });
});
