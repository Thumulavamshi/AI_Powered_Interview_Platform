# Deployment Guide

## Frontend Deployment Instructions

### Prerequisites
- Node.js 18+ installed
- Access to external ML API endpoints

### Environment Configuration

1. **Copy Environment Template**
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Configure API Endpoints in `.env`**
   ```env
   # Backend API (if needed for future features)
   VITE_BACKEND_URL=http://localhost:3001
   
   # External ML APIs - UPDATE THESE FOR PRODUCTION
   
   # API Endpoints (usually don't change)
   VITE_PARSE_RESUME_ENDPOINT=/parse-resume
   VITE_GENERATE_QUESTIONS_ENDPOINT=/generate-questions  
   VITE_SCORE_ANSWERS_ENDPOINT=/score-answers
   
   # Performance Settings
   VITE_API_TIMEOUT=30000
   ```

### Build Process

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

3. **Test Build Locally** (optional)
   ```bash
   npm run preview
   ```

The production files will be in the `dist/` folder.

### Deployment Options

#### Option 1: Static Hosting (Recommended)

**Vercel:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the frontend directory
3. Configure environment variables in Vercel dashboard

**Netlify:**
1. Drag and drop the `dist` folder to Netlify
2. Or connect your GitHub repository
3. Set environment variables in Site settings > Environment variables

**GitHub Pages:**
```bash
npm run build
# Deploy dist/ folder contents to gh-pages branch
```

#### Option 2: Docker Deployment

**Dockerfile:**
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and Run:**
```bash
docker build -t interview-platform .
docker run -p 80:80 interview-platform
```

### Environment Variables for Production

Make sure to set these in your hosting platform:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Backend API URL | `https://your-api.com` |
| `VITE_ML_API_BASE_URL` | ML Services URL | `https://ml-api.com` |
| `VITE_API_TIMEOUT` | Request timeout (ms) | `30000` |

### Important Notes

- ✅ All console.log statements are disabled in production builds
- ✅ API URLs are configurable via environment variables
- ✅ All documentation moved to `/docs` folder
- ⚠️  Update `VITE_ML_API_BASE_URL` with your production ML API endpoint
- ⚠️  Ensure CORS is configured on your ML API for your domain

### Testing the Deployment

1. Upload a PDF resume
2. Verify resume parsing works
3. Start an interview session
4. Check question generation
5. Complete interview and verify scoring

### Troubleshooting

**Common Issues:**
- **CORS Errors**: Configure CORS on ML API endpoints
- **Environment Variables**: Ensure all VITE_ prefixed variables are set
- **API Timeouts**: Increase `VITE_API_TIMEOUT` if needed
- **Build Errors**: Clear node_modules and reinstall dependencies

**Debug Mode:**
Set `NODE_ENV=development` to enable console logging for debugging.