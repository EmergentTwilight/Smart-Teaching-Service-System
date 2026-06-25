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
  RobotOutlined,
  EditOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  CalculatorOutlined,
  ApiOutlined,
  BuildOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  FORUM_EXPORT_ROLES,
  FORUM_STATS_ROLES,
  FORUM_TEACHER_ROLES,
} from '@/modules/forum/constants/forum';

type MenuItem = Exclude<NonNullable<MenuProps['items']>[number], null>;

const FORUM_ANNOUNCE_ROLES = FORUM_TEACHER_ROLES;

const C_SELECTION_MENU_ROLE_RULES: Record<string, readonly string[]> = {
  '/selection/courses': ['student'],
  '/selection/curriculum': ['student'],
  '/selection/timetable': ['student'],
  '/selection/ai': ['student'],
  '/selection/admin/periods': ['admin', 'super_admin'],
  '/selection/admin/manual-enrollment': ['admin', 'super_admin'],
  '/selection/teacher/roster': ['teacher'],
};

const F_GRADE_MENU_ROLE_RULES: Record<string, readonly string[]> = {
  '/grade/entry': ['teacher'],
  '/grade/statistics': ['student', 'teacher', 'admin', 'super_admin'],
  '/grade/gpa': ['student'],
  '/grade/approval': ['admin', 'super_admin'],
};

const MENU_ROLE_RULES: Record<string, readonly string[]> = {
  ...C_SELECTION_MENU_ROLE_RULES,
  ...F_GRADE_MENU_ROLE_RULES,
};

function hasAnyRole(roles: string[], allowed: readonly string[]) {
  return allowed.some((r) => roles.includes(r));
}

function hasMenuRole(roles: string[], allowedRoles?: readonly string[]) {
  return !allowedRoles || hasAnyRole(roles, allowedRoles);
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

function filterMenuItemsByRole(
  items: MenuProps['items'],
  roles: string[]
): MenuItem[] {
  if (!items) {
    return [];
  }

  return items.reduce<MenuItem[]>((filtered, item) => {
    if (!item) {
      return filtered;
    }

    const key = 'key' in item && item.key !== undefined ? String(item.key) : undefined;
    if (!hasMenuRole(roles, key ? MENU_ROLE_RULES[key] : undefined)) {
      return filtered;
    }

    if ('children' in item && item.children) {
      const children = filterMenuItemsByRole(item.children as MenuProps['items'], roles);
      if ((key === 'selection' || key === 'grade') && children.length === 0) {
        return filtered;
      }
      filtered.push({ ...item, children } as MenuItem);
      return filtered;
    }

    filtered.push(item);
    return filtered;
  }, []);
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
      { key: '/info/departments', icon: <BuildOutlined />, label: '部门管理' },
      { key: '/info/majors', icon: <BookOutlined />, label: '专业管理' },
      { key: '/info/roles', icon: <SafetyOutlined />, label: '角色权限' },
      { key: '/info/courses', icon: <BookOutlined />, label: '课程信息' },
      { key: '/info/curriculums', icon: <BookOutlined />, label: '培养方案' },
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
      { key: '/selection/curriculum', icon: <BookOutlined />, label: '培养方案' },
      { key: '/selection/timetable', icon: <CalendarOutlined />, label: '我的课表' },
      { key: '/selection/ai', icon: <RobotOutlined />, label: 'AI 推荐' },
      { key: '/selection/admin/periods', icon: <SettingOutlined />, label: '阶段管理' },
      { key: '/selection/admin/manual-enrollment', icon: <UserOutlined />, label: '手动加课' },
      { key: '/selection/teacher/roster', icon: <TeamOutlined />, label: '课程名单' },
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
      { key: '/exam/ping', icon: <ApiOutlined />, label: '联调验证' },
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
      { key: '/grade/approval', icon: <CheckCircleOutlined />, label: '改分审批' },
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
  const menuItems = MENU_ITEMS.map((item): MenuItem => {
    if (item.key === 'forum' && 'children' in item) {
      return { ...item, children: getForumChildren(roles) };
    }
    return item;
  });

  return filterMenuItemsByRole(menuItems, roles);
}

/** 是否可导出论坛统计（供页面内按钮使用） */
export function canExportForumStats(roles: string[]) {
  return hasAnyRole(roles, FORUM_EXPORT_ROLES);
}
