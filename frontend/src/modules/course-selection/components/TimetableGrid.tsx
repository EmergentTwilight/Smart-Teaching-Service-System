import { Card, Col, Empty, Row, Tag } from 'antd';
import { type FC } from 'react';
import type { TimetableSlot } from '../types/enrollment';

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface TimetableGridProps {
  slots?: TimetableSlot[];
  loading?: boolean;
  semesterName?: string;
}

/**
 * TODO(C4, FR-C-25, NFR-C-08): 支持课表网格化展示
 * - 依据 day_of_week / start_period / end_period 渲染到网格；
 * - 课程无课时安排时保留到 missing 列并给出提示；
 * - 与后端 /timetable/me 一致，不从前端缓存推导。
 */
export const TimetableGrid: FC<TimetableGridProps> = ({ slots = [], semesterName }) => {
  const byDay = slots.reduce<Record<number, TimetableSlot[]>>((acc, slot) => {
    const key = slot.dayOfWeek;
    acc[key] = acc[key] ? [...acc[key], slot] : [slot];
    return acc;
  }, {});

  return (
    <Card title={`课表${semesterName ? `（${semesterName}）` : ''}`} styles={{ body: { padding: 16 } }}>
      {slots.length === 0 ? (
        <Empty description="当前未查询到已选课程课表数据" />
      ) : (
        <Row gutter={[12, 12]}>
          {WEEK_DAYS.map((day, dayIndex) => {
            const daySlots = byDay[dayIndex + 1] || [];
            return (
              <Col xs={24} lg={12} xl={24 / 7} key={day}>
                <Card size="small" title={day} styles={{ body: { minHeight: 180 } }}>
                  {daySlots.length === 0 ? (
                    <div style={{ color: '#8c8c8c', fontSize: 13 }}>该日暂无课程</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {daySlots.map((slot) => (
                        <div
                          key={`${slot.enrollmentId}-${slot.dayOfWeek}-${slot.startPeriod}`}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{slot.courseName}</div>
                          <div style={{ marginTop: 4, color: '#595959', fontSize: 13 }}>
                            {slot.courseCode} · {slot.teacherName}
                          </div>
                          <Tag style={{ marginTop: 6 }}>
                            {slot.startWeek}-{slot.endWeek} 周 / {slot.startPeriod}-{slot.endPeriod} 节
                          </Tag>
                          {slot.classroom ? <Tag style={{ marginTop: 6 }}>{slot.classroom}</Tag> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Card>
  );
};
