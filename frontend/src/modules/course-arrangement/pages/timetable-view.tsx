/**
 * 课表查看页面
 * 提供按教室、按课程的直观周视图课表展现，支持课表导出下载
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Card, Select, Radio, Spin, Empty, Space, Button, Modal, Form, Input, InputNumber } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { timetablesApi, ExportTimetableParams } from '../api/timetables';
import { autoScheduleApi } from '../api/auto-schedule';
import type { OverviewStatsResponse } from '../types/rule.ts';
import type { Schedule } from '../types/schedule';

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
  const [selectedSemester, setSelectedSemester] = useState<string>();
  const [selectedClassroom, setSelectedClassroom] = useState<string>();
  const [selectedCourse, setSelectedCourse] = useState<string>();

  // 导出功能状态
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportForm] = Form.useForm<ExportTimetableParams>();

    // 概览统计数据
  const [overviewStats, setOverviewStats] = useState<OverviewStatsResponse | null>(null);

  // 挂载时拉取基础字典数据
  useEffect(() => {
    Promise.all([
      autoScheduleApi.getOverview().then(res => setOverviewStats(res)),
    ]).catch(() => {
    });
  }, []);

  // 根据概览统计生成学期和课程选项
  const semesterOptions = useMemo(() => {
    return overviewStats?.semesters || [];
  }, [overviewStats]);

  // 全部学期下的所有课程（并集）
  const allCourseOptions = useMemo(() => {
    if (!overviewStats?.semesters) return [];
    const courseMap = new Map<string, { id: string; name: string }>();
    overviewStats.semesters.forEach(sem => {
      sem.courseOfferings?.forEach(co => {
        if (!courseMap.has(co.id)) {
          courseMap.set(co.id, { id: co.id, name: co.name });
        }
      });
    });
    return Array.from(courseMap.values());
  }, [overviewStats]);

  // 触发课表数据拉取
  const fetchTimetable = async () => {
    setLoading(true);
    try {
      let data: Schedule[] = [];
      if (viewMode === 'comprehensive') {
        const res = await timetablesApi.getBySemester({ 
          semesterId: selectedSemester,
          classroomId: selectedClassroom,
          courseOfferingId: selectedCourse,
        });
        data = res.items
      } else if (viewMode === 'classroom') {
        if (selectedClassroom)
          data = await timetablesApi.getByClassroom(selectedClassroom);
      } else if (viewMode === 'course') {
        if (selectedCourse) {
          data = await timetablesApi.getByCourseOffering(selectedCourse);
        }
      }
      setSchedules(data);
    } catch  {
      // message.error('获取课表数据失败');
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

  // 处理导出逻辑
  const handleExport = async () => {
    try {
      const values = await exportForm.validateFields();
      setExporting(true);
      
      const blob = await timetablesApi.exportTimetable(values);
      
      // 创建隐藏的 a 标签触发下载
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const extension = values.format === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `timetable_${values.targetType}_${values.targetId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // message.success('导出成功');
      setExportModalVisible(false);
    } catch (error) {
      // 若非表单校验错误，则提示网络异常
      if (!(error as any).errorFields) {
        // message.error('导出失败，请检查参数或稍后重试');
      }
    } finally {
      setExporting(false);
    }
  };

  const openExportModal = () => {
    exportForm.resetFields();
    exportForm.setFieldsValue({
      format: 'pdf',
      semesterId: '2026-Spring', // 默认这学期
      targetType: viewMode === 'course' ? 'global' : 'classroom',
      targetId: viewMode === 'classroom' && selectedClassroom ? selectedClassroom : 'all',
    });
    setExportModalVisible(true);
  };

  /**
   * 核心转换逻辑：将扁平的 schedule 数组映射为 13(节次) x 7(星期) 的二维矩阵 
   */
  const gridData = useMemo(() => {
    const matrix: Array<Array<Schedule[]>> = Array.from({ length: TOTAL_PERIODS }, () => 
      Array.from({ length: 7 }, () => [])
    );

    schedules.forEach(schedule => {
      const dayIndex = schedule.dayOfWeek - 1; 
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
          第 {item.startWeek}-{item.endWeek} 周
        </div>
      </div>
    ));
  };

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
              <Radio.Button value="comprehensive">课表</Radio.Button>
              <Radio.Button value="classroom">按教室查看（教师）</Radio.Button>
              <Radio.Button value="course">按课程查看（教师）</Radio.Button>
            </Radio.Group>

            <Space>
  {/* 按学期查看：显示学期 + 教室 + 课程 综合筛选 */}
  {viewMode === 'comprehensive' && (
    <>
      <Select
        showSearch
        placeholder="请选择学期"
        style={{ width: 240 }}
        value={selectedSemester}
        onChange={setSelectedSemester}
      >
        {semesterOptions.map(sem => (
          <Option key={sem.id} value={sem.id}>{sem.name}</Option>
        ))}
      </Select>
      <Select
        showSearch
        placeholder="请选择教室"
        style={{ width: 240 }}
        value={selectedClassroom}
        onChange={setSelectedClassroom}
      >
        {overviewStats?.classrooms?.map(room => (
          <Option key={room.id} value={room.id}>{room.name}</Option>
        ))}
      </Select>
      <Select
        showSearch
        placeholder="请选择课程"
        style={{ width: 240 }}
        value={selectedCourse}
        onChange={setSelectedCourse}
      >
        {allCourseOptions.map(course => (
          <Option key={course.id} value={course.id}>{course.name}</Option>
        ))}
      </Select>
    </>
  )}

  {/* 按教室查看：仅显示教室筛选 */}
  {viewMode === 'classroom' && (
    <Select
      showSearch
      placeholder="请选择教室"
      style={{ width: 240 }}
      value={selectedClassroom}
      onChange={setSelectedClassroom}
    >
      {overviewStats?.classrooms?.map(room => (
        <Option key={room.id} value={room.id}>{room.name}</Option>
      ))}
    </Select>
  )}

  {/* 按课程查看：仅显示课程筛选（所有学期并集） */}
  {viewMode === 'course' && (
    <Select
      showSearch
      placeholder="请选择课程"
      style={{ width: 240 }}
      value={selectedCourse}
      onChange={setSelectedCourse}
    >
      {allCourseOptions.map(course => (
        <Option key={course.id} value={course.id}>{course.name}</Option>
      ))}
    </Select>
  )}
</Space>
          </Space>
          
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={openExportModal}
          >
            导出课表
          </Button>
        </div>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
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

      {/* 导出课表弹窗 */}
      <Modal
        title="导出课表"
        open={exportModalVisible}
        onOk={handleExport}
        onCancel={() => setExportModalVisible(false)}
        confirmLoading={exporting}
        okText="确认导出"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={exportForm} layout="vertical">
          <Form.Item name="semesterId" label="学期 ID" rules={[{ required: true, message: '请输入学期ID' }]}>
            <Input placeholder="例如：2026-Spring" />
          </Form.Item>
          <Form.Item name="targetType" label="导出维度" rules={[{ required: true }]}>
            <Select>
              <Option value="classroom">按教室</Option>
              <Option value="teacher">按教师</Option>
              <Option value="student">按学生</Option>
              <Option value="global">全校/全系</Option>
            </Select>
          </Form.Item>
          <Form.Item 
            name="targetId" 
            label="维度 ID" 
            rules={[{ required: true, message: '请输入对应维度的ID，全校可填all' }]}
            tooltip="如果是按教室，请填入教室ID；如果是全校，请填入 all"
          >
            <Input placeholder="输入目标 ID" />
          </Form.Item>
          <Space style={{ display: 'flex', width: '100%' }}>
            <Form.Item name="startWeek" label="起始周次">
              <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="选填" />
            </Form.Item>
            <Form.Item name="endWeek" label="结束周次">
              <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="选填" />
            </Form.Item>
            <Form.Item name="format" label="文件格式" rules={[{ required: true }]}>
              <Select style={{ width: 120 }}>
                <Option value="pdf">PDF</Option>
                <Option value="excel">Excel</Option>
              </Select>
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default TimetableView;