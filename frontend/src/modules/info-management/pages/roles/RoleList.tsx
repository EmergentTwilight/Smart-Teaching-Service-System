/**
 * 角色权限管理页面
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Input, message, Modal, Row, Select, Space, Table, Tabs, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../../api/roles';
import AssignPermissionsModal from '../../components/AssignPermissionsModal';
import RoleDetail from '../../components/RoleDetail';
import RoleModal from '../../components/RoleModal';
import type {
  CreateRoleDTO,
  Permission,
  PermissionQueryParams,
  Role,
  RoleDetail as RoleDetailData,
  RoleQueryParams,
  UpdateRoleDTO,
} from '../../types/roles';
import { useAuthStore } from '@/shared/stores/authStore';

const { Search } = Input;

const RoleList: React.FC = () => {
  const queryClient = useQueryClient();
  const loggedInUser = useAuthStore((state) => state.user);
  const [roleParams, setRoleParams] = useState<RoleQueryParams>({});
  const [permissionParams, setPermissionParams] = useState<PermissionQueryParams>({});
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [detailData, setDetailData] = useState<RoleDetailData | null>(null);

  const roles = loggedInUser?.roles || [];
  const canManage = roles.includes('super_admin');

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['roles-management', roleParams],
    queryFn: () => rolesApi.getList(roleParams),
  });

  const { data: permissionData, isLoading: permissionLoading } = useQuery({
    queryKey: ['permissions', permissionParams],
    queryFn: () => rolesApi.getPermissions(permissionParams),
  });

  const { data: allPermissionData } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: () => rolesApi.getPermissions(),
  });

  const roleList = useMemo(() => roleData || [], [roleData]);
  const permissionList = useMemo(() => permissionData || [], [permissionData]);
  const allPermissionList = useMemo(() => allPermissionData || [], [allPermissionData]);

  const createMutation = useMutation({
    mutationFn: (values: CreateRoleDTO) => rolesApi.create(values),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: Error) => message.error(error.message || '创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateRoleDTO }) => rolesApi.update(id, values),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setCurrentRole(null);
    },
    onError: (error: Error) => message.error(error.message || '更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: Error) => message.error(error.message || '删除失败'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      rolesApi.assignPermissions(roleId, permissionIds),
    onSuccess: (result) => {
      message.success(`权限分配成功，新增 ${result.addedCount} 项`);
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      if (currentRole) {
        loadDetail(currentRole.id);
      }
    },
    onError: (error: Error) => message.error(error.message || '权限分配失败'),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      rolesApi.revokePermission(roleId, permissionId),
    onSuccess: () => {
      message.success('权限已撤销');
      queryClient.invalidateQueries({ queryKey: ['roles-management'] });
      if (detailData) {
        loadDetail(detailData.id);
      }
    },
    onError: (error: Error) => message.error(error.message || '权限撤销失败'),
  });

  const loadDetail = useCallback(async (id: string) => {
    const detail = await rolesApi.getById(id);
    setDetailData(detail);
    return detail;
  }, []);

  const handleView = useCallback(async (role: Role) => {
    try {
      setCurrentRole(role);
      await loadDetail(role.id);
      setDetailOpen(true);
    } catch {
      message.error('获取角色详情失败');
    }
  }, [loadDetail]);

  const handleSubmit = async (values: CreateRoleDTO) => {
    if (currentRole) {
      await updateMutation.mutateAsync({
        id: currentRole.id,
        values: {
          name: values.name,
          description: values.description,
        },
      });
      return;
    }
    await createMutation.mutateAsync(values);
  };

  const handleDelete = (role: Role) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除角色 ${role.name} 吗？`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(role.id),
    });
  };

  const handleRevoke = (permission: Permission) => {
    if (!detailData) return;
    Modal.confirm({
      title: '确认撤销权限',
      content: `确定要从角色 ${detailData.name} 撤销 ${permission.name} 吗？`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => revokeMutation.mutateAsync({ roleId: detailData.id, permissionId: permission.id }),
    });
  };

  const resourceOptions = useMemo(() => {
    const resources = Array.from(new Set(permissionList.map((permission) => permission.resource))).sort();
    return resources.map((resource) => ({ label: resource, value: resource }));
  }, [permissionList]);

  const actionOptions = useMemo(() => {
    const actions = Array.from(new Set(permissionList.map((permission) => permission.action))).sort();
    return actions.map((action) => ({ label: action, value: action }));
  }, [permissionList]);

  const roleColumns: ColumnsType<Role> = [
    { title: '角色代码', dataIndex: 'code', key: 'code', width: 140 },
    { title: '角色名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '描述', dataIndex: 'description', key: 'description', render: (value?: string | null) => value || '-' },
    { title: '类型', dataIndex: 'builtin', key: 'builtin', width: 110, render: (value: boolean) => value ? <Tag color="blue">系统内置</Tag> : <Tag>自定义</Tag> },
    { title: '用户数', dataIndex: 'userCount', key: 'userCount', width: 90, align: 'right' },
    { title: '权限数', dataIndex: 'permissions', key: 'permissions', width: 90, align: 'right', render: (value: Role['permissions']) => value.length },
    {
      title: '操作',
      key: 'action',
      width: canManage ? 260 : 90,
      fixed: 'right',
      render: (_, record) => (
        <Space size={12}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            查看
          </Button>
          {canManage && (
            <>
              <Button type="link" size="small" icon={<SafetyOutlined />} onClick={() => { setCurrentRole(record); setAssignOpen(true); }}>
                分配
              </Button>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setCurrentRole(record); setFormOpen(true); }}>
                编辑
              </Button>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.builtin || record.userCount > 0} onClick={() => handleDelete(record)}>
                删除
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const permissionColumns: ColumnsType<Permission> = [
    { title: '权限代码', dataIndex: 'code', key: 'code', width: 180 },
    { title: '权限名称', dataIndex: 'name', key: 'name', width: 140 },
    { title: '资源', dataIndex: 'resource', key: 'resource', width: 120 },
    { title: '操作', dataIndex: 'action', key: 'action', width: 120 },
    { title: '描述', dataIndex: 'description', key: 'description', render: (value?: string | null) => value || '-' },
  ];

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'roles',
            label: '角色管理',
            children: (
              <Card>
                {roleList.length === 0 && !roleLoading && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="暂无角色数据" />}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col flex="auto">
                    <Space size="middle" wrap>
                      <Search
                        placeholder="搜索角色名称或代码"
                        allowClear
                        onSearch={(keyword) => setRoleParams((prev) => ({ ...prev, keyword }))}
                        style={{ width: 260 }}
                      />
                      <Select
                        allowClear
                        placeholder="角色类型"
                        value={roleParams.builtin}
                        options={[
                          { label: '系统内置', value: true },
                          { label: '自定义', value: false },
                        ]}
                        onChange={(builtin?: boolean) => setRoleParams((prev) => ({ ...prev, builtin }))}
                        style={{ width: 140 }}
                      />
                      <Button icon={<ReloadOutlined />} onClick={() => setRoleParams({})}>重置</Button>
                    </Space>
                  </Col>
                  <Col>
                    {canManage && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCurrentRole(null); setFormOpen(true); }}>新增角色</Button>}
                  </Col>
                </Row>
                <Table columns={roleColumns} dataSource={roleList} rowKey="id" loading={roleLoading} pagination={false} scroll={{ x: 1000 }} />
              </Card>
            ),
          },
          {
            key: 'permissions',
            label: '权限列表',
            children: (
              <Card>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col flex="auto">
                    <Space size="middle" wrap>
                      <Search
                        placeholder="搜索权限名称或代码"
                        allowClear
                        onSearch={(keyword) => setPermissionParams((prev) => ({ ...prev, keyword }))}
                        style={{ width: 260 }}
                      />
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="资源"
                        value={permissionParams.resource}
                        options={resourceOptions}
                        onChange={(resource?: string) => setPermissionParams((prev) => ({ ...prev, resource }))}
                        style={{ width: 160 }}
                      />
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="操作"
                        value={permissionParams.action}
                        options={actionOptions}
                        onChange={(action?: string) => setPermissionParams((prev) => ({ ...prev, action }))}
                        style={{ width: 140 }}
                      />
                      <Button icon={<ReloadOutlined />} onClick={() => setPermissionParams({})}>重置</Button>
                    </Space>
                  </Col>
                </Row>
                <Table columns={permissionColumns} dataSource={permissionList} rowKey="id" loading={permissionLoading} pagination={false} />
              </Card>
            ),
          },
        ]}
      />

      <RoleModal
        visible={formOpen}
        onClose={() => { setFormOpen(false); setCurrentRole(null); }}
        onSubmit={handleSubmit}
        initialData={currentRole || undefined}
        permissions={allPermissionList}
      />

      <AssignPermissionsModal
        visible={assignOpen}
        onClose={() => { setAssignOpen(false); setCurrentRole(null); }}
        onSubmit={async (permissionIds) => {
          if (!currentRole) return;
          await assignMutation.mutateAsync({ roleId: currentRole.id, permissionIds });
        }}
        role={currentRole}
        permissions={allPermissionList}
      />

      <RoleDetail
        visible={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailData(null); setCurrentRole(null); }}
        data={detailData}
        canManage={canManage}
        onRevokePermission={handleRevoke}
      />
    </div>
  );
};

export default RoleList;
