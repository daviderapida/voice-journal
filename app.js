// DOM Elements
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const status = document.getElementById('status');
const transcription = document.getElementById('transcription');

// Audio recording variables
let mediaRecorder;
let audioChunks = [];
let audioBlob;
let audioUrl;

// Initialize recording functionality
async function setupRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Configure MediaRecorder for Chrome
        const options = {
            mimeType: 'audio/webm'
        };
        
        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            // Create the audio blob
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log('Recording format:', audioBlob.type); // This will show in Chrome's console
            
            audioUrl = URL.createObjectURL(audioBlob);
            
            // Create a File object with .webm extension
            const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
            
            // Send to Whisper API for transcription
            await transcribeAudio(audioFile);
            
            // Clean up
            audioChunks = [];
            URL.revokeObjectURL(audioUrl);
        };

        recordButton.addEventListener('click', startRecording);
        stopButton.addEventListener('click', stopRecording);
    } catch (error) {
        status.textContent = 'Error accessing microphone: ' + error.message;
        recordButton.disabled = true;
    }
}

function startRecording() {
    mediaRecorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;
    status.textContent = 'Recording...';
}

function stopRecording() {
    mediaRecorder.stop();
    recordButton.disabled = false;
    stopButton.disabled = true;
    status.textContent = 'Processing...';
}

async function transcribeAudio(audioFile) {
    try {
        const formData = new FormData();
        formData.append("file", audioFile, "recording.webm");

        console.log('Sending file to Cursor API:', {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size
        });

        const response = await fetch(`${process.env.CURSOR_API_URL || 'https://api.cursor.sh/v1'}/transcribe`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(`Transcription failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        showTranscriptionPreview(data.transcription);
    } catch (error) {
        console.error('Transcription error:', error);
        status.textContent = `Error during transcription: ${error.message}`;
    }
}

function showTranscriptionPreview(text) {
    // Create preview container if it doesn't exist
    let previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'previewContainer';
        previewContainer.style.marginTop = '2rem';
        document.querySelector('.container').appendChild(previewContainer);
    }

    // Create or update preview textarea
    let previewTextarea = document.getElementById('previewTextarea');
    if (!previewTextarea) {
        previewTextarea = document.createElement('textarea');
        previewTextarea.id = 'previewTextarea';
        previewTextarea.style.width = '100%';
        previewTextarea.style.minHeight = '100px';
        previewTextarea.style.padding = '1rem';
        previewTextarea.style.marginBottom = '1rem';
        previewTextarea.style.border = '1px solid #ddd';
        previewTextarea.style.borderRadius = '6px';
        previewTextarea.style.fontFamily = 'inherit';
        previewTextarea.style.fontSize = '1rem';
        previewContainer.appendChild(previewTextarea);
    }

    // Create or update save button
    let saveButton = document.getElementById('saveButton');
    if (!saveButton) {
        saveButton = document.createElement('button');
        saveButton.id = 'saveButton';
        saveButton.textContent = 'Save Transcription';
        saveButton.style.padding = '0.75rem 1.5rem';
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '6px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.fontSize = '1rem';
        saveButton.style.marginTop = '1rem';
        saveButton.onclick = saveTranscription;
        previewContainer.appendChild(saveButton);
    }

    // Set the transcription text
    previewTextarea.value = text;
    status.textContent = 'Transcription ready for review';
}

async function saveTranscription() {
    const previewTextarea = document.getElementById('previewTextarea');
    if (previewTextarea) {
        const finalText = previewTextarea.value;
        
        try {
            const response = await fetch(`${process.env.CURSOR_API_URL || 'https://api.cursor.sh/v1'}/save-transcription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transcription: finalText,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save transcription');
            }

            const result = await response.json();
            console.log('Transcription saved:', result);
            status.textContent = 'Transcription saved successfully';
            
            // Clear the preview after successful save
            previewTextarea.value = '';
            document.getElementById('saveButton').style.display = 'none';
        } catch (error) {
            console.error('Save error:', error);
            status.textContent = `Error saving transcription: ${error.message}`;
        }
    }
}

// Initialize the app
setupRecording(); 