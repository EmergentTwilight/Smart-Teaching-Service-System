/**
 * 专业管理页面
 * 显示专业列表，支持新增、编辑、删除、搜索、分页等功能
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Button,
  Space,
  message,
  Input,
  Card,
  Row,
  Col,
  Modal,
  Pagination,
  Select,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMajorList, createMajor, updateMajor, deleteMajor } from '../../api/majors';
import { departmentsApi } from '../../api/departments';
import { MajorTable } from '../../components/MajorTable';
import { MajorModal } from '../../components/MajorModal';
import { MajorDetail } from '../../components/MajorDetail';
import { Major, DegreeType, CreateMajorDTO } from '../../types/majors';
import type { Department } from '../../types/departments';
import { useAuthStore } from '@/shared/stores/authStore';

const { Search } = Input;

const MajorList: React.FC = () => {
  const queryClient = useQueryClient();
  const loggedInUser = useAuthStore((state) => state.user);

  // 搜索和分页状态
  const [keyword, setKeyword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: 20,
  });

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<Major | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [majorToDelete, setMajorToDelete] = useState<Major | null>(null);

  // 获取院系列表
  const { data: departments, isLoading: deptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getList({ pageSize: 100 }),
  });

  // 获取专业列表
  const { data: majorData } = useQuery({
    queryKey: ['majors', paginationState.current, paginationState.pageSize, keyword, selectedDepartment],
    queryFn: () =>
      getMajorList({
        page: paginationState.current,
        pageSize: paginationState.pageSize,
        keyword: keyword || undefined,
        departmentId: selectedDepartment || undefined,
      }),
  });

  // 创建专业
  const createMutation = useMutation({
    mutationFn: createMajor,
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['majors'] });
      setModalVisible(false);
    },
    onError: () => {
      message.error('创建失败');
    },
  });

  // 更新专业
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; totalCredits?: number } }) =>
      updateMajor(id, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['majors'] });
      setModalVisible(false);
      setEditingMajor(null);
    },
    onError: () => {
      message.error('更新失败');
    },
  });

  // 删除专业
  const deleteMutation = useMutation({
    mutationFn: deleteMajor,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['majors'] });
      setDeleteModalVisible(false);
      setMajorToDelete(null);
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 权限检查
  const canEdit = useMemo(() => {
    const roles = loggedInUser?.roles || [];
    return roles.includes('super_admin') || roles.includes('admin');
  }, [loggedInUser?.roles]);

  const canDelete = useMemo(() => {
    const roles = loggedInUser?.roles || [];
    return roles.includes('super_admin');
  }, [loggedInUser?.roles]);

  const canCreate = useMemo(() => {
    const roles = loggedInUser?.roles || [];
    return roles.includes('super_admin');
  }, [loggedInUser?.roles]);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setKeyword(value);
    setPaginationState((prev) => ({ ...prev, current: 1 }));
  }, []);

  // 处理院系筛选
  const handleDepartmentChange = useCallback((value: string) => {
    setSelectedDepartment(value);
    setPaginationState((prev) => ({ ...prev, current: 1 }));
  }, []);

  // 处理添加
  const handleAdd = useCallback(() => {
    if (!canCreate) {
      message.warning('权限不足：您没有创建专业的权限');
      return;
    }
    setEditingMajor(null);
    setModalVisible(true);
  }, [canCreate]);

  // 处理编辑
  const handleEdit = useCallback((record: Major) => {
    if (!canEdit) {
      message.warning('权限不足：您没有编辑专业的权限');
      return;
    }
    setEditingMajor(record);
    setModalVisible(true);
  }, [canEdit]);

  // 处理查看详情
  const handleView = useCallback((record: Major) => {
    setDetailData(record);
    setDetailVisible(true);
  }, []);

  // 处理删除确认
  const handleDelete = useCallback((record: Major) => {
    if (!canDelete) {
      message.warning('权限不足：您没有删除专业的权限');
      return;
    }
    setMajorToDelete(record);
    setDeleteModalVisible(true);
  }, [canDelete]);

  // 处理弹窗提交
  const handleModalSubmit = useCallback((data: {
    name: string;
    code: string;
    departmentId: string;
    degreeType: DegreeType;
    totalCredits: number;
  }) => {
    if (editingMajor) {
      updateMutation.mutate({
        id: editingMajor.id,
        data: {
          name: data.name,
          totalCredits: data.totalCredits,
        },
      });
    } else {
      createMutation.mutate(data as CreateMajorDTO);
    }
  }, [editingMajor, createMutation, updateMutation]);

  // 处理分页变化
  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setPaginationState({ current: page, pageSize });
  }, []);

  // 院系选项
  const deptOptions = useMemo(() => {
    return [
      { label: '全部院系', value: '' },
      ...(departments || []).map((dept: Department) => ({
        label: dept.name,
        value: dept.id,
      })),
    ];
  }, [departments]);

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索专业名称或代码"
                allowClear
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: 280 }}
                defaultValue={keyword}
                prefix={<SearchOutlined />}
              />
              <Select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                placeholder="筛选院系"
                options={deptOptions}
                loading={deptLoading}
                style={{ width: 200 }}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  添加专业
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <MajorTable
          data={majorData?.items || []}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={paginationState.current}
            pageSize={paginationState.pageSize}
            total={majorData?.pagination.total || 0}
            onChange={handlePageChange}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100']}
            showTotal={(total) => `共 ${total} 条记录`}
          />
        </div>
      </Card>

      {/* 创建/编辑弹窗 */}
      <MajorModal
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingMajor(null);
        }}
        onSubmit={handleModalSubmit}
        editData={editingMajor}
        departments={departments || []}
      />

      {/* 详情弹窗 */}
      <MajorDetail
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        data={detailData}
      />

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setMajorToDelete(null);
        }}
        onOk={() => {
          if (majorToDelete) {
            deleteMutation.mutate(majorToDelete.id);
          }
        }}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定删除专业 &apos;{majorToDelete?.name}&apos;？</p>
        <p style={{ color: '#999', fontSize: '12px' }}>删除后将无法恢复，请谨慎操作。</p>
      </Modal>
    </div>
  );
};

export default MajorList;
