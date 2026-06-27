/**
 * 用户活跃令牌管理弹窗
 */
import React from 'react';
import { Button, Modal, Table } from 'antd';
import { DeleteOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { RefreshTokenItem } from '../types/roles';

interface UserTokensModalProps {
  visible: boolean;
  userName: string;
  data: RefreshTokenItem[];
  loading?: boolean;
  onClose: () => void;
  onRevoke: (token: RefreshTokenItem) => void;
  onRevokeAll: () => void;
}

const UserTokensModal: React.FC<UserTokensModalProps> = ({
  visible,
  userName,
  data,
  loading = false,
  onClose,
  onRevoke,
  onRevokeAll,
}) => {
  const columns: ColumnsType<RefreshTokenItem> = [
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm') },
    { title: '过期时间', dataIndex: 'expiresAt', key: 'expiresAt', width: 150, render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm') },
    { title: '最后使用', dataIndex: 'lastUsedAt', key: 'lastUsedAt', width: 150, render: (value?: string | null) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-' },
    { title: 'IP 地址', dataIndex: 'ipAddress', key: 'ipAddress', width: 130, render: (value?: string | null) => value || '-' },
    { title: 'User Agent', dataIndex: 'userAgent', key: 'userAgent', ellipsis: true, render: (value?: string | null) => value || '-' },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onRevoke(record)}>
          吊销
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={`${userName} 的活跃令牌`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={980}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button danger icon={<StopOutlined />} onClick={onRevokeAll} disabled={data.length === 0}>
          吊销全部
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: 900 }}
      />
    </Modal>
  );
};

export default UserTokensModal;
