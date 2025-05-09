const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const upload = multer();

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else if (origin === 'https://voice-journal-git-main-daviderapidas-projects.vercel.app/') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('Received file:', req.file.originalname, req.file.mimetype, req.file.size);

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error('Whisper API error:', err);
      return res.status(500).json({ error: 'Whisper API error', details: err });
    }
    const data = await openaiRes.json();
    res.json({ transcription: data.text });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 