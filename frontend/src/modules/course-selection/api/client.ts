import request from '@/shared/utils/request';
import type { AxiosRequestConfig } from 'axios';

const unwrapData = <T>(promise: Promise<unknown>): Promise<T> => promise as Promise<T>;

const courseSelectionRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.get<T>(url, config)),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.post<T>(url, data, config)),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.patch<T>(url, data, config)),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.put<T>(url, data, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.delete<T>(url, config)),
};

export { courseSelectionRequest };
