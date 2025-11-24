import React from 'react';
import { Card, Button, Space, Typography, Tag, Divider } from 'antd';
import { DownloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { APILogger } from '../utils/apiLogger';

const { Text } = Typography;

interface APIDebugPanelProps {
  className?: string;
  style?: React.CSSProperties;
}

const APIDebugPanel: React.FC<APIDebugPanelProps> = ({ className, style }) => {
  const [logs, setLogs] = React.useState<Record<string, unknown[]>>({});

  React.useEffect(() => {
    const updateLogs = () => {
      const allLogs = APILogger.getLogs();
      setLogs(typeof allLogs === 'object' && !Array.isArray(allLogs) ? allLogs : {});
    };
    
    // Update logs every 2 seconds
    const interval = setInterval(updateLogs, 2000);
    updateLogs(); // Initial load
    
    return () => clearInterval(interval);
  }, []);

  const getLogCounts = () => {
    const counts = {
      'parse-resume': logs['parse-resume']?.length || 0,
      'generate-questions': logs['generate-questions']?.length || 0,
      'score-answers': logs['score-answers']?.length || 0,
    };
    return counts;
  };

  const logCounts = getLogCounts();
  const totalCalls = Object.values(logCounts).reduce((sum: number, count) => sum + (count as number), 0);

  return (
    <Card 
      className={className}
      style={style}
      title={
        <Space>
          <EyeOutlined />
          API Debug Panel
          <Tag color="blue">{totalCalls} Total Calls</Tag>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* API Call Statistics */}
        <div>
          <Text strong>API Call Counts:</Text>
          <div style={{ marginTop: '8px' }}>
            <Space wrap>
              <Tag color={logCounts['parse-resume'] > 0 ? 'green' : 'default'}>
                Parse Resume: {logCounts['parse-resume']}
              </Tag>
              <Tag color={logCounts['generate-questions'] > 0 ? 'orange' : 'default'}>
                Generate Questions: {logCounts['generate-questions']}
              </Tag>
              <Tag color={logCounts['score-answers'] > 0 ? 'purple' : 'default'}>
                Score Answers: {logCounts['score-answers']}
              </Tag>
            </Space>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Download Buttons */}
        <div>
          <Text strong>Download Logs:</Text>
          <div style={{ marginTop: '8px' }}>
            <Space wrap>
              <Button 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => APILogger.downloadLogs('parse-resume')}
                disabled={logCounts['parse-resume'] === 0}
              >
                Parse Resume ({logCounts['parse-resume']})
              </Button>
              <Button 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => APILogger.downloadLogs('generate-questions')}
                disabled={logCounts['generate-questions'] === 0}
              >
                Generate Questions ({logCounts['generate-questions']})
              </Button>
              <Button 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => APILogger.downloadLogs('score-answers')}
                disabled={logCounts['score-answers'] === 0}
              >
                Score Answers ({logCounts['score-answers']})
              </Button>
            </Space>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Button 
              type="primary" 
              size="small" 
              icon={<DownloadOutlined />}
              onClick={() => APILogger.downloadAllLogs()}
              disabled={totalCalls === 0}
            >
              Download All Logs
            </Button>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Clear Buttons */}
        <div>
          <Text strong>Clear Logs:</Text>
          <div style={{ marginTop: '8px' }}>
            <Space wrap>
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => {
                  APILogger.clearLogs();
                  setLogs({});
                }}
                disabled={totalCalls === 0}
              >
                Clear All
              </Button>
            </Space>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f6f8fa', borderRadius: '4px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 <strong>Instructions:</strong><br/>
            • API responses are automatically logged when you use the app<br/>
            • Files are saved as JSON with timestamps and call details<br/>
            • Auto-download happens every 5th API call<br/>
            • Manual download saves individual or combined logs
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default APIDebugPanel;