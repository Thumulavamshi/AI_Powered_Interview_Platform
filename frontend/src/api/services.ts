import apiClient from './client';
import { logParseResumeResponse, logGenerateQuestionsResponse, logScoringResponse } from '../utils/apiLogger';

export interface ParsedResumeData {
  personal_info: {
    name: string;
    email: string;
    phone: string;
    linkedin: string | null;
    github: string | null;
    website: string | null;
    location: string | null;
  };
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string | null;
    grade: string | null;
    start_date: string;
    end_date: string | null;
    achievements: string | null;
  }>;
  experience: Array<{
    company: string;
    role: string;
    start_date: string;
    end_date: string | null;
    duration: string | null;
    location: string | null;
    responsibilities: string[];
    technologies_used: string[];
    key_achievements: string | null;
  }>;
  projects: Array<{
    title: string;
    description: string;
    role: string;
    technologies: string[];
    key_features: string[];
    challenges_solved: string[];
    link: string | null;
    duration: string;
  }>;
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
    cloud_platforms: string[];
    other: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    issue_date: string | null;
    expiry_date: string | null;
    credential_id: string | null;
  }>;
  achievements: string[];
  publications: string | null;
  languages: string | null;
}

export interface ResumeUploadResponse {
  candidateId: string;
  extracted: {
    name: string;
    email: string;
    phone: string;
    linkedin?: string;
    github?: string;
    website?: string;
    education?: Array<{
      institution: string;
    }>;
    experience?: Array<{
      key: string;
      start: string;
      end: string;
      description: string[];
    }>;
    projects?: Array<{
      title: string;
      description: string[];
    }>;
    skills?: string[];
  };
  resumeText: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface GeneratedQuestion {
  id: number;
  question: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  expected_topics: string[];
}

export interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  technology: string;
  candidate_name: string;
}

export interface ScoringPayload {
  candidate_info: {
    name: string;
    technology: string;
  };
  interview_data: Array<{
    question_id: number;
    question: string;
    difficulty: string;
    category: string;
    expected_topics: string[];
    answer: string;
    time_taken: number;
    max_time_allowed: number;
  }>;
}

export interface QuestionScore {
  question_id: number;
  question: string;
  category: string;
  candidate_answer: string;
  time_taken: number;
  score: number;  // This is what the API actually returns (0-10 scale)
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  key_points_covered: string[];
  key_points_missed: string[];
}

export interface ScoringResponse {
  candidate_name: string;
  technology?: string;
  total_questions: number;
  questions_attempted: number;
  question_scores: QuestionScore[];
  final_score: {
    overall_score: number;
  };
  overall_feedback: string;
  recommendation: string;
  strengths_summary: string[];
  areas_for_improvement: string[];
}

