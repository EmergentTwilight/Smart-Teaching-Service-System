import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { periodsApi } from '../api/periods';
import { useUpsertSelectionPeriod } from '../hooks/useSelectionPeriod';
import AdminManualEnrollmentPage from './AdminManualEnrollmentPage';

vi.mock('antd', async () => {
  const React = await import('react');
  let formValues: Record<string, string> = {};

  const block = (tag = 'div') => {
    const MockAntdBlock = ({
      children,
      title,
      ...props
    }: {
      children?: ReactNode;
      title?: ReactNode;
    }) => React.createElement(tag, props, title, children);

    MockAntdBlock.displayName = `MockAntdBlock(${tag})`;
    return MockAntdBlock;
  };

  const Form = Object.assign(
    ({
      children,
      form,
      onFinish,
    }: {
      children?: ReactNode;
      form?: { validateFields: () => Promise<Record<string, string>> };
      onFinish?: () => void;
    }) => {
      if (form) {
        form.validateFields = () => Promise.resolve(formValues);
      }

      return React.createElement(
        'form',
        {
          onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onFinish?.();
          },
        },
        children
      );
    },
    {
      useForm: () => [
        {
          validateFields: () => Promise.resolve(formValues),
          resetFields: () => {
            formValues = {};
          },
        },
      ],
      Item: ({
        children,
        label,
        name,
      }: {
        children?: React.ReactElement;
        label?: ReactNode;
        name?: string;
      }) => {
        if (!React.isValidElement(children) || !name) {
          return React.createElement('label', null, label, children);
        }

        const child = children as ReactElement<Record<string, unknown>>;
        const originalOnChange = child.props.onChange as ((value: unknown) => void) | undefined;
        return React.createElement(
          'label',
          null,
          label,
          React.cloneElement(child, {
            'aria-label': typeof label === 'string' ? label : undefined,
            value: formValues[name] ?? '',
            onChange: (valueOrEvent: unknown) => {
              if (
                valueOrEvent &&
                typeof valueOrEvent === 'object' &&
                'target' in valueOrEvent &&
                valueOrEvent.target &&
                typeof valueOrEvent.target === 'object' &&
                'value' in valueOrEvent.target
              ) {
                formValues[name] = String(valueOrEvent.target.value);
              } else {
                formValues[name] = String(valueOrEvent);
              }
              originalOnChange?.(valueOrEvent);
            },
          })
        );
      },
    }
  );

  const Input = Object.assign(
    ({ value, onChange, ...props }: { value?: string; onChange?: (event: unknown) => void }) =>
      React.createElement('input', { value, onChange, ...props }),
    {
      TextArea: ({ value, onChange, ...props }: { value?: string; onChange?: (event: unknown) => void }) =>
        React.createElement('textarea', { value, onChange, ...props }),
    }
  );

  return {
    Alert: ({ message }: { message?: ReactNode }) => React.createElement('div', { role: 'alert' }, message),
    Button: ({
      children,
      htmlType,
      onClick,
    }: {
      children?: ReactNode;
      htmlType?: string;
      onClick?: () => void;
    }) => React.createElement('button', { type: htmlType === 'submit' ? 'submit' : 'button', onClick }, children),
    Card: block(),
    Descriptions: Object.assign(
      ({ children }: { children?: ReactNode }) => React.createElement('dl', null, children),
      {
        Item: ({ label, children }: { label?: ReactNode; children?: ReactNode }) =>
          React.createElement('div', null, React.createElement('dt', null, label), React.createElement('dd', null, children)),
      }
    ),
    Form,
    Input,
    Select: ({
      options = [],
      placeholder,
      onSearch,
      onChange,
    }: {
      options?: Array<{ value: string; label: string }>;
      placeholder?: string;
      onSearch?: (value: string) => void;
      onChange?: (value: string) => void;
    }) =>
      React.createElement(
        'div',
        null,
        React.createElement('input', {
          role: 'combobox',
          'aria-label': placeholder,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => onSearch?.(event.target.value),
        }),
        options.map((option) =>
          React.createElement(
            'button',
            {
              key: option.value,
              type: 'button',
              onClick: () => onChange?.(option.value),
            },
            option.label
          )
        )
      ),
    Space: ({ children }: { children?: ReactNode }) => React.createElement('div', null, children),
    Tag: ({ children }: { children?: ReactNode }) => React.createElement('span', null, children),
    Typography: {
      Text: ({ children }: { children?: ReactNode }) => React.createElement('span', null, children),
      Title: ({ children }: { children?: ReactNode }) => React.createElement('h5', null, children),
    },
  };
});

