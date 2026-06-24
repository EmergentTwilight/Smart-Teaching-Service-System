import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiAdvisorPanel, type AiAdvisorTurn } from './AiAdvisorPanel';
import type { AiAdvicePayload } from '../types/ai';

const advice: AiAdvicePayload = {
  disclaimer: 'AI 建议仅供参考，最终是否选课以提交选课时的服务端校验结果为准。',
  creditProgressSummary: {
    currentSelectedCredits: 6,
    targetCredits: 160,
    maxCredits: 28,
    remainingToTarget: 154,
  },
  recommendations: [
    {
      courseOfferingId: 'offering-1',
      courseCode: 'CS101',
      courseName: '程序设计基础',
      credits: 4,
      teacherName: '王老师',
      recommendationScore: 0.9,
      reasons: ['属于当前培养方案范围', '与已选课程无时间冲突'],
      risks: ['课程剩余名额较少'],
      eligibilitySnapshot: {
        isAvailable: true,
        remainingCapacity: 2,
        hasTimeConflict: false,
        prerequisiteSatisfied: true,
      },
      scoreBreakdown: {
        curriculumMatch: 0.3,
        creditGapFit: 0.2,
        scheduleFit: 0.15,
        preferenceFit: 0.15,
        capacityFit: 0.05,
        riskInverse: 0.07,
      },
    },
    {
      courseOfferingId: 'offering-3',
      courseCode: 'CS202',
      courseName: '数据结构',
      credits: 4,
      teacherName: '李老师',
      recommendationScore: 0.82,
      reasons: ['满足培养方案要求'],
      risks: ['课程作业负担较高', '期末项目需要组队完成'],
      eligibilitySnapshot: {
        isAvailable: true,
        remainingCapacity: 5,
        hasTimeConflict: false,
        prerequisiteSatisfied: true,
      },
    },
  ],
  conflictNotes: [
    {
      courseOfferingId: 'offering-2',
      courseName: '编译原理',
      message: '该课程和已选课程时间冲突',
    },
    {
      courseOfferingId: 'offering-4',
      courseName: '操作系统',
      message: '该课程先修条件暂未完全满足',
    },
  ],
  plans: [
    {
      id: 'balanced',
      title: '稳妥稳选',
      rationale: '优先满足培养方案。',
      recommendations: [],
      projectedCredits: 0,
      riskLevel: 'low',
    },
  ],
  recommendationSummary: '根据你的培养方案生成建议。',
  mode: 'rule_only',
  suggestionMode: 'rule_only',
  degradedMode: 'rule_only',
  llmUsed: false,
  model: null,
  fallbackInfo: {
    code: 'policy_validation_failed',
    reason: 'LLM 生成失败，返回模板方案',
    source: 'llm',
    retriable: true,
  },
  progressAudit: {
    currentSelectedCredits: 6,
    targetCredits: 160,
    maxCredits: 28,
    requiredGap: 94,
    electiveGap: 40,
    generalGap: 0,
    priorityGaps: [
      {
        courseType: 'required',
        gapCredits: 94,
        urgency: 'high',
        reason: '必修课缺口会直接影响培养方案进度。',
      },
    ],
  },
  scheduleLoad: {
    earlyMorningCount: 1,
    denseDays: ['周一'],
    loadScore: 0.4,
    loadLevel: 'medium',
    notes: ['当前已选课程中有 1 个早课时段。'],
  },
  capacityRisks: [
    {
      courseOfferingId: 'offering-1',
      courseName: '程序设计基础',
      remainingCapacity: 2,
      fillRate: 0.95,
      riskLevel: 'high',
      riskReason: '剩余名额较少，可能很快满员',
    },
    {
      courseOfferingId: 'offering-3',
      courseName: '数据结构',
      remainingCapacity: 5,
      fillRate: 0.85,
      riskLevel: 'medium',
      riskReason: '容量消耗较快',
    },
  ],
};

