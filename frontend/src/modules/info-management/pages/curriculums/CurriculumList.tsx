/**
 * 培养方案管理页面
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, InputNumber, message, Modal, Pagination, Row, Select, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { curriculumsApi } from '../../api/curriculums';
import { majorsApi } from '../../api/majors';
import { coursesApi } from '../../api/courses';
import CurriculumBatchCourseModal from '../../components/CurriculumBatchCourseModal';
import CurriculumCourseModal from '../../components/CurriculumCourseModal';
import CurriculumDetail from '../../components/CurriculumDetail';
import CurriculumModal from '../../components/CurriculumModal';
import CurriculumTable from '../../components/CurriculumTable';
import type {
  AddCurriculumCourseDTO,
  CreateCurriculumDTO,
  Curriculum,
  CurriculumCourse,
  CurriculumDetail as CurriculumDetailData,
  CurriculumQueryParams,
  UpdateCurriculumDTO,
} from '../../types/curriculums';
import { useAuthStore } from '@/shared/stores/authStore';

const CurriculumList: React.FC = () => {
  const queryClient = useQueryClient();
  const loggedInUser = useAuthStore((state) => state.user);
  const [params, setParams] = useState<CurriculumQueryParams>({ page: 1, pageSize: 10 });
  const [formOpen, setFormOpen] = useState(false);
  const [currentCurriculum, setCurrentCurriculum] = useState<Curriculum | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<CurriculumDetailData | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [batchCourseModalOpen, setBatchCourseModalOpen] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<CurriculumCourse | undefined>();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [curriculumToDelete, setCurriculumToDelete] = useState<Curriculum | null>(null);

  const roles = loggedInUser?.roles || [];
  const canCreate = roles.includes('admin') || roles.includes('super_admin');
  const canEdit = canCreate;
  const canDelete = roles.includes('super_admin');

  const { data, isLoading } = useQuery({
    queryKey: ['curriculums', params],
    queryFn: () => curriculumsApi.getList(params),
  });
  const { data: majorData, isLoading: majorLoading } = useQuery({
    queryKey: ['majors', 'curriculum-options'],
    queryFn: () => majorsApi.getList({ pageSize: 100 }),
  });
  const { data: courseData } = useQuery({
    queryKey: ['courses', 'curriculum-options'],
    queryFn: () => coursesApi.getList({ pageSize: 100, status: 'ACTIVE' }),
  });

  const majors = useMemo(() => majorData?.items || [], [majorData?.items]);
  const courses = useMemo(() => courseData?.items || [], [courseData?.items]);
  const curriculums = data?.items || [];
  const pagination = data?.pagination;

  const createMutation = useMutation({
    mutationFn: (values: CreateCurriculumDTO) => curriculumsApi.create(values),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['curriculums'] });
    },
    onError: (error: Error) => message.error(error.message || '创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateCurriculumDTO }) => curriculumsApi.update(id, values),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['curriculums'] });
      setCurrentCurriculum(null);
    },
    onError: (error: Error) => message.error(error.message || '更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => curriculumsApi.delete(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['curriculums'] });
      setCurriculumToDelete(null);
    },
    onError: (error: Error) => message.error(error.message || '删除失败'),
  });

  const loadDetail = useCallback(async (id: string) => {
    const detail = await curriculumsApi.getById(id);
    setDetailData(detail);
    return detail;
  }, []);

  const handleView = useCallback(async (curriculum: Curriculum) => {
    try {
      await loadDetail(curriculum.id);
      setDetailOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  }, [loadDetail]);

  const handleSubmit = async (values: CreateCurriculumDTO) => {
    if (currentCurriculum) {
      await updateMutation.mutateAsync({
        id: currentCurriculum.id,
        values: {
          name: values.name,
          totalCredits: values.totalCredits,
          requiredCredits: values.requiredCredits,
          electiveCredits: values.electiveCredits,
        },
      });
      return;
    }
    await createMutation.mutateAsync(values);
  };

  const handleCourseSubmit = async (values: AddCurriculumCourseDTO) => {
    if (!detailData) return;
    try {
      if (currentCourse) {
        await curriculumsApi.updateCourse(detailData.id, currentCourse.courseId, {
          courseType: values.courseType,
          semesterSuggestion: values.semesterSuggestion,
        });
        message.success('课程信息已更新');
      } else {
        await curriculumsApi.addCourse(detailData.id, values);
        message.success('课程已添加');
      }
      await loadDetail(detailData.id);
      queryClient.invalidateQueries({ queryKey: ['curriculums'] });
      setCurrentCourse(undefined);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '培养方案课程信息保存失败');
    }
  };

  const handleBatchCourseSubmit = async (values: AddCurriculumCourseDTO[]) => {
    if (!detailData) return;
    const result = await curriculumsApi.batchAddCourses(detailData.id, values);
    message.success(`批量添加完成：成功 ${result.successCount}，失败 ${result.failCount}`);
    await loadDetail(detailData.id);
    queryClient.invalidateQueries({ queryKey: ['curriculums'] });
  };

  const handleRemoveCourse = async (course: CurriculumCourse) => {
    if (!detailData) return;
    await curriculumsApi.removeCourse(detailData.id, course.courseId);
    message.success('课程已移除');
    await loadDetail(detailData.id);
    queryClient.invalidateQueries({ queryKey: ['curriculums'] });
  };

  const majorOptions = majors.map((major) => ({ label: major.name, value: major.id }));

  return (
    <div>
      <Card>
        {curriculums.length === 0 && !isLoading && (
          <Alert type="info" showIcon style={{ marginBottom: 16 }} message="暂无培养方案数据" />
        )}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space size="middle" wrap>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="筛选专业"
                value={params.majorId}
                options={majorOptions}
                loading={majorLoading}
                onChange={(majorId?: string) => setParams((prev) => ({ ...prev, majorId, page: 1 }))}
                notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无专业" />}
                style={{ width: 220 }}
              />
              <InputNumber
                placeholder="年份"
                min={2000}
                max={2100}
                value={params.year}
                onChange={(year) => setParams((prev) => ({ ...prev, year: year || undefined, page: 1 }))}
                style={{ width: 120 }}
              />
              <Button icon={<ReloadOutlined />} onClick={() => setParams({ page: 1, pageSize: 10 })}>重置</Button>
            </Space>
          </Col>
          <Col>
            {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCurrentCurriculum(null); setFormOpen(true); }}>新增培养方案</Button>}
          </Col>
        </Row>

        <CurriculumTable
          data={curriculums}
          loading={isLoading}
          onView={handleView}
          onEdit={(record) => { setCurrentCurriculum(record); setFormOpen(true); }}
          onDelete={(record) => { setCurriculumToDelete(record); setDeleteModalOpen(true); }}
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
            onChange={(page, pageSize) => setParams((prev) => ({ ...prev, page, pageSize }))}
          />
        </div>
      </Card>

      <CurriculumModal
        visible={formOpen}
        onClose={() => { setFormOpen(false); setCurrentCurriculum(null); }}
        onSubmit={handleSubmit}
        initialData={currentCurriculum || undefined}
        majors={majors}
      />

      <CurriculumDetail
        visible={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailData(null); }}
        data={detailData}
        canEdit={canEdit}
        onAddCourse={() => { setCurrentCourse(undefined); setCourseModalOpen(true); }}
        onBatchAddCourse={() => setBatchCourseModalOpen(true)}
        onEditCourse={(course) => {
          setCurrentCourse(course);
          setCourseModalOpen(true);
        }}
        onRemoveCourse={handleRemoveCourse}
      />

      <CurriculumCourseModal
        visible={courseModalOpen}
        onClose={() => { setCourseModalOpen(false); setCurrentCourse(undefined); }}
        onSubmit={handleCourseSubmit}
        courses={courses}
        initialData={currentCourse}
      />

      <CurriculumBatchCourseModal
        visible={batchCourseModalOpen}
        onClose={() => setBatchCourseModalOpen(false)}
        onSubmit={handleBatchCourseSubmit}
        courses={courses}
      />

      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onOk={() => {
          if (curriculumToDelete) {
            deleteMutation.mutate(curriculumToDelete.id);
            setDeleteModalOpen(false);
          }
        }}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
      >
        <p>确定要删除培养方案 <strong>{curriculumToDelete?.name}</strong> 吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
};

export default CurriculumList;
