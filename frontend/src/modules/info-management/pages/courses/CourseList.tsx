/**
 * 课程管理页面
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Input, message, Modal, Pagination, Row, Select, Space } from 'antd';
import { ImportOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '../../api/departments';
import { coursesApi } from '../../api/courses';
import CourseBatchModal from '../../components/CourseBatchModal';
import CourseDetail from '../../components/CourseDetail';
import CourseModal from '../../components/CourseModal';
import CourseTable from '../../components/CourseTable';
import type {
  BatchCreateCourseResult,
  Course,
  CourseDetail as CourseDetailData,
  CourseQueryParams,
  CourseStatus,
  CourseType,
  CreateCourseDTO,
  UpdateCourseDTO,
} from '../../types/courses';
import { COURSE_STATUS_LABELS, COURSE_TYPE_LABELS } from '../../types/courses';
import type { Department } from '../../types/departments';
import { useAuthStore } from '@/shared/stores/authStore';

const { Search } = Input;

const CourseList: React.FC = () => {
  const queryClient = useQueryClient();
  const loggedInUser = useAuthStore((state) => state.user);

  const [params, setParams] = useState<CourseQueryParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<CourseDetailData | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const roles = loggedInUser?.roles || [];
  const canCreate = roles.includes('admin') || roles.includes('super_admin');
  const canEdit = canCreate;
  const canDelete = roles.includes('super_admin');

  const {
    data: departmentData,
    isError: departmentLoadFailed,
    isLoading: departmentLoading,
  } = useQuery({
    queryKey: ['departments', 'course-options'],
    queryFn: () => departmentsApi.getList({ pageSize: 100 }),
  });

  const departments = useMemo(() => departmentData?.items || [], [departmentData?.items]);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', params],
    queryFn: () => coursesApi.getList(params),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateCourseDTO) => coursesApi.create(values),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: Error) => {
      message.error(error.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateCourseDTO }) => coursesApi.update(id, values),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setCurrentCourse(null);
    },
    onError: (error: Error) => {
      message.error(error.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setCourseToDelete(null);
    },
    onError: (error: Error) => {
      window.alert(error.message || '删除失败，请检查课程是否已被其他模块引用。');
    },
  });

  const batchMutation = useMutation({
    mutationFn: (courses: CreateCourseDTO[]) => coursesApi.batchCreate(courses),
    onSuccess: (result) => {
      message.success(`批量创建完成：成功 ${result.successCount}，失败 ${result.failCount}`);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: Error) => {
      message.error(error.message || '批量创建失败');
    },
  });

  const handleSearch = useCallback((value: string) => {
    setParams((prev) => ({ ...prev, keyword: value, page: 1 }));
  }, []);

  const handleReset = useCallback(() => {
    setParams({ page: 1, pageSize: 10, keyword: '' });
  }, []);

  const handleView = useCallback(async (course: Course) => {
    try {
      const detail = await coursesApi.getById(course.id);
      setDetailData(detail);
      setDetailOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  }, []);

  const handleCreate = useCallback(() => {
    if (!canCreate) {
      message.warning('权限不足：您没有创建课程的权限');
      return;
    }
    setCurrentCourse(null);
    setFormOpen(true);
  }, [canCreate]);

  const handleEdit = useCallback((course: Course) => {
    if (!canEdit) {
      message.warning('权限不足：您没有编辑课程的权限');
      return;
    }
    setCurrentCourse(course);
    setFormOpen(true);
  }, [canEdit]);

  const handleDelete = useCallback((course: Course) => {
    if (!canDelete) {
      message.warning('权限不足：您没有删除课程的权限');
      return;
    }
    setCourseToDelete(course);
    setDeleteModalOpen(true);
  }, [canDelete]);

  const handleSubmit = async (values: CreateCourseDTO) => {
    if (currentCourse) {
      await updateMutation.mutateAsync({
        id: currentCourse.id,
        values: {
          name: values.name,
          credits: values.credits,
          description: values.description,
          prerequisiteIds: values.prerequisiteIds,
        },
      });
      return;
    }

    await createMutation.mutateAsync(values);
  };

  const handleBatchSubmit = async (courses: CreateCourseDTO[]): Promise<BatchCreateCourseResult[]> => {
    const result = await batchMutation.mutateAsync(courses);
    return result.results;
  };

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setParams((prev) => ({ ...prev, page, pageSize }));
  }, []);

  const departmentOptions = useMemo(
    () => departments.map((department: Department) => ({ label: department.name, value: department.id })),
    [departments]
  );
  const courseTypeOptions = Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => ({
    label,
    value: value as CourseType,
  }));
  const statusOptions = Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => ({
    label,
    value: value as CourseStatus,
  }));

  const courses = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div>
      <Card>
        {courses.length === 0 && !isLoading && (
          <Alert type="info" showIcon style={{ marginBottom: 16 }} message="暂无课程数据" />
        )}
        {departmentLoadFailed && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message="院系列表加载失败，院系筛选暂不可用" />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索课程名称或代码"
                allowClear
                onSearch={handleSearch}
                style={{ width: 260 }}
                defaultValue={params.keyword}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="筛选院系"
                value={params.departmentId}
                options={departmentOptions}
                loading={departmentLoading}
                onChange={(departmentId?: string) => setParams((prev) => ({ ...prev, departmentId, page: 1 }))}
                notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无院系" />}
                style={{ width: 200 }}
              />
              <Select
                allowClear
                placeholder="课程类型"
                value={params.courseType}
                options={courseTypeOptions}
                onChange={(courseType?: CourseType) => setParams((prev) => ({ ...prev, courseType, page: 1 }))}
                style={{ width: 140 }}
              />
              <Select
                allowClear
                placeholder="状态"
                value={params.status}
                options={statusOptions}
                onChange={(status?: CourseStatus) => setParams((prev) => ({ ...prev, status, page: 1 }))}
                style={{ width: 120 }}
              />
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              {canCreate && (
                <Button icon={<ImportOutlined />} onClick={() => setBatchOpen(true)}>
                  批量创建
                </Button>
              )}
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  新增课程
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <CourseTable
          data={courses}
          loading={isLoading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            total={pagination?.total || 0}
            pageSize={params.pageSize}
            current={params.page}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条`}
            pageSizeOptions={['10', '20', '50', '100']}
            onChange={handlePageChange}
          />
        </div>
      </Card>

      <CourseModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          setCurrentCourse(null);
        }}
        onSubmit={handleSubmit}
        initialData={currentCourse || undefined}
        departments={departments}
        courses={courses}
      />

      <CourseBatchModal visible={batchOpen} onClose={() => setBatchOpen(false)} onSubmit={handleBatchSubmit} />

      <CourseDetail
        visible={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailData(null);
        }}
        data={detailData}
      />

      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onOk={() => {
          if (courseToDelete) {
            deleteMutation.mutate(courseToDelete.id);
            setDeleteModalOpen(false);
          }
        }}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
      >
        <p>
          确定要删除课程 <strong>{courseToDelete?.name}</strong> 吗？此操作不可恢复。
        </p>
      </Modal>
    </div>
  );
};

export default CourseList;
