import { useState } from 'react';
import { Tabs, Card, Row, Col, Progress, Typography, Tag } from 'antd';
import ResumeUpload from '../components/ResumeUpload';
import InterviewChat from '../components/InterviewChat';
import { useAppSelector } from '../store/hooks';

const { Title, Paragraph, Text } = Typography;

const IntervieweePage = () => {
  const candidate = useAppSelector((state) => state.candidate);
  const [activeTab, setActiveTab] = useState('resume');

  // Handle interview completion and navigate back to resume tab
  const handleInterviewComplete = (score: number, summary: string) => {
    if (import.meta.env.DEV) {
      console.log('Interview completed:', { score, summary });
    }
    // The state is already updated in Redux by InterviewChat
    
    // Navigate back to resume tab after a short delay to show completion
    setTimeout(() => {
      setActiveTab('resume');
      setIsProfileSavedForInterview(false); // Reset for potential new interview
    }, 3000); // 3 seconds delay to show completion screen
  };

  const handleStartInterview = () => {
    setActiveTab('interview');
  };

  // Add state to track if profile was saved
  const [isProfileSavedForInterview, setIsProfileSavedForInterview] = useState(false);

  const handleProfileSaved = () => {
    setIsProfileSavedForInterview(true);
  };

  const tabItems = [
    {
      key: 'resume',
      label: 'Resume Upload',
      children: <ResumeUpload onStartInterview={handleStartInterview} onProfileSaved={handleProfileSaved} />,
    },
    {
      key: 'interview',
      label: 'Interview',
      disabled: !candidate.isProfileComplete || !isProfileSavedForInterview,
      children: <InterviewChat onInterviewComplete={handleInterviewComplete} />,
    }
  ];

  // If interview is complete, show results
  if (candidate.interviewProgress.isComplete && candidate.interviewProgress.scoringResults) {
    const { scoringResults } = candidate.interviewProgress;

    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card title={<Title level={2}>Interview Results</Title>} bordered={false}>
          <Row gutter={[24, 24]}>
            {/* Overall Score */}
            <Col span={24} md={8}>
              <Card type="inner" title="Overall Score">
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={scoringResults.final_score.overall_score}
                    format={(percent) => `${percent}/100`}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    size={180}
                  />
                  <Title level={4} style={{ marginTop: '16px' }}>
                    {scoringResults.final_score.overall_score >= 70 ? 'Passed' : 'Needs Improvement'}
                  </Title>
                </div>
              </Card>
            </Col>

            {/* Summary & Feedback */}
            <Col span={24} md={16}>
              <Card type="inner" title="Feedback & Recommendation">
                <Paragraph>
                  <Text strong>Recommendation:</Text> {scoringResults.recommendation}
                </Paragraph>
                <Paragraph>
                  <Text strong>Overall Feedback:</Text> {scoringResults.overall_feedback}
                </Paragraph>

                <Row gutter={16}>
                  <Col span={12}>
                    <Title level={5}>Strengths</Title>
                    <ul>
                      {scoringResults.strengths_summary.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </Col>
                  <Col span={12}>
                    <Title level={5}>Areas for Improvement</Title>
                    <ul>
                      {scoringResults.areas_for_improvement.map((area, i) => (
                        <li key={i}>{area}</li>
                      ))}
                    </ul>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Question Breakdown */}
            <Col span={24}>
              <Title level={3}>Question Breakdown</Title>
              {scoringResults.question_scores.map((qScore, index) => (
                <Card
                  key={index}
                  type="inner"
                  title={`Question ${index + 1}: ${qScore.question}`}
                  extra={<Tag color={qScore.score >= 7 ? 'green' : qScore.score >= 4 ? 'orange' : 'red'}>Score: {qScore.score}/10</Tag>}
                  style={{ marginBottom: '16px' }}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Text strong>Your Answer:</Text>
                      <Paragraph style={{ fontStyle: 'italic', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                        {qScore.candidate_answer || "No answer provided"}
                      </Paragraph>
                    </Col>
                    <Col span={24}>
                      <Text strong>Feedback:</Text> {qScore.feedback}
                    </Col>
                    <Col span={12}>
                      <Text strong>Key Points Covered:</Text>
                      <ul>
                        {qScore.key_points_covered.length > 0 ? (
                          qScore.key_points_covered.map((point, i) => <li key={i} style={{ color: 'green' }}>{point}</li>)
                        ) : (
                          <li>None</li>
                        )}
                      </ul>
                    </Col>
                    <Col span={12}>
                      <Text strong>Key Points Missed:</Text>
                      <ul>
                        {qScore.key_points_missed.length > 0 ? (
                          qScore.key_points_missed.map((point, i) => <li key={i} style={{ color: 'red' }}>{point}</li>)
                        ) : (
                          <li>None</li>
                        )}
                      </ul>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Col>
          </Row>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default IntervieweePage;