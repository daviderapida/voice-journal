// DOM Elements
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const status = document.getElementById('status');
const transcription = document.getElementById('transcription');
const saveButton = document.createElement('button');
const editButton = document.createElement('button');

// Audio recording variables
let mediaRecorder;
let audioChunks = [];
let audioContext;
let analyser;
let microphone;
let isEditing = false;

// Initialize UI
function initializeUI() {
    // Style and add edit button
    editButton.textContent = 'Edit';
    editButton.className = 'edit-button';
    editButton.style.display = 'none';
    editButton.onclick = toggleEdit;
    
    // Style and add save button
    saveButton.textContent = 'Save';
    saveButton.className = 'save-button';
    saveButton.style.display = 'none';
    saveButton.onclick = saveTranscription;
    
    // Add buttons after transcription
    transcription.parentNode.insertBefore(editButton, transcription.nextSibling);
    transcription.parentNode.insertBefore(saveButton, editButton.nextSibling);
}

// Toggle edit mode
function toggleEdit() {
    isEditing = !isEditing;
    if (isEditing) {
        transcription.contentEditable = true;
        transcription.focus();
        editButton.textContent = 'Cancel';
        saveButton.style.display = 'inline-block';
    } else {
        transcription.contentEditable = false;
        editButton.textContent = 'Edit';
        saveButton.style.display = 'none';
        // Restore original text
        transcription.textContent = transcription.getAttribute('data-original-text') || '';
    }
}

// Save transcription
async function saveTranscription() {
    try {
        const editedText = transcription.textContent;
        const response = await fetch('/save-transcription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: editedText })
        });

        if (!response.ok) {
            throw new Error('Failed to save transcription');
        }

        // Update original text
        transcription.setAttribute('data-original-text', editedText);
        isEditing = false;
        transcription.contentEditable = false;
        editButton.textContent = 'Edit';
        saveButton.style.display = 'none';
        status.textContent = 'Transcription saved';
    } catch (error) {
        status.textContent = 'Error saving: ' + error.message;
        console.error('Save error:', error);
    }
}

// Helper function to get supported MIME type
function getSupportedMimeType() {
    const types = [
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/webm',
        'audio/ogg'
    ];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

// Initialize recording functionality
async function setupRecording() {
    try {
        // Request high-quality audio with specific constraints
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1, // Mono audio is better for speech
                sampleRate: 48000, // Higher sample rate for better quality
                sampleSize: 16, // 16-bit audio
                latency: 0, // Low latency
                googEchoCancellation: true,
                googAutoGainControl: true,
                googNoiseSuppression: true,
                googHighpassFilter: true
            }
        });
        
        // Set up audio analysis
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        // Get supported MIME type
        const mimeType = getSupportedMimeType();
        if (!mimeType) {
            throw new Error('No supported audio MIME type found');
        }
        
        console.log('Using MIME type:', mimeType);
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            audioBitsPerSecond: 192000 // Higher bitrate for better quality
        });

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            await transcribeAudio(audioBlob, mimeType);
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
    mediaRecorder.start(1000); // Collect data every second for better quality
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

async function transcribeAudio(audioBlob, mimeType) {
    try {
        const formData = new FormData();
        // Determine file extension based on MIME type
        let extension = 'mp4';
        if (mimeType.includes('mpeg')) extension = 'mp3';
        if (mimeType.includes('wav')) extension = 'wav';
        if (mimeType.includes('webm')) extension = 'webm';
        if (mimeType.includes('ogg')) extension = 'ogg';
        
        formData.append('file', audioBlob, `recording.${extension}`);
        formData.append('model', 'whisper-1');

        status.textContent = 'Transcribing...';
        
        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Transcription failed');
        }

        const data = await response.json();
        transcription.textContent = data.text;
        transcription.setAttribute('data-original-text', data.text);
        status.textContent = 'Transcription complete';
        editButton.style.display = 'inline-block';
    } catch (error) {
        status.textContent = 'Error: ' + error.message;
        console.error('Transcription error:', error);
    }
}

// Initialize the app
initializeUI();
setupRecording(); 