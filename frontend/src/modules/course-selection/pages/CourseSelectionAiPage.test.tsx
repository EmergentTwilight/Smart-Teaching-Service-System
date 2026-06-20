import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiAdvisor } from '../hooks/useAiAdvisor';
import CourseSelectionAiPage from './CourseSelectionAiPage';

vi.mock('../hooks/useAiAdvisor', () => ({
  useAiAdvisor: vi.fn(),
}));

const recommendMutate = vi.fn();
const explainMutate = vi.fn();

const renderPage = () =>
  render(
    <MemoryRouter>
      <CourseSelectionAiPage />
    </MemoryRouter>
  );

describe('CourseSelectionAiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    fireEvent.click(screen.getByRole('button', { name: '生成建议' }));

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
});
