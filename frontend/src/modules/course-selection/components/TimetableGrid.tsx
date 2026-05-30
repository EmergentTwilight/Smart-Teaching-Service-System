import { Alert, Card, Empty, Tag, Typography } from 'antd';
import { type FC } from 'react';
import type { TimetableSlot } from '../types/enrollment';
import { EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const MAX_PERIOD = 13; // assume max 13 periods per day

interface TimetableGridProps {
  slots?: TimetableSlot[];
  loading?: boolean;
  semesterName?: string;
  missingScheduleItems?: Array<{
    courseOfferingId: string;
    courseName: string;
    message: string;
  }>;
}

const COURSE_COLORS = [
  '#1677ff', '#52c41a', '#fa8c16', '#722ed1',
  '#eb2f96', '#13c2c2', '#f5222d', '#2f54eb',
  '#faad14', '#a0d911',
];

/**
 * Assign a consistent color to each unique course_offering_id.
 */
function useCourseColorMap(slots: TimetableSlot[]): Map<string, string> {
  const ids = [...new Set(slots.map((s) => s.courseOfferingId))];
  const map = new Map<string, string>();
  ids.forEach((id, i) => {
    map.set(id, COURSE_COLORS[i % COURSE_COLORS.length]);
  });
  return map;
}

/**
 * TimetableGrid - 课表网格化展示
 *
 * 覆盖需求：FR-C-25, NFR-C-08
 * - 依据 day_of_week / start_period / end_period 渲染课程到网格
 * - 课程无排课时在 missing 区域提示
 * - 与后端 /timetable/me 一致，不从前端缓存推导
 * - 支持 print 媒体查询样式
 */
export const TimetableGrid: FC<TimetableGridProps> = ({
  slots = [],
  semesterName,
  missingScheduleItems = [],
}) => {
  const colorMap = useCourseColorMap(slots);

  // Build a 2D grid: rows = periods (1-indexed), cols = days (1-indexed)
  const grid: (TimetableSlot | null)[][] = Array.from({ length: MAX_PERIOD }, () =>
    Array.from({ length: 7 }, () => null)
  );

  for (const slot of slots) {
    const dayIdx = slot.dayOfWeek - 1;
    const startRow = slot.startPeriod - 1;
    if (dayIdx < 0 || dayIdx >= 7 || startRow < 0 || startRow >= MAX_PERIOD) continue;
    grid[startRow][dayIdx] = slot;
  }

  // Compute rowSpan for each slot
  const rowSpanGrid: number[][] = Array.from({ length: MAX_PERIOD }, () =>
    Array.from({ length: 7 }, () => 0)
  );
  for (const slot of slots) {
    const dayIdx = slot.dayOfWeek - 1;
    const startRow = slot.startPeriod - 1;
    const span = Math.max(1, slot.endPeriod - slot.startPeriod + 1);
    if (dayIdx < 0 || dayIdx >= 7 || startRow < 0 || startRow >= MAX_PERIOD) continue;
    for (let r = startRow; r < Math.min(startRow + span, MAX_PERIOD); r++) {
      rowSpanGrid[r][dayIdx] = 1; // mark cell as occupied
    }
  }

  return (
    <div className="timetable-grid-container">
      <Card
        title={`课表${semesterName ? `（${semesterName}）` : ''}`}
        styles={{ body: { padding: 12 } }}
        extra={
          slots.length > 0 ? (
            <Text type="secondary">{slots.length} 条排课记录</Text>
          ) : null
        }
      >
        {slots.length === 0 ? (
          <Empty description="当前未查询到已选课程课表数据。请先完成选课并确认课程已有排课安排。" />
        ) : (
          <div className="timetable-grid">
            {/* Header row */}
            <div className="timetable-header-row">
              <div className="timetable-period-header"></div>
              {WEEK_DAYS.map((day) => (
                <div key={day} className="timetable-day-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Period rows */}
            {Array.from({ length: MAX_PERIOD }, (_, rowIdx) => {
              const isEmpty = grid[rowIdx].every((cell) => cell === null);
              // skip entirely empty rows but still show a condensed indicator
              if (isEmpty) {
                // Check if ANY slot spans across this row via rowSpanGrid
                const hasSpannedContent = rowSpanGrid[rowIdx].some((v) => v === 1);
                if (hasSpannedContent) return null; // spanned by a previous row's cell
                return null;
              }

              return (
                <div key={rowIdx} className="timetable-row">
                  <div className="timetable-period-label">
                    第{rowIdx + 1}节
                  </div>
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const slot = grid[rowIdx][dayIdx];
                    if (!slot) {
                      // Check if this cell is spanned
                      if (rowSpanGrid[rowIdx][dayIdx] === 1) return null;
                      return (
                        <div key={dayIdx} className="timetable-cell timetable-cell-empty" />
                      );
                    }

                    const span = Math.max(1, slot.endPeriod - slot.startPeriod + 1);
                    const color = colorMap.get(slot.courseOfferingId) ?? '#1677ff';

                    return (
                      <div
                        key={dayIdx}
                        className="timetable-cell timetable-cell-course"
                        style={{
                          gridRow: `span ${span}`,
                          borderLeftColor: color,
                          borderLeftWidth: 4,
                          borderLeftStyle: 'solid',
                        }}
                      >
                        <div className="timetable-course-name" style={{ color }}>
                          {slot.courseName}
                        </div>
                        <div className="timetable-course-meta">
                          <Text style={{ fontSize: 11, color: '#595959' }}>
                            {slot.teacherName}
                          </Text>
                        </div>
                        <div className="timetable-course-meta">
                          <ClockCircleOutlined style={{ fontSize: 10, marginRight: 2 }} />
                          <Text style={{ fontSize: 10, color: '#8c8c8c' }}>
                            {slot.startWeek}-{slot.endWeek} 周
                          </Text>
                        </div>
                        {slot.classroom ? (
                          <div className="timetable-course-meta">
                            <EnvironmentOutlined style={{ fontSize: 10, marginRight: 2 }} />
                            <Text style={{ fontSize: 10, color: '#8c8c8c' }} ellipsis>
                              {slot.classroom}
                            </Text>
                          </div>
                        ) : null}
                        <Tag
                          color={color}
                          style={{ marginTop: 4, fontSize: 10, lineHeight: '16px' }}
                        >
                          {slot.credits} 学分
                        </Tag>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ---- Missing schedule items ---- */}
      {missingScheduleItems.length > 0 ? (
        <Card title="暂无排课的课程" style={{ marginTop: 12 }}>
          {missingScheduleItems.map((item) => (
            <Alert
              key={item.courseOfferingId}
              type="warning"
              message={
                <span>
                  {item.courseName}：{item.message}
                </span>
              }
              showIcon
              style={{ marginBottom: 6 }}
            />
          ))}
        </Card>
      ) : null}

      {/* ---- Print styles ---- */}
      <style>{`
        @media print {
          .timetable-grid-container {
            width: 100%;
          }
          .timetable-grid {
            display: block;
          }
          .timetable-cell-course {
            border: 1px solid #d9d9d9 !important;
            background: #fff !important;
          }
          .timetable-course-name {
            color: #000 !important;
            font-weight: 600;
          }
        }
        .timetable-grid {
          display: block;
          width: 100%;
          overflow-x: auto;
        }
        .timetable-header-row {
          display: grid;
          grid-template-columns: 60px repeat(7, 1fr);
          gap: 2px;
          margin-bottom: 2px;
        }
        .timetable-period-header {
          padding: 4px;
          font-weight: 600;
          text-align: center;
          background: #fafafa;
          border-radius: 4px;
        }
        .timetable-day-header {
          padding: 6px 4px;
          font-weight: 600;
          text-align: center;
          background: #f0f5ff;
          border-radius: 4px;
          font-size: 13px;
        }
        .timetable-row {
          display: grid;
          grid-template-columns: 60px repeat(7, 1fr);
          gap: 2px;
          margin-bottom: 2px;
          min-height: 64px;
        }
        .timetable-period-label {
          padding: 4px;
          font-size: 11px;
          color: #8c8c8c;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          border-radius: 4px;
        }
        .timetable-cell {
          border-radius: 6px;
          min-height: 64px;
        }
        .timetable-cell-empty {
          background: #fafafa;
          border: 1px dashed #f0f0f0;
        }
        .timetable-cell-course {
          background: #fff;
          border: 1px solid #e8e8e8;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .timetable-course-name {
          font-weight: 600;
          font-size: 12px;
          line-height: 1.3;
          margin-bottom: 2px;
        }
        .timetable-course-meta {
          display: flex;
          align-items: center;
          margin-top: 1px;
        }
      `}</style>
    </div>
  );
};
