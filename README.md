# AI-Powered Interview Platform

A comprehensive interview platform with AI-powered resume parsing, question generation, and scoring capabilities.

## Project Structure

- **`frontend/`** - React + TypeScript frontend application
- **`backend/`** - Node.js backend API (development/reference only)
- **`docs/`** - Documentation and development notes

## Quick Start

This project is primarily focused on the frontend application for deployment.

### Frontend Deployment

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API endpoints
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. The `dist/` folder contains the production-ready files for deployment.

## Documentation

All project documentation has been moved to the [`docs/`](./docs/) folder:

- [Main README](./docs/README.md) - Original project documentation
- [Bug Fix Summary](./docs/BUG_FIX_SUMMARY.md)
- [Education Enhancement](./docs/EDUCATION_ENHANCEMENT.md) 
- [Individual Scores Fix](./docs/INDIVIDUAL_SCORES_FIX.md)
- [Interview Flow Implementation](./docs/INTERVIEW_FLOW_IMPLEMENTATION.md)
- [Resume Parsing Integration](./docs/RESUME_PARSING_INTEGRATION.md)
- [Workflow Enhancement](./docs/WORKFLOW_ENHANCEMENT.md)
- [API Logging Setup](./docs/API_LOGGING_README.txt)

## Features

- Resume upload and AI-powered parsing
- Dynamic question generation based on candidate skills
- Interactive voice-enabled interview sessions
- Real-time answer scoring and feedback
- Interview session management and history

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Redux Toolkit, Tailwind CSS
- **APIs**: External ML services for resume parsing and question generation
- **Build**: Vite with production optimizations

## License

This project is for educational/development purposes.