// Generate questions for interview
export const generateQuestions = async (parsedResumeData: ParsedResumeData): Promise<GenerateQuestionsResponse> => {
  try {
    const response = await fetch('http://52.66.208.231:8002/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsedResumeData),
    });

    if (!response.ok) {
      throw new Error(`Generate questions failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Enhanced logging for debugging
    console.log('🎯 Generate Questions API Request:', {
      candidateName: parsedResumeData?.personal_info?.name || 'Unknown',
      skillsFound: parsedResumeData?.skills ? Object.keys(parsedResumeData.skills).length : 0,
      experienceCount: parsedResumeData?.experience?.length || 0,
      projectsCount: parsedResumeData?.projects?.length || 0,
      educationCount: parsedResumeData?.education?.length || 0,
      fullRequest: parsedResumeData
    });
    
    console.log('🎯 Generate Questions API Response:', {
      questionsCount: data?.questions?.length || 0,
      technology: data?.technology || 'Not specified',
      candidateName: data?.candidate_name || 'Not specified',
      actualQuestions: data?.questions?.map((q: GeneratedQuestion) => ({
        id: q.id,
        difficulty: q.difficulty,
        category: q.category,
        question: q.question
      })) || [],
      fullResponse: data
    });
    
    // Log the API call for analysis
    logGenerateQuestionsResponse(
      JSON.parse(JSON.stringify(parsedResumeData)) as Record<string, unknown>,
      JSON.parse(JSON.stringify(data)) as Record<string, unknown>
    );
    
    return data;
  } catch (error) {
    console.error('Generate questions API error:', error);
    throw error;
  }
};

// Score interview answers
export const scoreAnswers = async (payload: ScoringPayload): Promise<ScoringResponse> => {
  try {
    const response = await fetch('http://52.66.208.231:8002/score-answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Score answers failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Enhanced logging for debugging
    console.log('🏆 Score Answers API Request:', {
      candidateName: payload.candidate_info.name,
      technology: payload.candidate_info.technology,
      questionsCount: payload.interview_data.length,
      questionBreakdown: payload.interview_data.map(q => ({
        id: q.question_id,
        difficulty: q.difficulty,
        category: q.category,
        answerLength: q.answer.length,
        timeTaken: q.time_taken
      }))
    });
    
    console.log('🏆 Score Answers API Response:', {
      candidateName: data?.candidate_name || 'Not specified',
      technology: data?.technology || 'Not specified',
      totalQuestions: data?.total_questions || 0,
      questionsAttempted: data?.questions_attempted || 0,
      finalScore: data?.final_score || 'Not provided',
      overallFeedback: data?.overall_feedback || 'Not provided',
      questionScores: data?.question_scores?.map((score: QuestionScore) => ({
        id: score.question_id,
        category: score.category,
        score: score.score,
        feedbackSnippet: score.feedback?.substring(0, 100) + '...'
      })) || [],
      fullResponse: data
    });
    
    // Log the API call for analysis
    logScoringResponse(
      JSON.parse(JSON.stringify(payload)) as Record<string, unknown>,
      JSON.parse(JSON.stringify(data)) as Record<string, unknown>
    );
    
    return data;
  } catch (error) {
    console.error('Score answers API error:', error);
    throw error;
  }
};

// Health check for API connection
export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  try {
    await apiClient.get('/health');
    return {
      status: 'success',
      message: 'API is connected'
    };
  } catch {
    return {
      status: 'error',
      message: 'Failed to connect to API'
    };
  }
};

// Upload and parse resume
export const uploadResume = async (file: File): Promise<ResumeUploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Call the resume parsing API
    const parseResponse = await fetch('http://52.66.208.231:8002/parse-resume', {
      method: 'POST',
      body: formData,
    });

    if (!parseResponse.ok) {
      throw new Error(`Resume parsing failed: ${parseResponse.status} ${parseResponse.statusText}`);
    }

    const parsedData: ParsedResumeData = await parseResponse.json();

    // Enhanced logging for debugging
    console.log('📄 Parse Resume API Response:', {
      candidateName: parsedData?.personal_info?.name || 'Not found',
      email: parsedData?.personal_info?.email || 'Not found',
      skillsCategories: parsedData?.skills ? Object.keys(parsedData.skills) : [],
      totalSkills: parsedData?.skills ? Object.values(parsedData.skills).flat().length : 0,
      experienceYears: parsedData?.experience?.length || 0,
      projectsCount: parsedData?.projects?.length || 0,
      educationCount: parsedData?.education?.length || 0,
      skillsBreakdown: parsedData?.skills || {},
      experienceDetail: parsedData?.experience?.map(exp => ({
        company: exp.company,
        role: exp.role,
        technologies: exp.technologies_used?.slice(0, 3) || []
      })) || [],
      fullParsedData: parsedData
    });

    // Log the API call for analysis
    logParseResumeResponse(
      { 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type,
        endpoint: 'parse-resume'
      }, 
      JSON.parse(JSON.stringify(parsedData)) as Record<string, unknown>
    );

    // Helper to flatten skills object
    const flattenSkills = (skillsObj: ParsedResumeData['skills']): string[] => {
      if (!skillsObj) return [];
      return [
        ...(skillsObj.languages || []),
        ...(skillsObj.frameworks || []),
        ...(skillsObj.databases || []),
        ...(skillsObj.tools || []),
        ...(skillsObj.cloud_platforms || []),
        ...(skillsObj.other || [])
      ];
    };

    // Transform the parsed data to match our interface
    const extractedData = {
      name: parsedData?.personal_info?.name && parsedData.personal_info.name !== "not found" ? parsedData.personal_info.name : "",
      email: parsedData?.personal_info?.email && parsedData.personal_info.email !== "not found" ? parsedData.personal_info.email : "",
      phone: parsedData?.personal_info?.phone && parsedData.personal_info.phone !== "not found" ? parsedData.personal_info.phone : "",
      linkedin: parsedData?.personal_info?.linkedin && parsedData.personal_info.linkedin !== "not found" ? parsedData.personal_info.linkedin : undefined,
      github: parsedData?.personal_info?.github && parsedData.personal_info.github !== "not found" ? parsedData.personal_info.github : undefined,
      website: parsedData?.personal_info?.website && parsedData.personal_info.website !== "not found" ? parsedData.personal_info.website : undefined,
      education: parsedData?.education?.map(edu => ({
        institution: edu.institution
      })) || [],
      experience: parsedData?.experience?.map(exp => ({
        key: exp.company,
        start: exp.start_date,
        end: exp.end_date || 'Present',
        description: exp.responsibilities || []
      })) || [],
      projects: parsedData?.projects?.map(proj => ({
        title: proj.title,
        description: proj.description ? [proj.description] : []
      })) || [],
      skills: flattenSkills(parsedData?.skills)
    };

    // Generate a candidate ID
    const candidateId = `CAND-${Date.now()}`;

    // Create response object
    const response: ResumeUploadResponse = {
      candidateId,
      extracted: extractedData,
      resumeText: JSON.stringify(parsedData), // Store the full parsed data as text
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString()
    };

    return response;

  } catch (error) {
    console.error('Upload resume error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload and parse resume');
  }
};