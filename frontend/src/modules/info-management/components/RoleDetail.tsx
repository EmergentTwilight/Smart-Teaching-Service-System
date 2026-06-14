/**
 * 角色详情弹窗
 */
import React from 'react';
import { Button, Descriptions, Modal, Space, Table, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Permission, RoleDetail as RoleDetailData } from '../types/roles';

interface RoleDetailProps {
  visible: boolean;
  onClose: () => void;
  data: RoleDetailData | null;
  canManage?: boolean;
  onRevokePermission: (permission: Permission) => void;
}

const RoleDetail: React.FC<RoleDetailProps> = ({
  visible,
  onClose,
  data,
  canManage = false,
  onRevokePermission,
}) => {
  if (!data) return null;

  const permissionColumns: ColumnsType<Permission> = [
    { title: '权限代码', dataIndex: 'code', key: 'code', width: 160 },
    { title: '权限名称', dataIndex: 'name', key: 'name', width: 140 },
    { title: '资源', dataIndex: 'resource', key: 'resource', width: 100 },
    { title: '操作', dataIndex: 'action', key: 'action', width: 100 },
    { title: '描述', dataIndex: 'description', key: 'description', render: (value?: string | null) => value || '-' },
    {
      title: '操作',
      key: 'action_column',
      width: 90,
      render: (_, record) => canManage ? (
        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onRevokePermission(record)}>
          撤销
        </Button>
      ) : null,
    },
  ];

  const userColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'realName', key: 'realName' },
  ];

  return (
    <Modal title="角色详情" open={visible} onCancel={onClose} footer={null} width={900}>
      <Descriptions title={data.name} column={2}>
        <Descriptions.Item label="代码">{data.code}</Descriptions.Item>
        <Descriptions.Item label="类型">{data.builtin ? <Tag color="blue">系统内置</Tag> : <Tag>自定义</Tag>}</Descriptions.Item>
        <Descriptions.Item label="描述" span={2}>{data.description || '-'}</Descriptions.Item>
      </Descriptions>

      <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
        <div>
          <h4 style={{ margin: '0 0 8px' }}>权限列表</h4>
          <Table columns={permissionColumns} dataSource={data.permissions} rowKey="id" pagination={false} size="small" />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px' }}>关联用户</h4>
          <Table columns={userColumns} dataSource={data.users} rowKey="id" pagination={false} size="small" />
        </div>
      </Space>
    </Modal>
  );
};

export default RoleDetail;
