import React, { useState, useEffect, useRef } from 'react';
import InterviewListView from '../components/InterviewListView';
import InterviewDetailView from '../components/InterviewDetailView';
import type { SavedInterview } from '../utils/interviewStorage';
import { useAppSelector } from '../store/hooks';

const InterviewerPage: React.FC = () => {
  const [selectedInterview, setSelectedInterview] = useState<SavedInterview | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const session = useAppSelector((state) => state.session);
  const previousTab = useRef(session.currentTab);

  const handleSelectInterview = (interview: SavedInterview) => {
    setSelectedInterview(interview);
  };

  const handleBackToList = () => {
    setSelectedInterview(null);
  };

  // Watch for tab changes and trigger refresh when switching to interviewer tab
  useEffect(() => {
    if (previousTab.current !== 'interviewer' && session.currentTab === 'interviewer') {
      // User switched to interviewer tab - trigger a refresh
      setRefreshTrigger(prev => prev + 1);
    }
    previousTab.current = session.currentTab;
  }, [session.currentTab]);

  // Show detailed view if an interview is selected, otherwise show the list
  if (selectedInterview) {
    return (
      <InterviewDetailView 
        interview={selectedInterview} 
        onBack={handleBackToList}
      />
    );
  }

  return (
    <InterviewListView 
      key={refreshTrigger} // This will force a re-mount and refresh when tab is switched
      onSelectInterview={handleSelectInterview} 
    />
  );
};

export default InterviewerPage;