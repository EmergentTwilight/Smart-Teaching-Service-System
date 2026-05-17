import request from '@/shared/utils/request';
import type { AxiosRequestConfig } from 'axios';

const unwrapData = <T>(promise: Promise<unknown>): Promise<T> => promise as Promise<T>;

const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const convertKeysToSnakeCase = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeysToSnakeCase(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        toSnakeCase(key),
        convertKeysToSnakeCase(nestedValue),
      ])
    );
  }

  return value;
};

const normalizeConfig = (config?: AxiosRequestConfig): AxiosRequestConfig | undefined => {
  if (!config?.params) {
    return config;
  }

  return {
    ...config,
    params: convertKeysToSnakeCase(config.params),
  };
};

const courseSelectionRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.get<T>(url, normalizeConfig(config))),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.post<T>(url, convertKeysToSnakeCase(data), normalizeConfig(config))),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.patch<T>(url, convertKeysToSnakeCase(data), normalizeConfig(config))),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.put<T>(url, convertKeysToSnakeCase(data), normalizeConfig(config))),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrapData<T>(request.delete<T>(url, normalizeConfig(config))),
};

export { courseSelectionRequest };
