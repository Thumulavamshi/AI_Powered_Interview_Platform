// Types for API logging
interface LogEntry {
  timestamp: Date;
  apiName: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  requestSize: number;
  responseSize: number;
}

interface FormattedLogCall {
  callNumber: number;
  timestamp: Date;
  requestSizeBytes: number;
  responseSizeBytes: number;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
}

interface FormattedLogContent {
  apiName: string;
  totalCalls: number;
  lastUpdated: string;
  calls: FormattedLogCall[];
}

// Utility for logging API responses to files for analysis
export class APILogger {
  private static logs: { [key: string]: LogEntry[] } = {};

  static logResponse(apiName: string, request: Record<string, unknown>, response: Record<string, unknown>, timestamp?: Date) {
    const logEntry: LogEntry = {
      timestamp: timestamp || new Date(),
      apiName,
      request,
      response,
      requestSize: JSON.stringify(request).length,
      responseSize: JSON.stringify(response).length
    };

    // Store in memory
    if (!this.logs[apiName]) {
      this.logs[apiName] = [];
    }
    this.logs[apiName].push(logEntry);

    // Log to console for immediate visibility
    console.log(`🔍 ${apiName} API Call:`, logEntry);

    // Save to file
    this.saveToFile(apiName);
  }

  private static saveToFile(apiName: string) {
    try {
      // Create downloadable content
      const fileName = `${apiName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_responses.json`;
      const existingLogs = this.logs[apiName] || [];
      
      // Format for readability
      const formattedContent: FormattedLogContent = {
        apiName,
        totalCalls: existingLogs.length,
        lastUpdated: new Date().toISOString(),
        calls: existingLogs.map((entry, index) => ({
          callNumber: index + 1,
          timestamp: entry.timestamp,
          requestSizeBytes: entry.requestSize,
          responseSizeBytes: entry.responseSize,
          request: entry.request,
          response: entry.response
        }))
      };

      // Store in localStorage as backup
      localStorage.setItem(`api_log_${apiName}`, JSON.stringify(formattedContent));
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(formattedContent, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      // Auto-download file (optional - can be disabled)
      if (this.shouldAutoDownload()) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('Failed to save API log to file:', error);
    }
  }

  private static shouldAutoDownload(): boolean {
    // Only auto-download every 5th call to avoid spam
    const totalCalls = Object.values(this.logs).reduce((sum, logs) => sum + logs.length, 0);
    return totalCalls % 5 === 0;
  }

  // Manual download functions
  static downloadLogs(apiName?: string) {
    if (apiName && this.logs[apiName]) {
      this.saveToFile(apiName);
    } else {
      // Download all logs
      Object.keys(this.logs).forEach(api => {
        this.saveToFile(api);
      });
    }
  }

  static downloadAllLogs() {
    const allLogs = {
      generatedAt: new Date().toISOString(),
      apis: this.logs
    };

    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_api_responses.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static clearLogs(apiName?: string) {
    if (apiName) {
      delete this.logs[apiName];
      localStorage.removeItem(`api_log_${apiName}`);
    } else {
      this.logs = {};
      // Clear all localStorage entries
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('api_log_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  static getLogs(apiName?: string): LogEntry[] | { [key: string]: LogEntry[] } {
    return apiName ? this.logs[apiName] || [] : this.logs;
  }
}

// Convenience functions
export const logParseResumeResponse = (request: Record<string, unknown>, response: Record<string, unknown>) => {
  APILogger.logResponse('parse-resume', request, response);
};

export const logGenerateQuestionsResponse = (request: Record<string, unknown>, response: Record<string, unknown>) => {
  APILogger.logResponse('generate-questions', request, response);
};

export const logScoringResponse = (request: Record<string, unknown>, response: Record<string, unknown>) => {
  APILogger.logResponse('score-answers', request, response);
};