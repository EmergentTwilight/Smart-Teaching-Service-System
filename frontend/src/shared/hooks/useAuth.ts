/**
 * 认证 Hook
 * 封装登录、登出等认证操作
 */
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { authApi } from '@/modules/info-management/api/auth';
import { useAuthStore } from '@/shared/stores/authStore';
import type { LoginRequest } from '@/shared/types';

/**
 * 认证 Hook
 * 提供登录、登出和用户状态管理
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const { token, user, isAuthenticated, setAuth, logout } = useAuthStore();

  // 登录
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      message.success('登录成功');
      navigate('/');
    },
    onError: (error: Error) => {
      message.error(error.message || '登录失败，请检查用户名和密码');
    },
  });

  // 登出
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 忽略登出错误
    } finally {
      logout();
      message.success('已退出登录');
      navigate('/login');
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    login: loginMutation.mutate,
    loginLoading: loginMutation.isPending,
    logout: handleLogout,
  };
};
