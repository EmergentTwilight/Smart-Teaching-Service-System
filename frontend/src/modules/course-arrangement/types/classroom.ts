/**
 * 教室管理相关的类型定义
 */

// 教室类型枚举 
export type RoomType = 'lecture' | 'lab' | 'computer' | 'multimedia';

// 教室状态枚举 
export type RoomStatus = 'available' | 'maintenance' | 'unavailable';

// 教室设备信息 (可扩展的 JSONB 结构) 
export interface Equipment {
  projector?: boolean;
  airConditioner?: boolean;
  microphone?: boolean;
  computerCount?: number;
  [key: string]: any; // 允许后端扩展其他字段
}

// 教室实体 
export interface Classroom {
  id: string;
  building: string;
  roomNumber: string;
  campus: string;
  capacity: number;
  roomType: RoomType;
  equipment: Equipment;
  status: RoomStatus;
}

// 教室查询参数 
export interface ClassroomQueryParams {
  page?: number;
  pageSize?: number;
  campus?: string;
  building?: string;
  roomType?: string;
  status?: string;
  keyword?: string;
}

// 分页返回结构 
export interface PaginatedClassrooms {
  items: Classroom[];
  page: number;
  pagination: {
    page_size: number;
    total: number;
    total_pages: number;
  };
}