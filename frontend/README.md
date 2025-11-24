# AI-Powered Interview Platform - Frontend

A React-based frontend application for conducting AI-powered technical interviews with resume parsing, question generation, and real-time scoring capabilities.

## Features

- **Resume Upload & Parsing**: Upload PDF resumes and extract structured data
- **AI Question Generation**: Generate technical questions based on candidate's skills and experience
- **Interactive Interview Chat**: Conduct interviews with voice recording and text-to-speech
- **Real-time Scoring**: Get instant feedback and scores for interview answers
- **Interview Management**: Save, review, and manage interview sessions

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Configure your API endpoints in `.env`:
   ```env
   # Backend API Configuration
   VITE_BACKEND_URL=http://localhost:3001
   
   # External ML APIs Configuration  
   VITE_ML_API_BASE_URL=http://52.66.208.231:8002
   ```

### Installation & Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. Preview the build locally:
   ```bash
   npm run preview
   ```

The build files will be generated in the `dist` folder, ready for deployment.

## Deployment

### Environment Variables for Production

Ensure these environment variables are set in your production environment:

- `VITE_BACKEND_URL`: Your backend API URL
- `VITE_ML_API_BASE_URL`: Your ML services API URL  
- `VITE_API_TIMEOUT`: API timeout (default: 30000ms)

### Deployment Options

#### Static Hosting (Vercel, Netlify, etc.)
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your static hosting service
3. Configure environment variables in your hosting platform

#### Docker Deployment
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Project Structure

```
src/
├── api/           # API client and services
├── components/    # Reusable React components
├── pages/         # Page components
├── store/         # Redux store and slices
├── utils/         # Utility functions
└── assets/        # Static assets
```

## Technologies Used

- **React 18** with TypeScript
- **Vite** for build tooling and development server
- **Redux Toolkit** for state management
- **Axios** for API communication
- **Tailwind CSS** for styling
- **Web Speech API** for voice recording and text-to-speech

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
