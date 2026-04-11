/**
 * 课表查看页面
 * 提供按教室、按课程的直观周视图课表展现，避免前端大量二次聚合 
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Card, Select, Radio, Spin, Empty, Space } from 'antd';
import { timetablesApi } from '../api/timetables';
import { classroomsApi } from '../api/classrooms';
import type { Schedule } from '../types/schedule';
import type { Classroom } from '../types/classroom';

const { Option } = Select;

// 视图模式定义
type ViewMode = 'classroom' | 'course' | 'comprehensive';

// 节次常量定义 (默认一天最多13节)
const TOTAL_PERIODS = 13;
const DAYS_OF_WEEK = [
  { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
  { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' }, { value: 7, label: '周日' }
];

export const TimetableView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('classroom');
  const [loading, setLoading] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  
  // 筛选器状态
  const [selectedClassroom, setSelectedClassroom] = useState<string>();
  const [selectedCourse, setSelectedCourse] = useState<string>();
  
  // 基础数据字典
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // 挂载时拉取基础字典数据
  useEffect(() => {
    classroomsApi.getList({ pageSize: 1000 }).then(res => setClassrooms(res.items));
  }, []);

  // 触发课表数据拉取
  const fetchTimetable = async () => {
    setLoading(true);
    try {
      let data: Schedule[] = [];
      if (viewMode === 'classroom' && selectedClassroom) {
        data = await timetablesApi.getByClassroom(selectedClassroom);
      } else if (viewMode === 'course' && selectedCourse) {
        data = await timetablesApi.getByCourseOffering(selectedCourse);
      } else if (viewMode === 'comprehensive') {
        data = await timetablesApi.query({ classroomId: selectedClassroom, courseOfferingId: selectedCourse });
      }
      setSchedules(data);
    } catch (error) {
      console.error('课表拉取失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 当筛选条件变化时自动拉取
  useEffect(() => {
    if ((viewMode === 'classroom' && selectedClassroom) || 
        (viewMode === 'course' && selectedCourse) ||
        viewMode === 'comprehensive') {
      fetchTimetable();
    } else {
      setSchedules([]); // 清空试图
    }
  }, [viewMode, selectedClassroom, selectedCourse]);

  /**
   * 核心转换逻辑：将扁平的 schedule 数组映射为 13(节次) x 7(星期) 的二维矩阵 
   * 为什么这样设计？为了极大地简化 React 渲染逻辑，使得前端只需双重循环渲染 Table 即可。
   */
  const gridData = useMemo(() => {
    // 初始化 13 x 7 的空矩阵
    const matrix: Array<Array<Schedule[]>> = Array.from({ length: TOTAL_PERIODS }, () => 
      Array.from({ length: 7 }, () => [])
    );

    schedules.forEach(schedule => {
      // 周次映射到 0-6 索引
      const dayIndex = schedule.dayOfWeek - 1; 
      // 遍历该排课跨越的节次，填入矩阵
      for (let p = schedule.startPeriod; p <= schedule.endPeriod; p++) {
        const periodIndex = p - 1;
        if (periodIndex >= 0 && periodIndex < TOTAL_PERIODS) {
          matrix[periodIndex][dayIndex].push(schedule);
        }
      }
    });

    return matrix;
  }, [schedules]);

  // 渲染单个网格内的课程卡片
  const renderCellContent = (items: Schedule[]) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => (
      <div 
        key={item.id || idx} 
        style={{
          background: '#eef2ff',
          borderLeft: '4px solid #6366f1',
          padding: '6px',
          borderRadius: '4px',
          marginBottom: '4px',
          fontSize: '12px'
        }}
      >
        <div style={{ fontWeight: 600, color: '#1f2937' }}>
          {item.courseOffering?.courseName || item.courseOfferingId}
        </div>
        <div style={{ color: '#6b7280', marginTop: '2px' }}>
          {item.classroom ? `${item.classroom.building}-${item.classroom.roomNumber}` : item.classroomId}
        </div>
        <div style={{ color: '#6b7280' }}>
          {item.startWeek}-{item.endWeek} 周
        </div>
      </div>
    ));
  };

  return (
    <div className="fade-in">
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Radio.Group 
            value={viewMode} 
            onChange={e => {
              setViewMode(e.target.value);
              setSelectedClassroom(undefined);
              setSelectedCourse(undefined);
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="classroom">按教室查看</Radio.Button>
            <Radio.Button value="course">按课程查看</Radio.Button>
            <Radio.Button value="comprehensive">综合筛选</Radio.Button>
          </Radio.Group>

          <Space>
            {(viewMode === 'classroom' || viewMode === 'comprehensive') && (
              <Select
                showSearch
                placeholder="请选择教室"
                style={{ width: 240 }}
                value={selectedClassroom}
                onChange={setSelectedClassroom}
                optionFilterProp="children"
              >
                {classrooms.map(room => (
                  <Option key={room.id} value={room.id}>{room.building} - {room.roomNumber}</Option>
                ))}
              </Select>
            )}

            {(viewMode === 'course' || viewMode === 'comprehensive') && (
              <Select
                showSearch
                placeholder="请选择课程开设 (演示)"
                style={{ width: 240 }}
                value={selectedCourse}
                onChange={setSelectedCourse}
              >
                {/* 实际业务中这里接入课程开设数据 */}
                <Option value="course_math_101">高等数学</Option>
                <Option value="course_cs_201">数据结构</Option>
              </Select>
            )}
          </Space>
        </Space>
      </Card>

      <Card bordered={false} styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          {schedules.length === 0 && !loading ? (
            <Empty description="请选择筛选条件或当前维度下暂无课表" style={{ padding: '48px 0' }} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px', padding: '12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', textAlign: 'center' }}>节次</th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day.value} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', textAlign: 'center', width: '13%' }}>
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: TOTAL_PERIODS }).map((_, periodIdx) => (
                    <tr key={`period-${periodIdx}`}>
                      <td style={{ padding: '12px 8px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                        第 {periodIdx + 1} 节
                      </td>
                      {DAYS_OF_WEEK.map((_, dayIdx) => (
                        <td key={`cell-${periodIdx}-${dayIdx}`} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', verticalAlign: 'top' }}>
                          {renderCellContent(gridData[periodIdx][dayIdx])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default TimetableView;