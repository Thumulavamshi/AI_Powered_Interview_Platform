import React from 'react';
import { Card, Typography, Space, Tag, Badge, Progress, Row, Col, Timeline } from 'antd';
import { MessageOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { InterviewAnswer } from '../store/candidateSlice';
import type { ScoringResponse } from '../api/services';

const { Text, Paragraph, Title } = Typography;

interface InterviewQADisplayProps {
  answers: InterviewAnswer[];
  scoringResults?: ScoringResponse;
  isInterviewComplete: boolean;
  className?: string;
}

const InterviewQADisplay: React.FC<InterviewQADisplayProps> = ({
  answers,
  scoringResults,
  isInterviewComplete,
  className
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const formatDuration = (timestamp: string, previousTimestamp?: string) => {
    if (!previousTimestamp) return '';
    const current = new Date(timestamp).getTime();
    const previous = new Date(previousTimestamp).getTime();
    const seconds = Math.floor((current - previous) / 1000);
    return `${seconds}s`;
  };

  const getQuestionScore = (questionId: string) => {
    if (!scoringResults?.question_scores) return null;
    // Assuming questionId maps to index + 1 or we match by question text if needed
    // But ideally we should have a reliable ID. 
    // For now, let's try to find by question text or index if possible.
    // Since answers are in order, we can use the index.
    const index = answers.findIndex(a => a.questionId === questionId);
    if (index !== -1 && scoringResults.question_scores[index]) {
      return scoringResults.question_scores[index];
    }
    return null;
  };

  if (answers.length === 0) {
    return (
      <Card className={className} title="Interview Q&A">
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <MessageOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <div>No questions answered yet</div>
        </div>
      </Card>
    );
  }

  const timelineItems = answers.map((answer, index) => {
    const questionScore = getQuestionScore(answer.questionId);
    const duration = index > 0 ? formatDuration(answer.timestamp, answers[index - 1]?.timestamp) : '';

    return {
      dot: questionScore ? (
        <Badge count={Math.round(questionScore.total_score * 10)} style={{ backgroundColor: getScoreColor(questionScore.total_score * 10) }}>
          <CheckCircleOutlined style={{ fontSize: '16px', color: getScoreColor(questionScore.total_score * 10) }} />
        </Badge>
      ) : (
        <ClockCircleOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
      ),
      children: (
        <div style={{ marginBottom: '20px' }}>
          {/* Question Header */}
          <div style={{ marginBottom: '12px' }}>
            <Space wrap>
              <Text strong>Q{index + 1}:</Text>
              <Tag color={getDifficultyColor(answer.difficulty || 'medium')}>
                {(answer.difficulty || 'medium').toUpperCase()}
              </Tag>
              <Tag>{answer.category || 'General'}</Tag>
              {duration && (
                <Tag icon={<ClockCircleOutlined />} color="blue">
                  {duration}
                </Tag>
              )}
            </Space>
          </div>

          {/* Question */}
          <Paragraph style={{ marginBottom: '12px', fontWeight: 500 }}>
            {answer.question}
          </Paragraph>

          {/* Answer */}
          <Card size="small" style={{ backgroundColor: '#fafafa', marginBottom: '12px' }}>
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {answer.answer}
            </Paragraph>
          </Card>

          {/* Scoring Details */}
          {questionScore && (
            <Card
              size="small"
              style={{
                borderLeft: `4px solid ${getScoreColor(questionScore.total_score * 10)}`,
                marginTop: '8px'
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <Space>
                  <Text strong>Score:</Text>
                  <Progress
                    percent={questionScore.total_score * 10}
                    size="small"
                    strokeColor={getScoreColor(questionScore.total_score * 10)}
                    style={{ width: '100px' }}
                  />
                  <Text style={{ color: getScoreColor(questionScore.total_score * 10), fontWeight: 'bold' }}>
                    {questionScore.total_score}/10
                  </Text>
                </Space>
              </div>

              {questionScore.feedback && (
                <Paragraph style={{ margin: '8px 0', fontSize: '13px' }}>
                  <Text type="secondary">{questionScore.feedback}</Text>
                </Paragraph>
              )}

              <Row gutter={16}>
                <Col span={12}>
                  <Text strong style={{ fontSize: '12px', color: '#52c41a' }}>Key Points Covered:</Text>
                  <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                    {questionScore.key_points_covered.map((point, i) => (
                      <li key={i} style={{ fontSize: '12px' }}>{point}</li>
                    ))}
                  </ul>
                </Col>
                <Col span={12}>
                  <Text strong style={{ fontSize: '12px', color: '#ff4d4f' }}>Key Points Missed:</Text>
                  <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                    {questionScore.key_points_missed.map((point, i) => (
                      <li key={i} style={{ fontSize: '12px' }}>{point}</li>
                    ))}
                  </ul>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      ),
    };
  });

  return (
    <Card
      className={className}
      title={
        <Space>
          <MessageOutlined />
          Interview Q&A
          {isInterviewComplete && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Completed
            </Tag>
          )}
        </Space>
      }
      extra={
        scoringResults && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Overall Score</div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: getScoreColor(scoringResults.final_score.overall_score)
            }}>
              {Math.round(scoringResults.final_score.overall_score)}/100
            </div>
          </div>
        )
      }
    >
      <Timeline items={timelineItems} />

      {scoringResults && (
        <Card
          size="small"
          title="Interview Summary"
          style={{ marginTop: '16px', backgroundColor: '#f6ffed' }}
        >
          <Paragraph>
            <Text strong>Recommendation:</Text> {scoringResults.recommendation}
          </Paragraph>
          <Paragraph>
            <Text strong>Overall Feedback:</Text> {scoringResults.overall_feedback}
          </Paragraph>
          <Row gutter={16}>
            <Col span={12}>
              <Title level={5} style={{ fontSize: '14px' }}>Strengths</Title>
              <ul>
                {scoringResults.strengths_summary.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Col>
            <Col span={12}>
              <Title level={5} style={{ fontSize: '14px' }}>Areas for Improvement</Title>
              <ul>
                {scoringResults.areas_for_improvement.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Col>
          </Row>
        </Card>
      )}
    </Card>
  );
};

export default InterviewQADisplay;