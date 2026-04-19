/**
 * 部门管理页面
 * 显示部门列表，支持新增、编辑、删除、搜索、分页等功能
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Button,
  Space,
  message,
  Input,
  Card,
  Row,
  Col,
  Alert,
  Modal,
  Pagination,
  BuildOutlined,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '../../api/departments';
import type { Department, DepartmentDetail as DepartmentDetailData, DepartmentQueryParams, CreateDepartmentDTO, UpdateDepartmentDTO } from '../../types/departments';
import { useAuthStore } from '@/shared/stores/authStore';
import DepartmentTable from '../../components/DepartmentTable';
import DepartmentModal from '../../components/DepartmentModal';
import DepartmentDetail from '../../components/DepartmentDetail';

const { Search } = Input;

/** 简单防抖函数 */
function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

const DepartmentList: React.FC = () => {
  const queryClient = useQueryClient();
  const loggedInUser = useAuthStore((state) => state.user);

  // 表单状态
  const [formOpen, setFormOpen] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);

  // 详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<DepartmentDetailData | null>(null);

  // 多选状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 删除确认弹窗状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  // 搜索和分页状态
  const [params, setParams] = useState<DepartmentQueryParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['departments', params],
    queryFn: () => departmentsApi.getList(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.delete(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(errorMessage || '删除失败');
    },
  });

  // 检查是否是超级管理员（必须定义在所有使用它的回调函数之前）
  const isSuperAdmin = useMemo(() => {
    const roles = loggedInUser?.roles || [];
    return roles.includes('super_admin');
  }, [loggedInUser?.roles]);

  // 表格多选配置
  const rowSelection = useMemo<TableProps<Department>['rowSelection']>(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys),
    }),
    [selectedRowKeys]
  );

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedRowKeys([]);
  }, []);

  // 新增部门
  const handleCreate = useCallback(() => {
    console.log('=== [调试] 点击新增部门按钮 ===');
    console.log('当前用户:', loggedInUser);
    
    // 检查权限
    if (!isSuperAdmin) {
      alert('权限不足：您没有创建部门的权限，请联系超级管理员。');
      return;
    }
    
    setCurrentDepartment(null);
    setFormOpen(true);
    console.log('=== [调试] 弹窗状态设置为打开 ===');
  }, [loggedInUser, isSuperAdmin]);

  // 处理编辑
  const handleEdit = useCallback((department: Department) => {
    // 检查权限
    if (!isSuperAdmin) {
      alert('权限不足：您没有编辑部门的权限，请联系超级管理员。');
      return;
    }
    setCurrentDepartment(department);
    setFormOpen(true);
  }, [isSuperAdmin]);

  // 处理查看详情
  const handleView = useCallback(async (department: Department) => {
    try {
      const detail = await departmentsApi.getById(department.id);
      setDetailData(detail);
      setDetailOpen(true);
    } catch {
      message.error('获取详情失败');
    }
  }, []);

  // 处理表单提交
  const handleSubmit = async (values: CreateDepartmentDTO | UpdateDepartmentDTO) => {
    console.log('=== [调试] handleSubmit 开始 ===');
    console.log('当前编辑的部门:', currentDepartment);
    console.log('提交的数据:', values);
    try {
      if (currentDepartment) {
        console.log('=== [调试] 执行更新操作 ===');
        await departmentsApi.update(currentDepartment.id, values as UpdateDepartmentDTO);
        console.log('=== [调试] 更新成功 ===');
        message.success('更新成功');
      } else {
        console.log('=== [调试] 执行创建操作 ===');
        await departmentsApi.create(values as CreateDepartmentDTO);
        console.log('=== [调试] 创建成功 ===');
        message.success('创建成功');
      }
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      console.log('=== [调试] 数据已刷新 ===');
    } catch (error: unknown) {
      console.error('=== [调试] 操作失败 ===');
      console.error('错误详情:', error);
      const errorData = (error as { response?: { data?: { message?: string } } })?.response?.data;
      console.error('错误响应:', errorData);
      message.error(errorData?.message || '操作失败');
    }
  };

  // 打开删除确认弹窗
  const handleOpenDeleteModal = useCallback((id: string) => {
    console.log('=== [调试] 点击删除按钮 ===');
    console.log('当前用户:', loggedInUser);
    console.log('isSuperAdmin:', isSuperAdmin);
    console.log('要删除的部门ID:', id);
    console.log('data:', data);
    console.log('data?.items:', data?.items);
    
    // 检查权限
    if (!isSuperAdmin) {
      alert('权限不足：您没有删除部门的权限，请联系超级管理员。');
      console.log('=== [调试] 权限检查失败：非超级管理员 ===');
      return;
    }
    
    console.log('=== [调试] 权限检查通过 ===');
    
    const department = data?.find((item) => item.id === id);
    console.log('找到的部门:', department);
    
    if (department) {
      setDepartmentToDelete(department);
      setDeleteModalOpen(true);
      console.log('=== [调试] 删除确认弹窗已打开 ===');
    } else {
      message.error('部门不存在或已被删除');
      console.log('=== [调试] 未找到部门 ===');
    }
  }, [data, isSuperAdmin, loggedInUser]);

  // 搜索处理（防抖）
  const debouncedSearchRef = useRef(
    debounce((value: string) => {
      setParams((prev) => ({ ...prev, keyword: value, page: 1 }));
    }, 300)
  );

  const handleSearch = useCallback((value: string) => {
    debouncedSearchRef.current(value);
  }, []);

  // 分页变化
  const handleTableChange = useCallback(
    (page: number, pageSize: number) => {
      setParams((prev) => ({
        ...prev,
        page,
        pageSize,
      }));
    },
    []
  );

  // 重置搜索
  const handleReset = useCallback(() => {
    setParams({
      page: 1,
      pageSize: 10,
      keyword: '',
    });
  }, []);

  const departments = data || [];
  const pagination = {
    total: departments.length,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(departments.length / params.pageSize),
  };

  return (
    <div>
      <Card>
        {/* 批量操作栏 */}
        {selectedRowKeys.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <Space>
                <span>已选择 {selectedRowKeys.length} 个部门</span>
                <Button size="small" onClick={clearSelection}>
                  取消选择
                </Button>
              </Space>
            }
          />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索部门名称或代码"
                allowClear
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: 280 }}
                defaultValue={params.keyword}
              />
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              {isSuperAdmin && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  新增部门
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <DepartmentTable
          data={departments}
          loading={isLoading}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleOpenDeleteModal}
          rowSelection={rowSelection}
        />

        {/* 分页器 */}
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            total={pagination?.total || 0}
            pageSize={params.pageSize}
            current={params.page}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条`}
            pageSizeOptions={['10', '20', '50', '100']}
            onChange={handleTableChange}
          />
        </div>
      </Card>

      {/* 新增/编辑部门表单 */}
      <DepartmentModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          setCurrentDepartment(null);
        }}
        onSubmit={handleSubmit}
        initialData={currentDepartment || undefined}
      />

      {/* 部门详情 */}
      <DepartmentDetail
        visible={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailData(null);
        }}
        data={detailData}
      />

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onOk={() => {
          console.log('=== [调试] 点击删除确认弹窗的确定按钮 ===');
          console.log('departmentToDelete:', departmentToDelete);
          console.log('deleteMutation:', deleteMutation);
          
          if (departmentToDelete) {
            console.log('=== [调试] 执行 deleteMutation.mutate ===');
            deleteMutation.mutate(departmentToDelete.id);
            setDeleteModalOpen(false);
          } else {
            console.log('=== [调试] departmentToDelete 为空 ===');
          }
        }}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
      >
        <p>确定要删除部门 <strong>{departmentToDelete?.name}</strong> 吗？此操作不可恢复。</p>
        {departmentToDelete?.teacher_count > 0 && (
          <p style={{ color: '#f59e0b', marginTop: 8 }}>
            该部门下还有 {departmentToDelete.teacher_count} 名教师，删除前请先转移或删除相关教师。
          </p>
        )}
        {departmentToDelete?.major_count > 0 && (
          <p style={{ color: '#f59e0b', marginTop: 8 }}>
            该部门下还有 {departmentToDelete.major_count} 个专业，删除前请先删除相关专业。
          </p>
        )}
      </Modal>
    </div>
  );
};

export default DepartmentList;
