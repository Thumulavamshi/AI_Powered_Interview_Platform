import { useState } from 'react';
import { Layout, Tabs, Typography, Button } from 'antd';
import { RocketOutlined, HistoryOutlined } from '@ant-design/icons';
import IntervieweePage from './pages/IntervieweePage';
import InterviewerPage from './pages/InterviewerPage';
import StartNewInterviewButton from './components/StartNewInterviewButton';
import SavedInterviewsButton from './components/SavedInterviewsButton';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { setCurrentTab } from './store/sessionSlice';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const [activeTab, setActiveTab] = useState<string>(session.currentTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    dispatch(setCurrentTab(key as 'interviewee' | 'interviewer'));
  };

  const tabItems = [
    {
      key: 'interviewee',
      label: (
        <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RocketOutlined /> Candidate View
        </span>
      ),
      children: <IntervieweePage />,
    },
    {
      key: 'interviewer',
      label: (
        <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HistoryOutlined /> Interviewer Dashboard
        </span>
      ),
      children: <InterviewerPage />,
    },
  ];

  return (
    <div className="app">
      <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
        <Header
          style={{
            background: 'var(--card-bg)',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 32px',
            height: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              AI
            </div>
            <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
              Interview Platform
            </Title>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <SavedInterviewsButton />
            <StartNewInterviewButton />
          </div>
        </Header>
        <Content style={{
          padding: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="animate-fade-in" style={{ flex: 1 }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              size="large"
              style={{ height: '100%' }}
              tabBarStyle={{ marginBottom: '24px' }}
            />
          </div>
        </Content>
      </Layout>
    </div>
  );
}

export default App;
