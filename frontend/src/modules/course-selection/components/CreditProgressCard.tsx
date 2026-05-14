import { Card, List, Progress, Typography } from 'antd';
import { type FC } from 'react';
import type { CurriculumProgress } from '../types/curriculum';

const { Text } = Typography;

interface CreditProgressCardProps {
  progress: CurriculumProgress | null;
}

// TODO(C1, FR-C-05, NFR-C-06, NFR-C-07): 学分进展卡片应展示必修/选修/公共课进度并可复用到选课页与培养方案页
// - 目前为骨架，待补齐来源课程类型的进度占比；
// - 显示不应只依赖前端估算，必须基于后端 progress 统一返回。
export const CreditProgressCard: FC<CreditProgressCardProps> = ({ progress }) => {
  if (!progress) {
    return (
      <Card title="学分进展">
        <Text type="secondary">数据待补齐：C1 FR-C-05 TODO</Text>
      </Card>
    );
  }

  const totalRatio = Math.round(progress.totalCreditRatio * 100);
  return (
    <Card title="学分进展">
      <List
        size="small"
        dataSource={[
          { label: '总学分', value: progress.totalSelectedCredits },
          { label: '必修', value: progress.requiredSelectedCredits },
          { label: '选修', value: progress.electiveSelectedCredits },
          { label: '公共课', value: progress.generalSelectedCredits },
        ]}
        renderItem={(item) => (
          <List.Item>
            <Text>{item.label}：</Text>
            <Text strong>{item.value} 学分</Text>
          </List.Item>
        )}
      />
      <div style={{ marginTop: 12 }}>
        <Text>总进度：{totalRatio}%</Text>
        <Progress percent={totalRatio} />
      </div>
    </Card>
  );
};
