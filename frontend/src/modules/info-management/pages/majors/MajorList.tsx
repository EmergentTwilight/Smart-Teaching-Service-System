/**
 * 专业管理页面
 * 显示专业列表，支持新增、编辑、删除、搜索、筛选、分页等功能
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Input, message, Modal, Pagination, Row, Select, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '../../api/departments';
import { majorsApi } from '../../api/majors';
import MajorDetail from '../../components/MajorDetail';
import MajorModal from '../../components/MajorModal';
import MajorTable from '../../components/MajorTable';
import type { CreateMajorDTO, Major, MajorDetail as MajorDetailData, MajorQueryParams, UpdateMajorDTO } from '../../types/majors';
import type { Department } from '../../types/departments';
import { useAuthStore } from '@/shared/stores/authStore';

const { Search } = Input;

const MajorList: React.FC = () => {
  const queryClient = useQueryClient();
  const loggedInUser = useAuthStore((state) => state.user);

  const [params, setParams] = useState<MajorQueryParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
    departmentId: undefined,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [currentMajor, setCurrentMajor] = useState<Major | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<MajorDetailData | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [majorToDelete, setMajorToDelete] = useState<Major | null>(null);

  const roles = loggedInUser?.roles || [];
  const canCreate = roles.includes('super_admin');
  const canEdit = roles.includes('admin') || roles.includes('super_admin');
  const canDelete = roles.includes('super_admin');

  const {
    data: departmentData,
    isError: departmentLoadFailed,
    isLoading: departmentLoading,
  } = useQuery({
    queryKey: ['departments', 'major-options'],
    queryFn: () => departmentsApi.getList({ pageSize: 100 }),
  });

  const departments = useMemo(() => departmentData?.items || [], [departmentData?.items]);

  const { data, isLoading } = useQuery({
    queryKey: ['majors', params],
    queryFn: () => majorsApi.getList(params),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateMajorDTO) => majorsApi.create(values),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['majors'] });
    },
    onError: (error: Error) => {
      message.error(error.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateMajorDTO }) => majorsApi.update(id, values),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['majors'] });
      setCurrentMajor(null);
    },
    onError: (error: Error) => {
      message.error(error.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => majorsApi.delete(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['majors'] });
      setMajorToDelete(null);
    },
    onError: (error: Error) => {
      message.error(error.message || '删除失败');
    },
  });

  const handleSearch = useCallback((value: string) => {
    setParams((prev) => ({ ...prev, keyword: value, page: 1 }));
  }, []);

  const handleDepartmentChange = useCallback((departmentId?: string) => {
    setParams((prev) => ({ ...prev, departmentId, page: 1 }));
  }, []);

  const handleReset = useCallback(() => {
    setParams({
      page: 1,
      pageSize: 10,
      keyword: '',
      departmentId: undefined,
    });
  }, []);

  const handleCreate = useCallback(() => {
    if (!canCreate) {
      message.warning('权限不足：您没有创建专业的权限');
      return;
    }
    setCurrentMajor(null);
    setFormOpen(true);
  }, [canCreate]);

  const handleEdit = useCallback((major: Major) => {
    if (!canEdit) {
      message.warning('权限不足：您没有编辑专业的权限');
      return;
    }
    setCurrentMajor(major);
    setFormOpen(true);
  }, [canEdit]);

  const handleView = useCallback(async (major: Major) => {
    try {
      const detail = await majorsApi.getById(major.id);
      setDetailData(detail);
      setDetailOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  }, []);

  const handleDelete = useCallback((major: Major) => {
    if (!canDelete) {
      message.warning('权限不足：您没有删除专业的权限');
      return;
    }
    setMajorToDelete(major);
    setDeleteModalOpen(true);
  }, [canDelete]);

  const handleSubmit = async (values: CreateMajorDTO) => {
    console.log('[MajorList] handleSubmit values', values, 'currentMajor', currentMajor);
    if (currentMajor) {
      const updateValues: UpdateMajorDTO = {
        name: values.name,
        degreeType: values.degreeType,
        totalCredits: values.totalCredits,
      };
      console.log('[MajorList] update major payload', updateValues);
      await updateMutation.mutateAsync({
        id: currentMajor.id,
        values: updateValues,
      });
      return;
    }

    await createMutation.mutateAsync(values);
  };

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setParams((prev) => ({ ...prev, page, pageSize }));
  }, []);

  const departmentOptions = useMemo(
    () => departments.map((department: Department) => ({ label: department.name, value: department.id })),
    [departments]
  );

  const majors = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div>
      <Card>
        {majors.length === 0 && !isLoading && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="暂无专业数据"
          />
        )}
        {departmentLoadFailed && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="院系列表加载失败，暂时无法新增专业"
          />
        )}
        {!departmentLoading && !departmentLoadFailed && departments.length === 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="暂无可选院系，请先在部门管理中创建院系后再新增专业"
          />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索专业名称或代码"
                allowClear
                onSearch={handleSearch}
                style={{ width: 280 }}
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
                onChange={handleDepartmentChange}
                notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无院系" />}
                style={{ width: 220 }}
              />
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
          <Col>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新增专业
              </Button>
            )}
          </Col>
        </Row>

        <MajorTable
          data={majors}
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

      <MajorModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          setCurrentMajor(null);
        }}
        onSubmit={handleSubmit}
        initialData={currentMajor || undefined}
        departments={departments}
      />

      <MajorDetail
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
          if (majorToDelete) {
            deleteMutation.mutate(majorToDelete.id);
            setDeleteModalOpen(false);
          }
        }}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
      >
        <p>确定要删除专业 <strong>{majorToDelete?.name}</strong> 吗？此操作不可恢复。</p>
        {majorToDelete && majorToDelete.studentCount > 0 && (
          <p style={{ color: '#f59e0b', marginTop: 8 }}>
            该专业下还有 {majorToDelete.studentCount} 名学生，删除前请先转移或删除相关学生。
          </p>
        )}
      </Modal>
    </div>
  );
};

export default MajorList;
