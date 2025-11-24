import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Progress, Typography, Space, message, Tag, Row, Col } from 'antd';
import {
  AudioOutlined,
  ClockCircleOutlined,
  SoundOutlined,
  RightOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addAnswer, nextQuestion, completeInterview, startInterview as startInterviewAction } from '../store/candidateSlice';
import { generateQuestions, scoreAnswers } from '../api/services';
import type { GeneratedQuestion, GenerateQuestionsResponse, ParsedResumeData, ScoringPayload } from '../api/services';
import VoiceRecorder from './VoiceRecorder';
import { saveInterviewToStorage, createSavedInterviewFromState } from '../utils/interviewStorage';

const { Text, Title, Paragraph } = Typography;

interface InterviewChatProps {
  onInterviewComplete?: (score: number, summary: string) => void;
}

type InterviewState = 'IDLE' | 'GENERATING' | 'READING' | 'WAITING_TO_START' | 'RECORDING' | 'SUBMITTING' | 'SCORING' | 'COMPLETED';

const InterviewChat: React.FC<InterviewChatProps> = ({ onInterviewComplete }) => {
  const dispatch = useAppDispatch();
  const candidate = useAppSelector((state) => state.candidate);

  // State
  const [interviewState, setInterviewState] = useState<InterviewState>('IDLE');
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(0); // Used for both 30s and 120s timers
  const [answerText, setAnswerText] = useState('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // Refs
  const timerRef = useRef<number | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const answerTimesRef = useRef<number[]>([]); // To track time taken per question

  // Constants
  const START_TIMEOUT = 30; // 30 seconds to start recording
  const ANSWER_TIMEOUT = 120; // 120 seconds to answer

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopTTS();
    };
  }, []);

  // Timer Logic
  const startTimer = (duration: number, onComplete: () => void) => {
    stopTimer();
    setTimeLeft(duration);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // TTS Logic
  const playTTS = (text: string, isNewQuestion: boolean = false) => {
    stopTTS();
    console.log('PlayTTS called:', { text: text.substring(0, 50) + '...', isNewQuestion, currentState: interviewState });
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      
      utterance.onend = () => {
        console.log('TTS onend callback fired:', { isNewQuestion, currentState: interviewState });
        // Use setTimeout to ensure state updates are processed
        setTimeout(() => {
          if (isNewQuestion) {
            console.log('Transitioning to WAITING_TO_START');
            setInterviewState('WAITING_TO_START');
            startTimer(START_TIMEOUT, () => {
              message.warning('Time expired to start answer. Moving to next question.');
              handleSkipQuestion(); // This will save an answer and move to next question
            });
          }
        }, 100);
      };
      
      utterance.onerror = (error) => {
        console.error('TTS Error:', error);
        // If TTS fails and it's a new question, still transition to waiting state
        if (isNewQuestion) {
          console.log('TTS Error - transitioning to WAITING_TO_START');
          setTimeout(() => {
            setInterviewState('WAITING_TO_START');
            startTimer(START_TIMEOUT, () => {
              message.warning('Time expired to start answer. Moving to next question.');
              handleSkipQuestion(); // This will save an answer and move to next question
            });
          }, 100);
        }
      };
      
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      console.log('Speech synthesis not supported - fallback to waiting state');
      // Fallback for browsers without speech synthesis
      if (isNewQuestion) {
        setTimeout(() => {
          setInterviewState('WAITING_TO_START');
          startTimer(START_TIMEOUT, () => {
            message.warning('Time expired to start answer. Moving to next question.');
            handleSkipQuestion(); // This will save an answer and move to next question
          });
        }, 2000); // Give 2 seconds as if speech was playing
      }
    }
  };

  const stopTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Flow Control
  const handleStartInterview = async () => {
    if (!candidate.profile || !candidate.resumeText) {
      message.error('Please upload resume first.');
      return;
    }

    setInterviewState('GENERATING');

    try {
      // Use the FULL parsed resume data instead of reconstructed profile data
      let resumeData: ParsedResumeData;
      
      try {
        // The resumeText contains the full ParsedResumeData from the parse-resume API
        resumeData = JSON.parse(candidate.resumeText) as ParsedResumeData;
        console.log('🎯 Using FULL parsed resume data for question generation:', {
          candidateName: resumeData.personal_info?.name,
          personalInfo: resumeData.personal_info,
          skillsCategories: Object.keys(resumeData.skills || {}),
          experienceCount: resumeData.experience?.length || 0,
          projectsCount: resumeData.projects?.length || 0,
          technologiesInExperience: resumeData.experience?.map(exp => exp.technologies_used?.slice(0, 3)).flat().filter(Boolean) || [],
          allSkills: resumeData.skills,
          sampleExperience: resumeData.experience?.slice(0, 2).map(exp => ({
            company: exp.company,
            role: exp.role,
            technologies: exp.technologies_used?.slice(0, 3)
          })),
          sampleProjects: resumeData.projects?.slice(0, 2).map(proj => ({
            title: proj.title,
            technologies: proj.technologies?.slice(0, 3)
          }))
        });
      } catch (parseError) {
        console.warn('Failed to parse stored resume data, falling back to profile data:', parseError);
        // Fallback to the old method if JSON parsing fails
        resumeData = {
          personal_info: {
            name: candidate.profile.name || "not found",
            email: candidate.profile.email || "not found",
            phone: candidate.profile.phone || "not found",
            linkedin: candidate.profile.linkedin || null,
            github: candidate.profile.github || null,
            website: candidate.profile.website || null,
            location: null
          },
          education: candidate.profile.education?.map(edu => ({
            institution: edu.institution,
            degree: "not found",
            field_of_study: null,
            grade: null,
            start_date: "not found",
            end_date: null,
            achievements: null
          })) || [],
          experience: candidate.profile.experience?.map(exp => ({
            company: exp.key,
            role: "not found",
            start_date: exp.start,
            end_date: exp.end === 'Present' ? null : exp.end,
            duration: null,
            location: null,
            responsibilities: exp.description,
            technologies_used: [],
            key_achievements: null
          })) || [],
          projects: candidate.profile.projects?.map(proj => ({
            title: proj.title,
            description: proj.description.join(' '),
            role: "not found",
            technologies: [],
            key_features: [],
            challenges_solved: [],
            link: null,
            duration: "not found"
          })) || [],
          skills: {
            languages: candidate.profile.skills?.slice(0, 5) || [],
            frameworks: [],
            databases: [],
            tools: [],
            cloud_platforms: [],
            other: candidate.profile.skills?.slice(5) || []
          },
          certifications: [],
          achievements: [],
          publications: null,
          languages: null
        };
      }

      const response: GenerateQuestionsResponse = await generateQuestions(resumeData);
      dispatch(startInterviewAction(response.questions));
      answerTimesRef.current = new Array(response.questions.length).fill(0); // Initialize answer times

      // Start first question
      loadQuestion(response.questions[0]);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      message.error('Failed to start interview. Please try again.');
      setInterviewState('IDLE');
    }
  };

  const loadQuestion = (question: GeneratedQuestion) => {
    console.log('Loading question:', { question: question.question.substring(0, 50) + '...', currentState: interviewState });
    setCurrentQuestion(question);
    setAnswerText('');
    setInterviewState('READING');

    // 1. Play TTS (onend callback will transition to WAITING_TO_START and start timer)
    playTTS(question.question, true); // true indicates this is a new question
  };

  const handleStartRecording = () => {
    stopTimer(); // Stop the 30s timer
    stopTTS(); // Stop reading if still reading
    setInterviewState('RECORDING');
    setQuestionStartTime(Date.now());

    // Start 120s answer timer
    startTimer(ANSWER_TIMEOUT, () => {
      // Timeout: Auto-submit what we have
      message.info('Time limit reached. Submitting answer...');
      // The VoiceRecorder component will handle the auto-submit via its own prop
      // We just need to ensure the state is ready for submission.
      // The VoiceRecorder's onTranscriptionComplete will be called with the final text.
    });
  };

  const handleTranscriptionComplete = (text: string) => {
    setAnswerText(text);
    // Automatically submit after transcription is done
    handleSubmitAnswer(text);
  };

  const handleSubmitAnswer = async (finalAnswer: string) => {
    if (!currentQuestion) return;

    stopTimer();
    setInterviewState('SUBMITTING');

    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    // Save answer
    dispatch(addAnswer({
      questionId: currentQuestion.id.toString(),
      question: currentQuestion.question,
      answer: finalAnswer || "No answer provided (time expired)", // Ensure an answer is always saved
      timestamp: new Date().toISOString(),
      difficulty: currentQuestion.difficulty,
      category: currentQuestion.category
    }));

    // Store time taken for this answer
    const currentIndex = candidate.interviewProgress?.questionIndex || 0;
    answerTimesRef.current[currentIndex] = timeTaken;

    handleNextQuestion();
  };

  const handleSkipQuestion = () => {
    if (!currentQuestion) return;
    
    stopTimer();
    stopTTS();
    
    // Always save an answer when skipping, regardless of the current state
    const skippedAnswer = interviewState === 'RECORDING' && answerText 
      ? answerText + " (Question skipped by candidate)"
      : "Question skipped by candidate";
      
    dispatch(addAnswer({
      questionId: currentQuestion.id.toString(),
      question: currentQuestion.question,
      answer: skippedAnswer,
      timestamp: new Date().toISOString(),
      difficulty: currentQuestion.difficulty,
      category: currentQuestion.category
    }));
    
    message.info('Question skipped. Moving to next question.');
    handleNextQuestion();
  };

  const handleNextQuestion = () => {
    if (!candidate.interviewProgress?.generatedQuestions) return;

    const currentIndex = candidate.interviewProgress.questionIndex;
    const totalQuestions = candidate.interviewProgress.generatedQuestions.length;

    dispatch(nextQuestion());

    if (currentIndex + 1 >= totalQuestions) {
      finishInterview();
    } else {
      const nextQ = candidate.interviewProgress.generatedQuestions[currentIndex + 1];
      loadQuestion(nextQ);
    }
  };

  const finishInterview = async () => {
    console.log('Finishing interview - current state:', {
      answersCount: candidate.interviewProgress?.answers.length || 0,
      isComplete: candidate.interviewProgress?.isComplete,
      answers: candidate.interviewProgress?.answers.slice(0, 2) || []
    });
    
    setInterviewState('SCORING');
    setCurrentQuestion(null);

    // Prepare scoring payload
    const allAnswers = [...(candidate.interviewProgress?.answers || [])];
    // Note: The last answer is already added to redux in handleSubmitAnswer

    const scoringPayload: ScoringPayload = {
      candidate_info: {
        name: candidate.profile?.name || 'Unknown Candidate',
        technology: 'React.js' // Assuming a default technology for scoring
      },
      interview_data: (candidate.interviewProgress?.generatedQuestions || []).map((q, index) => {
        const ans = allAnswers.find(a => a.questionId === q.id.toString());
        return {
          question_id: q.id,
          question: q.question,
          difficulty: q.difficulty,
          category: q.category,
          expected_topics: q.expected_topics,
          answer: ans?.answer || "No answer provided",
          time_taken: answerTimesRef.current[index] || 0,
          max_time_allowed: q.difficulty === 'easy' ? 20 : q.difficulty === 'medium' ? 60 : 120 // Re-calculate max time
        };
      })
    };

    try {
      const scoringResult = await scoreAnswers(scoringPayload);

      dispatch(completeInterview({
        score: Math.round(scoringResult.final_score?.overall_score ?? 0),
        summary: scoringResult.overall_feedback,
        scoringResults: scoringResult
      }));

      setInterviewState('COMPLETED');
      onInterviewComplete?.(
        Math.round(scoringResult.final_score?.overall_score ?? 0),
        scoringResult.overall_feedback
      );

      // Auto-save with timeout to ensure state updates are processed
      setTimeout(() => {
        const savedInterview = createSavedInterviewFromState(candidate);
        console.log('Saving interview with answers:', {
          candidateAnswers: candidate.interviewProgress?.answers?.length || 0,
          savedInterviewAnswers: savedInterview?.interviewProgress.answers.length || 0,
          isComplete: savedInterview?.interviewProgress.isComplete,
          answers: savedInterview?.interviewProgress.answers.slice(0, 2) // Log first 2 answers
        });
        if (savedInterview) {
          saveInterviewToStorage(savedInterview);
        }
      }, 500); // Give 500ms for state updates to be processed

    } catch (error) {
      console.error('Scoring failed:', error);
      message.error('Scoring failed, but interview is saved.');
      // Fallback scoring if API fails
      const averageAnswerLength = allAnswers.reduce((sum, answer) => sum + answer.answer.length, 0) / allAnswers.length;
      const baseScore = Math.min(100, Math.max(0, (averageAnswerLength / 50) * 60 + 20));
      dispatch(completeInterview({
        score: Math.round(baseScore),
        summary: `Interview completed with ${scoringPayload.interview_data.length} questions answered. Scoring service temporarily unavailable.`
      }));
      setInterviewState('COMPLETED');

      // Auto-save fallback case
      setTimeout(() => {
        const savedInterview = createSavedInterviewFromState(candidate);
        console.log('Saving interview (fallback) with answers:', {
          candidateAnswers: candidate.interviewProgress?.answers?.length || 0,
          savedInterviewAnswers: savedInterview?.interviewProgress.answers.length || 0,
          isComplete: savedInterview?.interviewProgress.isComplete,
          answers: savedInterview?.interviewProgress.answers.slice(0, 2)
        });
        if (savedInterview) {
          saveInterviewToStorage(savedInterview);
        }
      }, 500);
    }
  };

  // Render Helpers
  const getTimerColor = () => {
    if (timeLeft <= 10) return '#ff4d4f';
    return '#1890ff';
  };

  // --- Views ---

  if (interviewState === 'IDLE') {
    return (
      <Card className="text-center" style={{ padding: '40px' }}>
        <Space direction="vertical" size="large">
          <Title level={2}>Ready for your Interview?</Title>
          <Paragraph>
            The interview consists of <strong>{candidate.interviewProgress?.generatedQuestions?.length || 6} questions</strong>.
          </Paragraph>
          <div style={{ textAlign: 'left', background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
            <Title level={5}>Instructions:</Title>
            <ul>
              <li>Each question will be read aloud.</li>
              <li>You have <strong>30 seconds</strong> to start recording your answer.</li>
              <li>You have <strong>2 minutes</strong> to speak your answer.</li>
            </ul>
          </div>
          <Button
            type="primary"
            size="large"
            onClick={handleStartInterview}
            icon={<RightOutlined />}
            style={{ minWidth: '200px', height: '50px', fontSize: '18px' }}
            disabled={!candidate.profile || !candidate.resumeText}
          >
            Start Interview
          </Button>
          {(!candidate.profile || !candidate.resumeText) && (
            <Text type="secondary">Please upload your resume first</Text>
          )}
        </Space>
      </Card>
    );
  }

  if (interviewState === 'GENERATING' || interviewState === 'SCORING') {
    return (
      <Card className="text-center" style={{ padding: '60px' }}>
        <Space direction="vertical" size="large">
          <div className="animate-pulse">
            <Title level={3}>
              {interviewState === 'GENERATING' ? 'Generating Questions...' : 'Analyzing Your Answers...'}
            </Title>
          </div>
          <Progress type="circle" percent={75} status="active" />
          <Text type="secondary">This uses AI and might take a few seconds.</Text>
        </Space>
      </Card>
    );
  }

  if (interviewState === 'COMPLETED') {
    const scoringResults = candidate.interviewProgress?.scoringResults as {
      total_questions?: number;
      questions_attempted?: number;
      final_score?: { content_score: number; overall_score: number };
      overall_feedback?: string;
      recommendation?: string;
      strengths_summary?: string[];
      areas_for_improvement?: string[];
    } | undefined;

    return (
      <Card title="Interview Complete">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Title level={3}>🎉 Interview Completed!</Title>
          <Text>
            You have successfully answered all {scoringResults?.total_questions || 6} questions. Thank you for completing the interview!
          </Text>

          {/* Final Score */}
          {candidate.finalScore !== null && (
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f6ffed', borderRadius: '8px' }}>
              <Title level={4} style={{ color: '#52c41a', margin: 0 }}>
                Final Score: {candidate.finalScore}/100
              </Title>
            </div>
          )}

          {/* Recommendation */}
          {scoringResults?.recommendation && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: scoringResults.recommendation === 'conditional-hire' ? '#fff7e6' : '#f6ffed', borderRadius: '8px' }}>
              <Text strong style={{ color: scoringResults.recommendation === 'conditional-hire' ? '#fa8c16' : '#52c41a' }}>
                Recommendation: {scoringResults.recommendation.replace('-', ' ').toUpperCase()}
              </Text>
            </div>
          )}

          {/* Overall Feedback */}
          {scoringResults?.overall_feedback && (
            <div style={{ marginTop: '16px', textAlign: 'left', padding: '16px', backgroundColor: '#f0f2f5', borderRadius: '8px' }}>
              <Text strong>Overall Feedback:</Text>
              <p style={{ margin: '8px 0 0 0', lineHeight: '1.6' }}>
                {scoringResults.overall_feedback}
              </p>
            </div>
          )}

          {/* Strengths Summary */}
          {scoringResults?.strengths_summary && scoringResults.strengths_summary.length > 0 && (
            <div style={{ marginTop: '16px', textAlign: 'left', padding: '16px', backgroundColor: '#f6ffed', borderRadius: '8px' }}>
              <Text strong style={{ color: '#52c41a' }}>Your Strengths:</Text>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {scoringResults.strengths_summary.map((strength: string, index: number) => (
                  <li key={index} style={{ marginBottom: '4px', lineHeight: '1.6' }}>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {scoringResults?.areas_for_improvement && scoringResults.areas_for_improvement.length > 0 && (
            <div style={{ marginTop: '16px', textAlign: 'left', padding: '16px', backgroundColor: '#fff2f0', borderRadius: '8px' }}>
              <Text strong style={{ color: '#ff4d4f' }}>Areas for Improvement:</Text>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {scoringResults.areas_for_improvement.map((area: string, index: number) => (
                  <li key={index} style={{ marginBottom: '4px', lineHeight: '1.6' }}>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fallback summary for cases where detailed scoring isn't available */}
          {candidate.summary && !scoringResults?.overall_feedback && (
            <div style={{ marginTop: '16px', textAlign: 'left', padding: '16px', backgroundColor: '#f0f2f5', borderRadius: '8px' }}>
              <Text strong>Interview Summary:</Text>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '8px 0 0 0' }}>
                {candidate.summary}
              </pre>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Active Interview View
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Progress Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>
          Question {(candidate.interviewProgress?.questionIndex || 0) + 1} of {candidate.interviewProgress?.generatedQuestions?.length || 6}
        </Title>
        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
          {currentQuestion?.category.toUpperCase()}
        </Tag>
      </div>

      <Progress
        percent={((candidate.interviewProgress?.questionIndex || 0) / (candidate.interviewProgress?.generatedQuestions?.length || 6)) * 100}
        showInfo={false}
        strokeColor="var(--primary-color)"
        style={{ marginBottom: '32px' }}
      />

      {/* Question Card */}
      <Card
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(to right, #f8fafc, #fff)',
          borderLeft: '4px solid var(--primary-color)'
        }}
      >
        <Title level={3} style={{ fontWeight: 400 }}>
          {currentQuestion?.question}
        </Title>
        <Button
          type="text"
          icon={<SoundOutlined />}
          onClick={() => playTTS(currentQuestion?.question || '', false)}
          disabled={interviewState === 'RECORDING' || interviewState === 'SUBMITTING'}
        >
          Replay Audio
        </Button>
      </Card>

      {/* Interaction Area */}
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        {interviewState === 'READING' && (
          <Space direction="vertical" size="large">
            <Title level={4}>Listening to the question...</Title>
            <Progress type="circle" percent={100} status="active" format={() => <SoundOutlined style={{ fontSize: '32px' }} />} />
            <Text type="secondary">Please wait for the question to finish reading.</Text>
          </Space>
        )}

        {interviewState === 'WAITING_TO_START' && (
          <Space direction="vertical" size="large">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Progress
                type="circle"
                percent={(timeLeft / START_TIMEOUT) * 100}
                width={120}
                format={() => timeLeft}
                strokeColor={getTimerColor()}
              />
              <div style={{ marginTop: '16px', fontWeight: 'bold', color: getTimerColor() }}>
                Seconds to Start
              </div>
            </div>

            <Space size="large" wrap>
              <Button
                type="primary"
                size="large"
                icon={<AudioOutlined />}
                onClick={handleStartRecording}
                style={{ height: '60px', fontSize: '20px', padding: '0 40px', borderRadius: '30px' }}
                className="animate-pulse"
              >
                Start Recording Answer
              </Button>
              <Button
                size="large"
                onClick={handleSkipQuestion}
                style={{ height: '60px', fontSize: '16px', padding: '0 30px', borderRadius: '30px' }}
              >
                Skip Question →
              </Button>
            </Space>
          </Space>
        )}

        {interviewState === 'RECORDING' && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff1f0', padding: '12px 24px', borderRadius: '8px', border: '1px solid #ffa39e' }}>
              <Space>
                <div style={{ width: '12px', height: '12px', background: '#ff4d4f', borderRadius: '50%' }} className="animate-pulse" />
                <Text strong style={{ color: '#cf1322' }}>Recording...</Text>
              </Space>
              <Space>
                <ClockCircleOutlined />
                <Text strong>{timeLeft}s remaining</Text>
              </Space>
            </div>

            <VoiceRecorder
              key={currentQuestion?.id || 'default'} // Force fresh instance for each question
              onTranscriptionComplete={handleTranscriptionComplete}
              autoSubmitOnTimeout={true}
              timeLeft={timeLeft} // Pass timeLeft to VoiceRecorder for its internal logic
              placeholder="Listening..."
              autoStart={true} // Assuming VoiceRecorder can be updated to support this
            />

            <Row gutter={16} justify="center" style={{ width: '100%' }}>
              <Col>
                <Text type="secondary">Your answer will be automatically submitted when the timer runs out.</Text>
              </Col>
            </Row>
            
            <Button
              type="default"
              size="large"
              onClick={handleSkipQuestion}
              style={{ height: '50px', fontSize: '16px', padding: '0 30px', borderRadius: '25px', marginTop: '16px' }}
            >
              Skip to Next Question →
            </Button>
          </Space>
        )}

        {interviewState === 'SUBMITTING' && (
          <Space direction="vertical" size="large">
            <Title level={4}>Submitting your answer...</Title>
            <Progress type="circle" percent={100} status="active" format={() => <SendOutlined style={{ fontSize: '32px' }} />} />
            <Text type="secondary">Please wait.</Text>
          </Space>
        )}
      </Card>
    </div>
  );
};

export default InterviewChat;