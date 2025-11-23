import { useState } from 'react';
import { Upload, Button, Form, Input, Space, message, Alert, Tag, Typography, Row, Col, Divider } from 'antd';
import {
  CloudUploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  DeleteOutlined,
  FileTextOutlined,
  BankOutlined,
  RocketOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCandidateId, setProfile, updateProfile, setResumeFile, setResumeData, clearCandidate } from '../store/candidateSlice';
import { setLastActiveCandidateId } from '../store/sessionSlice';
import type { CandidateProfile } from '../store/candidateSlice';
import { uploadResume } from '../api/services';

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

// Utility function to safely handle arrays and descriptions
const safeArrayMap = <T,>(data: T | T[] | undefined | null): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return [data];
};

interface ResumeUploadProps {
  onStartInterview?: () => void;
}

const ResumeUpload = ({ onStartInterview }: ResumeUploadProps = {}) => {
  const dispatch = useAppDispatch();
  const candidateState = useAppSelector((state) => state.candidate);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const validateMandatoryFields = (profile: CandidateProfile) => {
    const missing = [];
    if (!profile.name || profile.name.trim() === '') missing.push('name');
    if (!profile.email || profile.email.trim() === '') missing.push('email');
    if (!profile.phone || profile.phone.trim() === '') missing.push('phone');
    return missing;
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;

    try {
      setUploading(true);

      const base64 = await fileToBase64(file as File);
      const response = await uploadResume(file as File);

      dispatch(setCandidateId(response.candidateId));
      dispatch(setProfile(response.extracted));
      dispatch(setResumeFile({
        name: response.fileName,
        size: response.fileSize,
        type: (file as File).type
      }));
      dispatch(setResumeData({
        path: response.fileName,
        text: response.resumeText,
        base64: base64
      }));

      dispatch(setLastActiveCandidateId(response.candidateId));
      setUploadedFile(file as UploadFile);
      form.setFieldsValue(response.extracted);

      const missing = validateMandatoryFields(response.extracted);
      setMissingFields(missing);

      if (missing.length > 0) {
        message.warning(`Please fill in the missing mandatory fields: ${missing.join(', ')}`);
      } else {
        message.success('Resume uploaded and processed successfully!');
      }

      onSuccess?.(response);
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to process resume';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      }
      message.error(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file: UploadFile) => {
    const isValidType = file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isValidType) {
      message.error('Please upload only PDF or DOCX files!');
      return false;
    }
    const isLt5M = (file.size || 0) / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('File must be smaller than 5MB!');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async (values: CandidateProfile) => {
    try {
      const missing = validateMandatoryFields(values);
      setMissingFields(missing);

      if (missing.length > 0) {
        message.error(`Please fill in the missing mandatory fields: ${missing.join(', ')}`);
        return;
      }

      dispatch(updateProfile(values));
      message.success('Profile saved successfully!');
    } catch {
      message.error('Failed to save profile');
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    dispatch(clearCandidate());
    setMissingFields([]);
    form.resetFields();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Upload Section */}
      <div className="card mb-4" style={{ textAlign: 'center' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>
          Upload Your Resume
        </Title>

        {!uploadedFile ? (
          <Dragger
            accept=".pdf,.docx"
            showUploadList={false}
            customRequest={handleUpload}
            beforeUpload={beforeUpload}
            maxCount={1}
            style={{
              padding: '40px',
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px'
            }}
          >
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined style={{ color: 'var(--primary-color)', fontSize: '48px' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: '18px', fontWeight: 500 }}>
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint" style={{ color: 'var(--text-secondary)' }}>
              Support for PDF or DOCX files (Max 5MB)
            </p>
          </Dragger>
        ) : (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <FileTextOutlined style={{ fontSize: '32px', color: 'var(--success-color)' }} />
              <div style={{ textAlign: 'left' }}>
                <Text strong style={{ fontSize: '16px', display: 'block' }}>{uploadedFile.name}</Text>
                <Text type="secondary">Resume uploaded successfully</Text>
              </div>
            </div>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemoveFile}
            >
              Remove
            </Button>
          </div>
        )}

        {uploading && (
          <div style={{ marginTop: '24px' }}>
            <Text type="secondary">Parsing resume data... Please wait.</Text>
          </div>
        )}
      </div>

      {/* Extracted Data Section */}
      {candidateState.profile && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveProfile}
          initialValues={candidateState.profile}
        >
          <div className="animate-fade-in">
            {/* Personal Info Card */}
            <div className="card mb-4">
              <div className="flex-between mb-4">
                <Title level={4} style={{ margin: 0 }}>
                  <UserOutlined /> Personal Information
                </Title>
                {missingFields.length > 0 && (
                  <Tag color="error" icon={<ExclamationCircleOutlined />}>
                    Missing Required Fields
                  </Tag>
                )}
              </div>

              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item
                    label="Full Name"
                    name="name"
                    rules={[{ required: true, message: 'Required' }]}
                    validateStatus={missingFields.includes('name') ? 'error' : ''}
                  >
                    <Input prefix={<UserOutlined />} size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[{ required: true, message: 'Required' }]}
                    validateStatus={missingFields.includes('email') ? 'error' : ''}
                  >
                    <Input prefix={<MailOutlined />} size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Phone"
                    name="phone"
                    rules={[{ required: true, message: 'Required' }]}
                    validateStatus={missingFields.includes('phone') ? 'error' : ''}
                  >
                    <Input prefix={<PhoneOutlined />} size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider dashed />

              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item label="LinkedIn" name="linkedin">
                    <Input prefix={<LinkOutlined />} placeholder="LinkedIn URL" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="GitHub" name="github">
                    <Input prefix={<LinkOutlined />} placeholder="GitHub URL" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Website" name="website">
                    <Input prefix={<LinkOutlined />} placeholder="Portfolio URL" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Row gutter={24}>
              {/* Experience Column */}
              <Col span={12}>
                <div className="card mb-4" style={{ height: '100%' }}>
                  <Title level={4} style={{ marginBottom: '24px' }}>
                    <RocketOutlined /> Experience
                  </Title>
                  {candidateState.profile.experience && candidateState.profile.experience.length > 0 ? (
                    candidateState.profile.experience.map((exp, index) => (
                      <div key={index} style={{ marginBottom: '24px' }}>
                        <div className="flex-between">
                          <Text strong style={{ fontSize: '16px' }}>{exp.key}</Text>
                          <Tag>{exp.start} - {exp.end}</Tag>
                        </div>
                        {exp.description && (
                          <ul style={{ paddingLeft: '20px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                            {safeArrayMap(exp.description).slice(0, 3).map((desc, i) => (
                              <li key={i}>{String(desc)}</li>
                            ))}
                          </ul>
                        )}
                        {index < (candidateState.profile.experience?.length || 0) - 1 && <Divider style={{ margin: '16px 0' }} />}
                      </div>
                    ))
                  ) : (
                    <Text type="secondary">No experience found</Text>
                  )}
                </div>
              </Col>

              {/* Projects & Education Column */}
              <Col span={12}>
                {/* Projects */}
                <div className="card mb-4">
                  <Title level={4} style={{ marginBottom: '24px' }}>
                    <TrophyOutlined /> Projects
                  </Title>
                  {candidateState.profile.projects && candidateState.profile.projects.length > 0 ? (
                    candidateState.profile.projects.map((proj, index) => (
                      <div key={index} style={{ marginBottom: '16px' }}>
                        <Text strong>{proj.title}</Text>
                        <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ margin: 0 }}>
                          {safeArrayMap(proj.description).join(' ')}
                        </Paragraph>
                      </div>
                    ))
                  ) : (
                    <Text type="secondary">No projects found</Text>
                  )}
                </div>

                {/* Education */}
                <div className="card mb-4">
                  <Title level={4} style={{ marginBottom: '24px' }}>
                    <BankOutlined /> Education
                  </Title>
                  {candidateState.profile.education && candidateState.profile.education.length > 0 ? (
                    candidateState.profile.education.map((edu, index) => (
                      <div key={index} style={{ marginBottom: '8px' }}>
                        <Text strong>{edu.institution}</Text>
                      </div>
                    ))
                  ) : (
                    <Text type="secondary">No education found</Text>
                  )}
                </div>

                {/* Skills */}
                <div className="card">
                  <Title level={4} style={{ marginBottom: '24px' }}>
                    Skills
                  </Title>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {candidateState.profile.skills && candidateState.profile.skills.length > 0 ? (
                      candidateState.profile.skills.map((skill, index) => (
                        <Tag key={index} color="blue" style={{ padding: '4px 12px', borderRadius: '16px' }}>
                          {skill}
                        </Tag>
                      ))
                    ) : (
                      <Text type="secondary">No skills found</Text>
                    )}
                  </div>
                </div>
              </Col>
            </Row>

            {/* Action Buttons */}
            <div style={{ textAlign: 'right', marginTop: '24px', paddingBottom: '40px' }}>
              <Space size="large">
                <Button size="large" onClick={handleRemoveFile}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  disabled={missingFields.length > 0}
                  style={{ minWidth: '150px' }}
                >
                  Save Profile
                </Button>
                {missingFields.length === 0 && candidateState.isProfileComplete && (
                  <Button
                    size="large"
                    type="primary"
                    style={{
                      background: 'var(--success-color)',
                      borderColor: 'var(--success-color)',
                      minWidth: '200px'
                    }}
                    onClick={onStartInterview}
                  >
                    Start Interview <RocketOutlined />
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </Form>
      )}
    </div>
  );
};

export default ResumeUpload;