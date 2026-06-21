/**
 * 用户表单组件
 * 用于创建和编辑用户
 */
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Space, Row, Col, InputNumber, Divider, Upload, Avatar, Button } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import type { UserDetail, UserFormData } from '@/shared/types';
import toast from '@/shared/components/Toast/Toast';
import { departmentsApi } from '../../api/departments';
import { majorsApi } from '../../api/majors';
import { resolveAssetUrl } from '@/shared/utils/url';

/**
 * UserForm 组件 Props
 */
interface UserFormProps {
  /** 是否显示 */
  open: boolean;
  /** 是否处于详情加载中 */
  loading?: boolean;
  /** 编辑的用户（为空表示新建） */
  user?: UserDetail | null;
  /** 可选角色列表 */
  roles?: { id: string; name: string; code: string }[];
  /** 提交回调 */
  onSubmit: (values: UserFormData) => Promise<void>;
  /** 取消回调 */
  onCancel: () => void;
}

const genderOptions = [
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
  { label: '其他', value: 'OTHER' },
];

const UserForm: React.FC<UserFormProps> = ({ open, loading = false, user, roles, onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [majors, setMajors] = useState<Array<{ id: string; name: string }>>([]);
  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([]);

  const isEdit = !!user;
  const selectedRoleIds = Form.useWatch('roleIds', form) as string[] | undefined;
  const selectedRoleCodes =
    roles?.filter((role) => selectedRoleIds?.includes(role.id)).map((role) => role.code) || [];
  const hasStudentRole = selectedRoleCodes.includes('student');
  const hasTeacherRole = selectedRoleCodes.includes('teacher');
  const hasAdminRole = selectedRoleCodes.some((code) =>
    ['admin', 'super_admin', 'security_admin'].includes(code)
  );

  useEffect(() => {
    if (open) {
      if (user) {
        // 编辑模式：填充用户数据
        // 将角色代码转换为角色 ID
        const roleIds = user.roles?.map(roleCode => {
          const role = roles?.find(r => r.code === roleCode)
          return role?.id || roleCode
        }) || []

        form.setFieldsValue({
          username: user.username,
          realName: user.realName,
          email: user.email || '',
          phone: user.phone || '',
          avatarUrl: user.avatarUrl || undefined,
          gender: user.gender || undefined,
          status: user.status,
          roleIds: roleIds,
          student: user.student
            ? {
                studentNumber: user.student.studentNumber,
                majorId: user.student.majorId,
                grade: user.student.grade,
                className: user.student.className,
              }
            : undefined,
          teacher: user.teacher
            ? {
                teacherNumber: user.teacher.teacherNumber,
                departmentId: user.teacher.departmentId,
                title: user.teacher.title,
                officeLocation: user.teacher.officeLocation,
              }
            : undefined,
          admin: user.admin
            ? {
                adminType: user.admin.adminType,
                departmentId: user.admin.departmentId,
              }
            : undefined,
        });
        setAvatarFileList(
          user.avatarUrl
            ? [
                {
                  uid: '-1',
                  name: 'avatar',
                  status: 'done',
                  url: resolveAssetUrl(user.avatarUrl),
                },
              ]
            : []
        );
      } else {
        // 新建模式：重置表单
        form.resetFields();
        setAvatarFileList([]);
      }
    }
  }, [open, user, form, roles]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void Promise.all([
      majorsApi.getList({ page: 1, pageSize: 100 }),
      departmentsApi.getList({ page: 1, pageSize: 100 }),
    ])
      .then(([majorData, departmentData]) => {
        setMajors(majorData.items.map((major) => ({ id: major.id, name: major.name })));
        setDepartments(
          departmentData.items.map((department) => ({ id: department.id, name: department.name }))
        );
      })
      .catch(() => {
        setMajors([]);
        setDepartments([]);
      });
  }, [open]);

  const handleAvatarChange: UploadProps['beforeUpload'] = (file) => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isImage) {
      toast.error('头像仅支持 JPG、PNG、WEBP');
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      toast.error('头像大小不能超过 5MB');
      return Upload.LIST_IGNORE;
    }

    const previewUrl = URL.createObjectURL(file);
    form.setFieldsValue({
      avatarFile: file,
      avatarPreviewUrl: previewUrl,
    });
    setAvatarFileList([
      {
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: previewUrl,
        originFileObj: file,
      },
    ]);
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // 构建提交数据
      const submitData: UserFormData = {
        username: values.username,
        realName: values.realName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        avatarUrl: values.avatarUrl || undefined,
        avatarFile: values.avatarFile,
        avatarPreviewUrl: values.avatarPreviewUrl,
        gender: values.gender as 'MALE' | 'FEMALE' | 'OTHER',
      };

      if (isEdit) {
        submitData.status = values.status;
      }

      // 密码处理
      if (values.password) {
        submitData.password = values.password;
      }

      // 角色处理（需要根据实际 API 调整）
      if (values.roleIds) {
        submitData.roleIds = values.roleIds;
      }

      if (!isEdit && hasStudentRole && values.student) {
        submitData.student = {
          studentNumber: values.student.studentNumber,
          majorId: values.student.majorId || undefined,
          grade: values.student.grade,
          className: values.student.className || undefined,
        };
      }

      if (isEdit && user?.student && values.student) {
        submitData.student = {
          studentNumber: user.student.studentNumber,
          majorId: values.student.majorId || undefined,
          grade: user.student.grade,
          className: user.student.className,
        };
      }

      if (!isEdit && hasTeacherRole && values.teacher) {
        submitData.teacher = {
          teacherNumber: values.teacher.teacherNumber,
          departmentId: values.teacher.departmentId || undefined,
          title: values.teacher.title || undefined,
          officeLocation: values.teacher.officeLocation || undefined,
        };
      }

      if (isEdit && user?.teacher && values.teacher) {
        submitData.teacher = {
          teacherNumber: user.teacher.teacherNumber,
          departmentId: values.teacher.departmentId || undefined,
          title: user.teacher.title,
          officeLocation: user.teacher.officeLocation,
        };
      }

      if (!isEdit && hasAdminRole && values.admin) {
        submitData.admin = {
          adminType: values.admin.adminType,
          departmentId: values.admin.departmentId || undefined,
        };
      }

      if (isEdit && user?.admin && values.admin) {
        submitData.admin = {
          adminType: user.admin.adminType,
          departmentId: values.admin.departmentId || undefined,
        };
      }

      await onSubmit(submitData);
      toast.success(isEdit ? '更新成功' : '创建成功');
      form.resetFields();
      setAvatarFileList([]);
      onCancel();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单验证失败
        return;
      }
      toast.error(error instanceof Error ? error.message : (isEdit ? '更新失败' : '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setAvatarFileList([]);
    onCancel();
  };

  return (
    <Modal
      title={isEdit ? '编辑用户' : '新建用户'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting || loading}
      destroyOnClose
      width={720}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'ACTIVE',
          gender: undefined,
        }}
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少 3 个字符' },
            { max: 50, message: '用户名最多 50 个字符' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
          ]}
        >
          <Input 
            prefix={<UserOutlined />}
            placeholder="请输入用户名" 
            disabled={isEdit || loading} 
          />
        </Form.Item>

        <Form.Item
          name="realName"
          label="真实姓名"
          rules={[
            { required: true, message: '请输入真实姓名' },
            { max: 50, message: '姓名最多 50 个字符' },
          ]}
        >
          <Input placeholder="请输入真实姓名" />
        </Form.Item>

        {isEdit && (
          <>
            <Divider orientation="left">头像</Divider>
            <Space align="start" size="large" style={{ marginBottom: 16 }}>
              <Avatar
                size={72}
                src={
                  form.getFieldValue('avatarPreviewUrl') ||
                  resolveAssetUrl(form.getFieldValue('avatarUrl'))
                }
                icon={<UserOutlined />}
              />
              <Form.Item name="avatarFile" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="avatarPreviewUrl" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="avatarUrl" hidden>
                <Input />
              </Form.Item>
              <Upload
                accept=".jpg,.jpeg,.png,.webp"
                maxCount={1}
                fileList={avatarFileList}
                beforeUpload={handleAvatarChange}
                onRemove={() => {
                  form.setFieldsValue({ avatarFile: undefined, avatarPreviewUrl: undefined });
                  setAvatarFileList([]);
                }}
                showUploadList={{ showRemoveIcon: true }}
              >
                <Button icon={<UploadOutlined />} disabled={loading}>
                  上传头像
                </Button>
              </Upload>
            </Space>
          </>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
          <Input prefix={<MailOutlined />} placeholder="请输入邮箱" disabled={loading} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="手机号"
            >
              <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" disabled={loading} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="password"
          label={isEdit ? '新密码（留空不修改）' : '密码'}
          extra="密码至少8位，需包含大写字母、小写字母和数字"
          rules={
            isEdit
              ? [
                  { min: 8, message: '密码至少 8 个字符' },
                  { pattern: /[A-Z]/, message: '密码必须包含大写字母' },
                  { pattern: /[a-z]/, message: '密码必须包含小写字母' },
                  { pattern: /[0-9]/, message: '密码必须包含数字' },
                ]
              : [
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少 8 个字符' },
                  { pattern: /[A-Z]/, message: '密码必须包含大写字母' },
                  { pattern: /[a-z]/, message: '密码必须包含小写字母' },
                  { pattern: /[0-9]/, message: '密码必须包含数字' },
                ]
          }
        >
          <Input.Password 
            prefix={<LockOutlined />} 
            placeholder={isEdit ? '留空则不修改密码' : '请输入密码'}
            autoComplete="new-password"
            disabled={loading}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size="large">
          <Form.Item
            name="gender"
            label="性别"
            style={{ width: 280 }}
          >
            <Radio.Group options={genderOptions} />
          </Form.Item>

          {isEdit && (
            <Form.Item
              name="status"
              label="状态"
              style={{ width: 260 }}
            >
              <Radio.Group>
                <Radio value="ACTIVE">启用</Radio>
                <Radio value="INACTIVE">禁用</Radio>
                <Radio value="BANNED">封禁</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        </Space>

        {roles && roles.length > 0 && (
          <Form.Item
            name="roleIds"
            label="角色"
          >
            <Select
              mode="multiple"
              placeholder="请选择角色（可选）"
              disabled={loading}
              options={roles.map(role => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>
        )}

        {!isEdit && hasStudentRole && (
          <>
            <Divider orientation="left">学生信息</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['student', 'studentNumber']}
                  label="学号"
                  rules={[{ required: true, message: '请输入学号' }]}
                >
                  <Input placeholder="请输入学号" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['student', 'majorId']}
                  label="专业"
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder="请选择专业"
                    optionFilterProp="label"
                    options={majors.map((major) => ({
                      label: major.name,
                      value: major.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['student', 'grade']}
                  label="年级"
                  rules={[{ required: true, message: '请输入年级' }]}
                >
                  <InputNumber min={1900} max={2100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['student', 'className']}
                  label="班级"
                >
                  <Input placeholder="请输入班级" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {!isEdit && hasTeacherRole && (
          <>
            <Divider orientation="left">教师信息</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['teacher', 'teacherNumber']}
                  label="工号"
                  rules={[{ required: true, message: '请输入工号' }]}
                >
                  <Input placeholder="请输入工号" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['teacher', 'departmentId']}
                  label="院系"
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder="请选择院系"
                    optionFilterProp="label"
                    options={departments.map((department) => ({
                      label: department.name,
                      value: department.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['teacher', 'title']}
                  label="职称"
                >
                  <Input placeholder="请输入职称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['teacher', 'officeLocation']}
                  label="办公地点"
                >
                  <Input placeholder="请输入办公地点" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {!isEdit && hasAdminRole && (
          <>
            <Divider orientation="left">管理员信息</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['admin', 'adminType']}
                  label="管理员类型"
                  rules={[{ required: true, message: '请选择管理员类型' }]}
                >
                  <Select
                    placeholder="请选择管理员类型"
                    options={[
                      { label: '教务管理员', value: 'ACADEMIC' },
                      { label: '超级管理员', value: 'SUPER' },
                      { label: '安全管理员', value: 'SECURITY' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['admin', 'departmentId']}
                  label="院系"
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder="请选择院系"
                    optionFilterProp="label"
                    options={departments.map((department) => ({
                      label: department.name,
                      value: department.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {isEdit && user?.student && (
          <>
            <Divider orientation="left">学生信息</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name={['student', 'studentNumber']} label="学号">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name={['student', 'majorId']} label="专业">
                  <Select
                    allowClear
                    showSearch
                    placeholder="请选择专业"
                    optionFilterProp="label"
                    disabled={loading}
                    options={majors.map((major) => ({
                      label: major.name,
                      value: major.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {isEdit && user?.teacher && (
          <>
            <Divider orientation="left">教师信息</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name={['teacher', 'teacherNumber']} label="工号">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name={['teacher', 'departmentId']} label="院系">
                  <Select
                    allowClear
                    showSearch
                    placeholder="请选择院系"
                    optionFilterProp="label"
                    disabled={loading}
                    options={departments.map((department) => ({
                      label: department.name,
                      value: department.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {isEdit && user?.admin && (
          <>
            <Divider orientation="left">管理员信息</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name={['admin', 'adminType']} label="管理员类型">
                  <Select
                    disabled
                    options={[
                      { label: '教务管理员', value: 'ACADEMIC' },
                      { label: '超级管理员', value: 'SUPER' },
                      { label: '安全管理员', value: 'SECURITY' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name={['admin', 'departmentId']} label="院系">
                  <Select
                    allowClear
                    showSearch
                    placeholder="请选择院系"
                    optionFilterProp="label"
                    disabled={loading}
                    options={departments.map((department) => ({
                      label: department.name,
                      value: department.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default UserForm;
