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
  SearchOutlined,
  NotificationOutlined,
  BarChartOutlined,
  SafetyOutlined,
  HomeOutlined,
  RobotOutlined,
  EditOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import {
  FORUM_EXPORT_ROLES,
  FORUM_STATS_ROLES,
  FORUM_TEACHER_ROLES,
} from '@/modules/forum/constants/forum';

type MenuItem = Exclude<NonNullable<MenuProps['items']>[number], null>;

const FORUM_ANNOUNCE_ROLES = FORUM_TEACHER_ROLES;

function hasAnyRole(roles: string[], allowed: readonly string[]) {
  return allowed.some((r) => roles.includes(r));
}

/** 论坛子菜单（按角色过滤） */
function getForumChildren(roles: string[]): MenuItem[] {
  const items: MenuItem[] = [
    { key: '/forum/posts', icon: <FileTextOutlined />, label: '课程论坛' },
    { key: '/forum/search', icon: <SearchOutlined />, label: '帖子检索' },
    { key: '/forum/my', icon: <UserOutlined />, label: '我的发布' },
  ];
  if (hasAnyRole(roles, FORUM_ANNOUNCE_ROLES)) {
    items.push({
      key: '/forum/announcements',
      icon: <NotificationOutlined />,
      label: '公告管理',
    });
  }
  if (hasAnyRole(roles, FORUM_STATS_ROLES)) {
    items.push({
      key: '/forum/stats',
      icon: <BarChartOutlined />,
      label: '论坛统计',
    });
  }
  return items;
}

export const MENU_ITEMS: MenuItem[] = [
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
    children: getForumChildren([]),
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

/** 根据用户角色生成菜单（论坛子项按权限过滤） */
export function getMenuItemsForRoles(roles: string[]): MenuProps['items'] {
  return MENU_ITEMS.map((item): MenuItem => {
    if (item.key === 'forum' && 'children' in item) {
      return { ...item, children: getForumChildren(roles) };
    }
    return item;
  });
}

/** 是否可导出论坛统计（供页面内按钮使用） */
export function canExportForumStats(roles: string[]) {
  return hasAnyRole(roles, FORUM_EXPORT_ROLES);
}
