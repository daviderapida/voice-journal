# Voice Journal

A simple voice journaling app that records audio and transcribes it using the Cursor API.

## Features

- Record audio from your microphone
- Automatic transcription using Cursor API
- Edit and save transcriptions
- Clean, modern UI

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open http://localhost:60331 in your browser

## Deployment

This app is configured for deployment on Vercel:

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy your app

## Environment Variables

The app uses the following environment variables:

- `CURSOR_API_URL`: The base URL for the Cursor API
- `CURSOR_API_KEY`: Your Cursor API key (if required)

## Browser Support

This app works best in modern browsers that support the MediaRecorder API:
- Chrome (recommended)
- Firefox
- Edge
- Safari (with some limitations)

## License

MIT 

const API_BASE_URL = "https://voice-journaling-app-development.cursor.so"; 

const response = await fetch(`${API_BASE_URL}/transcribe`, { ... }); 

const response = await fetch(`${API_BASE_URL}/save-transcription`, { ... }); 