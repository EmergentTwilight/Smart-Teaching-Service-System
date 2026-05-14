import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Descriptions, Divider, Empty, Spin } from 'antd';
import { type FC } from 'react';
import type { CourseOfferingDetail } from '../types/course';
import { extractErrorMessage } from '@/shared/utils/error';

interface CourseDetailDrawerProps {
  open: boolean;
  offeringId: string | null;
  onClose: () => void;
  loadDetail: (offeringId: string) => Promise<CourseOfferingDetail>;
}

// TODO(C2, FR-C-11, FR-C-19, NFR-C-07): 详情抽屉需展示先修课程、排课信息和冲突风险
// - 详情来源于后端 /offerings/:id 查询结果；
// - 前端不得缓存/篡改课程状态和容量；
// - 加载失败应提示明确原因并引导重试。
export const CourseDetailDrawer: FC<CourseDetailDrawerProps> = ({
  open,
  offeringId,
  onClose,
  loadDetail,
}) => {
  const [detail, setDetail] = useState<CourseOfferingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open || !offeringId) {
      setDetail(null);
      setErrorMessage('');
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const result = await loadDetail(offeringId);
        setDetail(result);
      } catch (error: unknown) {
        setErrorMessage(extractErrorMessage(error, '课程详情加载失败，请重试'));
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [open, offeringId, loadDetail]);

  const scheduleText = detail?.schedules
    ?.map(
      (item) => `周${item.dayOfWeek} ${item.startWeek}-${item.endWeek}周 ${item.startPeriod}-${item.endPeriod}节`
    )
    .join('；');

  return (
    <Drawer title="课程详情" open={open} width={560} onClose={onClose}>
      {!offeringId ? (
        <Empty description="请选择课程查看详情" />
      ) : (
        <div>
          <Button size="small" onClick={() => {
            if (offeringId) {
              setLoading(true);
              setErrorMessage('');
              loadDetail(offeringId)
                .then((result) => {
                  setDetail(result);
                  setLoading(false);
                })
                .catch((error: unknown) => {
                  setErrorMessage(extractErrorMessage(error, '课程详情加载失败，请重试'));
                  setLoading(false);
                });
            }
          }}>
            刷新详情
          </Button>
          <Divider />
          {loading && <Spin style={{ margin: 12 }} />}
          {errorMessage && <Alert type="error" message={errorMessage} showIcon />}
          {detail ? (
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="课程名称">{detail.courseName}</Descriptions.Item>
              <Descriptions.Item label="课程代码">{detail.courseCode}</Descriptions.Item>
              <Descriptions.Item label="学分">{detail.credits}</Descriptions.Item>
              <Descriptions.Item label="教师">{detail.teacherName}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {detail.offeringStatus}
              </Descriptions.Item>
              <Descriptions.Item label="容量">
                {detail.enrolledCount} / {detail.capacity}
              </Descriptions.Item>
              <Descriptions.Item label="是否可选">
                {detail.isAvailable ? '可选' : '不可选'}
              </Descriptions.Item>
              {detail.description ? (
                <Descriptions.Item label="课程说明">{detail.description}</Descriptions.Item>
              ) : null}
              {scheduleText ? <Descriptions.Item label="课表">{scheduleText}</Descriptions.Item> : null}
              {detail.prerequisites.length ? (
                <Descriptions.Item label="先修课程">
                  {detail.prerequisites.map((item) => `${item.courseCode} ${item.courseName}`).join('；')}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          ) : !loading ? (
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="提示">课程详情待加载</Descriptions.Item>
            </Descriptions>
          ) : null}
        </div>
      )}
    </Drawer>
  );
};
