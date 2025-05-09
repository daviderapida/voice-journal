// DOM Elements
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const status = document.getElementById('status');
const transcription = document.getElementById('transcription');

// Audio recording variables
let mediaRecorder;
let audioChunks = [];

// Initialize recording functionality
async function setupRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await transcribeAudio(audioBlob);
            audioChunks = [];
        };

        recordButton.addEventListener('click', startRecording);
        stopButton.addEventListener('click', stopRecording);
    } catch (error) {
        status.textContent = 'Error accessing microphone: ' + error.message;
        recordButton.disabled = true;
        console.error('Microphone error:', error);
    }
}

function startRecording() {
    audioChunks = [];
    mediaRecorder.start();
    recordButton.style.display = 'none';
    stopButton.style.display = 'block';
    recordButton.classList.add('recording');
    status.textContent = 'Recording...';
}

function stopRecording() {
    mediaRecorder.stop();
    recordButton.style.display = 'block';
    stopButton.style.display = 'none';
    recordButton.classList.remove('recording');
    status.textContent = 'Processing...';
}

async function transcribeAudio(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');

        status.textContent = 'Transcribing...';
        
        const response = await fetch('http://localhost:3000/transcribe', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Transcription failed');
        }

        const data = await response.json();
        transcription.textContent = data.text;
        status.textContent = 'Transcription complete';
    } catch (error) {
        status.textContent = 'Error: ' + error.message;
        console.error('Transcription error:', error);
    }
}

// Initialize the app
setupRecording(); 