vi.mock('../api/periods', () => ({
  periodsApi: {
    listManualEnrollmentStudents: vi.fn(),
    listManualEnrollmentCourseOfferings: vi.fn(),
  },
}));

const manualEnrollMutate = vi.fn();

vi.mock('../hooks/useSelectionPeriod', () => ({
  useUpsertSelectionPeriod: vi.fn(),
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminManualEnrollmentPage />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useUpsertSelectionPeriod).mockReturnValue({
    manualEnroll: {
      isPending: false,
      mutate: manualEnrollMutate,
    },
  } as unknown as ReturnType<typeof useUpsertSelectionPeriod>);
  vi.mocked(periodsApi.listManualEnrollmentStudents).mockResolvedValue({
    items: [
      {
        studentId: 'student-user-1',
        studentNumber: 'CMAN202601',
        username: 'cstudent01',
        realName: 'C Manual Student 01',
        majorName: 'Computer Science',
        grade: 2026,
        className: 'CS-1',
      },
    ],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });
  vi.mocked(periodsApi.listManualEnrollmentCourseOfferings).mockResolvedValue({
    items: [
      {
        courseOfferingId: 'offering-1',
        courseCode: 'CMAN-CS302',
        courseName: 'Operating Systems',
        credits: 4,
        semester: { id: 'semester-1', name: '2026 Spring' },
        teacher: { id: 'teacher-1', realName: 'Ada Teacher', teacherNumber: 'T001' },
        capacity: 40,
        enrolledCount: 0,
        remainingCapacity: 40,
        status: 'open',
        scheduleSummary: ['周2 第5-6节 第1-16周'],
      },
    ],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });
});

describe('AdminManualEnrollmentPage', () => {
  it('submits selected student and offering ids from lookup options', async () => {
    renderPage();

    const studentSearch = screen.getByLabelText('输入学生姓名、学号或用户名搜索');
    const offeringSearch = screen.getByLabelText('输入课程名称、课程代码或教师姓名搜索');
    fireEvent.change(studentSearch, { target: { value: 'cstudent01' } });
    fireEvent.change(offeringSearch, { target: { value: 'Operating Systems' } });

    await waitFor(() => {
      expect(periodsApi.listManualEnrollmentStudents).toHaveBeenCalledWith({
        keyword: 'cstudent01',
        pageSize: 10,
      });
      expect(periodsApi.listManualEnrollmentCourseOfferings).toHaveBeenCalledWith({
        keyword: 'Operating Systems',
        pageSize: 10,
      });
    });

    fireEvent.click(await screen.findByText('CMAN202601 · C Manual Student 01（cstudent01）'));
    fireEvent.click(await screen.findByText('CMAN-CS302 Operating Systems · 2026 Spring · 剩余 40'));
    expect(screen.getByText('已选择学生')).toBeInTheDocument();
    expect(screen.getByText('已选择课程')).toBeInTheDocument();
    expect(screen.getByText('Computer Science / 2026级 / CS-1')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('加课原因'), {
      target: { value: '人工验收补加课程' },
    });
    fireEvent.click(screen.getByText('提交手动加课'));

    await waitFor(() => {
      expect(manualEnrollMutate).toHaveBeenCalledWith(
        {
          studentId: 'student-user-1',
          courseOfferingId: 'offering-1',
          reason: '人工验收补加课程',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });
});
