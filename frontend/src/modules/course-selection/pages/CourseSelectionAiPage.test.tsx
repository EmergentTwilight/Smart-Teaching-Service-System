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
});
