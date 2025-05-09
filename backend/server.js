require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const path = require('path');
const { Readable } = require('stream');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Configure CORS
const corsOptions = {
    origin: [
        'https://*.vercel.app',  // Allow all Vercel deployments
        'https://*.lovable.app', // Allow all Lovable subdomains
        'http://localhost:3000'  // Allow local development
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Configure multer for handling file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit
    }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create transcriptions directory if it doesn't exist
const transcriptionsDir = path.join(__dirname, 'transcriptions');
fs.mkdir(transcriptionsDir, { recursive: true }).catch(console.error);

// Debug middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Routes
app.post('/transcribe', upload.single('file'), async (req, res) => {
    console.log('Received transcription request');
    try {
        if (!req.file) {
            console.log('No file received');
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('File received:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Create a File object from the buffer with the correct extension and MIME type
        const extension = req.file.originalname.split('.').pop();
        const audioFile = new File(
            [req.file.buffer],
            `audio.${extension}`,
            { type: req.file.mimetype }
        );

        console.log('Created audio file object with type:', req.file.mimetype);

        console.log('Sending to OpenAI Whisper API...');
        // Send to OpenAI Whisper API with improved settings
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            response_format: "text",
            language: "en",
            prompt: "This is a voice recording. Please transcribe the speech accurately.",
            temperature: 0.2,
            suppress_timestamps: true
        });

        console.log('Received transcription:', transcription);
        res.json({ text: transcription });
    } catch (error) {
        console.error('Transcription error:', error);
        if (error.response) {
            try {
                const errorText = await error.response.text();
                console.error('OpenAI API response:', errorText);
            } catch (e) {
                console.error('Error reading OpenAI API response:', e);
            }
        }
        res.status(500).json({ error: 'Error processing audio file' });
    }
});

// Save transcription endpoint
app.post('/save-transcription', express.json(), async (req, res) => {
    console.log('Received save request:', req.body); // Debug log
    try {
        const { text } = req.body;
        if (!text) {
            console.error('No text provided in save request');
            return res.status(400).json({ error: 'No text provided' });
        }

        // For now, just log the saved text
        console.log('Saving transcription:', text);
        
        // Send a more detailed response
        res.json({ 
            success: true, 
            message: 'Transcription saved',
            savedText: text,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving transcription:', error);
        res.status(500).json({ 
            error: 'Failed to save transcription',
            details: error.message 
        });
    }
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
}); 