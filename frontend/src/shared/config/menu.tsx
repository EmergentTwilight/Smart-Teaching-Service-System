/**
 * 菜单配置文件
 * 集中管理侧边栏菜单项
 */
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  SettingOutlined,
  DashboardOutlined,
  CalendarOutlined,
  TeamOutlined,
  CommentOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SafetyOutlined,
  HomeOutlined,
  RobotOutlined,
  BellOutlined,
  EditOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';

export const MENU_ITEMS: MenuProps['items'] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: 'info',
    icon: <UserOutlined />,
    label: '基础信息管理',
    children: [
      { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
      { key: '/info/roles', icon: <SafetyOutlined />, label: '角色权限' },
      { key: '/info/courses', icon: <BookOutlined />, label: '课程信息' },
      { key: '/info/classrooms', icon: <HomeOutlined />, label: '教室管理' },
    ],
  },
  {
    key: 'schedule',
    icon: <CalendarOutlined />,
    label: '自动排课',
    children: [
      { key: '/schedule/tasks', icon: <FileTextOutlined />, label: '排课任务' },
      { key: '/schedule/view', icon: <CalendarOutlined />, label: '课表查看' },
      { key: '/schedule/manual', icon: <EditOutlined />, label: '手动调整' },
    ],
  },
  {
    key: 'selection',
    icon: <BookOutlined />,
    label: '智能选课',
    children: [
      { key: '/selection/courses', icon: <BookOutlined />, label: '课程列表' },
      { key: '/selection/my', icon: <UserOutlined />, label: '我的选课' },
      { key: '/selection/ai', icon: <RobotOutlined />, label: 'AI 推荐' },
    ],
  },
  {
    key: 'forum',
    icon: <CommentOutlined />,
    label: '论坛交流',
    children: [
      { key: '/forum/posts', icon: <FileTextOutlined />, label: '帖子列表' },
      { key: '/forum/my', icon: <UserOutlined />, label: '我的发布' },
      { key: '/forum/notifications', icon: <BellOutlined />, label: '消息通知' },
    ],
  },
  {
    key: 'exam',
    icon: <FileTextOutlined />,
    label: '在线测试',
    children: [
      { key: '/exam/questions', icon: <DatabaseOutlined />, label: '题库管理' },
      { key: '/exam/papers', icon: <FileTextOutlined />, label: '组卷考试' },
      { key: '/exam/results', icon: <BarChartOutlined />, label: '成绩查看' },
    ],
  },
  {
    key: 'grade',
    icon: <BarChartOutlined />,
    label: '成绩管理',
    children: [
      { key: '/grade/entry', icon: <EditOutlined />, label: '成绩录入' },
      { key: '/grade/statistics', icon: <LineChartOutlined />, label: '统计分析' },
      { key: '/grade/gpa', icon: <CalculatorOutlined />, label: 'GPA 计算' },
    ],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];