describe('AiAdvisorPanel', () => {
  it('groups a user question and AI answer in one conversation container', () => {
    const turns: AiAdvisorTurn[] = [
      { id: 'question-1', type: 'question', content: '我想要稳妥一点的课程推荐。' },
      { id: 'answer-1', type: 'recommend', advice },
    ];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    const conversation = screen.getByRole('article', { name: 'AI 问答会话' });

    expect(within(conversation).getByText('你')).toBeInTheDocument();
    expect(within(conversation).getByText('我想要稳妥一点的课程推荐。')).toBeInTheDocument();
    expect(within(conversation).getByText('AI 助理')).toBeInTheDocument();
    expect(within(conversation).getByText('推荐建议')).toBeInTheDocument();
  });

  it('keeps multiple conversation groups in the provided order', () => {
    const turns: AiAdvisorTurn[] = [
      { id: 'question-2', type: 'question', content: '第二次问题' },
      {
        id: 'answer-2',
        type: 'notice',
        status: 'info',
        content: '第二次回答',
      },
      { id: 'question-1', type: 'question', content: '第一次问题' },
      {
        id: 'answer-1',
        type: 'notice',
        status: 'info',
        content: '第一次回答',
      },
    ];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    const conversations = screen.getAllByRole('article', { name: 'AI 问答会话' });

    expect(within(conversations[0]).getByText('第二次问题')).toBeInTheDocument();
    expect(within(conversations[0]).getByText('第二次回答')).toBeInTheDocument();
    expect(within(conversations[1]).getByText('第一次问题')).toBeInTheDocument();
    expect(within(conversations[1]).getByText('第一次回答')).toBeInTheDocument();
  });

  it('renders user-friendly fallback, scores, reasons and risks', () => {
    const turns: AiAdvisorTurn[] = [{ id: 'turn-1', type: 'recommend', advice }];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    expect(screen.getByText(advice.disclaimer)).toBeInTheDocument();
    expect(screen.getByText('已切换为规则推荐')).toBeInTheDocument();
    expect(screen.getByText(/智能生成结果没有通过系统校验/)).toBeInTheDocument();
    expect(screen.getByText(/可以稍后重试/)).toBeInTheDocument();
    expect(screen.queryByText(/policy_validation_failed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/LLM 生成失败/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/推荐分数 0.90/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/评分构成：培养方案 0.30/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/属于当前培养方案范围/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/课程剩余名额较少/).length).toBeGreaterThan(0);
    expect(screen.getByText(/必修缺口 94/)).toBeInTheDocument();
    expect(screen.getByText('风险与限制')).toBeInTheDocument();
    expect(screen.getByText(/编译原理：该课程和已选课程时间冲突/)).toBeInTheDocument();
    expect(screen.getByText(/程序设计基础：剩余 2 人，剩余名额较少/)).toBeInTheDocument();
  });

  it('explains provider rate limiting without exposing raw fallback codes', () => {
    const rateLimitedAdvice: AiAdvicePayload = {
      ...advice,
      fallbackInfo: {
        code: 'policy_validation_failed',
        reason: 'provider_error:429',
        source: 'llm',
        retriable: true,
        stage: 'recommendation',
        diagnostics: {
          provider: 'openrouter',
          model: 'openrouter/free',
          endpointHost: 'openrouter.ai',
          statusCode: 429,
          retryAfter: '60',
          durationMs: 1200,
          retriable: true,
        },
      },
    };
    const turns: AiAdvisorTurn[] = [{ id: 'turn-rate-limited', type: 'recommend', advice: rateLimitedAdvice }];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    expect(screen.getByText('已切换为规则推荐')).toBeInTheDocument();
    expect(screen.getByText(/免费模型限流或额度限制/)).toBeInTheDocument();
    expect(screen.getByText(/稍后重试/)).toBeInTheDocument();
    expect(screen.queryByText(/provider_error:429/)).not.toBeInTheDocument();
    expect(screen.queryByText(/policy_validation_failed/)).not.toBeInTheDocument();
  });

  it('explains non-retriable configuration failures as maintainer action', () => {
    const missingKeyAdvice: AiAdvicePayload = {
      ...advice,
      fallbackInfo: {
        code: 'policy_validation_failed',
        reason: 'missing_api_key',
        source: 'llm',
        retriable: false,
        stage: 'recommendation',
        diagnostics: {
          provider: 'openrouter',
          model: 'openrouter/free',
          endpointHost: 'openrouter.ai',
          durationMs: 0,
          retriable: false,
        },
      },
    };
    const turns: AiAdvisorTurn[] = [{ id: 'turn-missing-key', type: 'recommend', advice: missingKeyAdvice }];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    expect(screen.getByText('已切换为规则推荐')).toBeInTheDocument();
    expect(screen.getByText(/尚未配置可用 API Key/)).toBeInTheDocument();
    expect(screen.getByText(/需要维护人员检查配置或模型权限/)).toBeInTheDocument();
    expect(screen.queryByText(/短时间重试通常不会改变结果/)).not.toBeInTheDocument();
    expect(screen.queryByText(/missing_api_key/)).not.toBeInTheDocument();
  });

  it('renders risk details in a fixed-height scrollable region', () => {
    const turns: AiAdvisorTurn[] = [{ id: 'turn-1', type: 'recommend', advice }];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    const riskDetails = screen.getByRole('region', { name: '风险与限制明细' });

    expect(riskDetails.style.maxHeight).toBe('320px');
    expect(riskDetails.style.overflowY).toBe('auto');
    expect(riskDetails.style.paddingRight).toBe('4px');
    expect(screen.getByText(/操作系统：该课程先修条件暂未完全满足/)).toBeInTheDocument();
    expect(screen.getByText(/数据结构：课程作业负担较高/)).toBeInTheDocument();
  });

  it('hides and restores the risk sidebar without hiding recommendations', () => {
    const turns: AiAdvisorTurn[] = [{ id: 'turn-1', type: 'recommend', advice }];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /隐藏/ }));

    expect(screen.queryByText('风险与限制')).not.toBeInTheDocument();
    expect(screen.queryByText(/编译原理：该课程和已选课程时间冲突/)).not.toBeInTheDocument();
    expect(screen.getByText(/CS101/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /显示风险与限制/ }));

    expect(screen.getByText('风险与限制')).toBeInTheDocument();
    expect(screen.getByText(/编译原理：该课程和已选课程时间冲突/)).toBeInTheDocument();
  });

  it('explains non-retriable rule fallback without suggesting repeated retries', () => {
    const ruleOnlyAdvice: AiAdvicePayload = {
      ...advice,
      recommendations: [],
      fallbackInfo: {
        code: 'policy_validation_failed',
        reason: '当前无满足硬性规则课程',
        source: 'rule',
        retriable: false,
      },
    };
    const turns: AiAdvisorTurn[] = [{ id: 'turn-rule', type: 'recommend', advice: ruleOnlyAdvice }];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} />);

    expect(screen.getByText('已按规则生成建议')).toBeInTheDocument();
    expect(screen.getByText(/短时间重试通常不会改变结果/)).toBeInTheDocument();
    expect(screen.getByText('当前没有可推荐课程。')).toBeInTheDocument();
  });

  it('calls explain and go-to-selection handlers without enrollment actions', () => {
    const onExplain = vi.fn();
    const onGoToSelection = vi.fn();

    const turns: AiAdvisorTurn[] = [{ id: 'turn-2', type: 'recommend', advice }];

    render(
      <AiAdvisorPanel
        turns={turns}
        onExplain={onExplain}
        onGoToSelection={onGoToSelection}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: '查看解释' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '前往选课' })[0]);

    expect(onExplain).toHaveBeenCalledWith('offering-1', '程序设计基础');
    expect(onGoToSelection).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /一键选课|AI 自动选课/ })).not.toBeInTheDocument();
  });

  it('calls save handler for recommendation conversations', () => {
    const onSaveTurn = vi.fn();
    const turns: AiAdvisorTurn[] = [
      { id: 'question-1', type: 'question', content: '想保存这次建议' },
      { id: 'turn-1', type: 'recommend', advice },
    ];

    render(<AiAdvisorPanel turns={turns} onExplain={vi.fn()} onSaveTurn={onSaveTurn} />);

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(onSaveTurn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'turn-1', type: 'recommend' }),
      '想保存这次建议'
    );
  });

  it('renders saved advice read-only without save or navigation actions', () => {
    const turns: AiAdvisorTurn[] = [
      { id: 'question-1', type: 'question', content: '这是保存的问题' },
      { id: 'turn-1', type: 'recommend', advice },
    ];

    render(
      <AiAdvisorPanel
        turns={turns}
        onExplain={vi.fn()}
        onGoToSelection={vi.fn()}
        onSaveTurn={vi.fn()}
        readOnly
      />
    );

    expect(screen.getByText('这是保存的问题')).toBeInTheDocument();
    expect(screen.getByText(/CS101/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看解释' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '前往选课' })).not.toBeInTheDocument();
  });

  it('renders empty state without advice', () => {
    render(<AiAdvisorPanel turns={[]} onExplain={vi.fn()} />);

    expect(screen.getByText('暂无建议，可继续使用基础课程搜索与选课流程。')).toBeInTheDocument();
  });
});
