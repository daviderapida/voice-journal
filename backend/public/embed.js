class VoiceJournal {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            apiUrl: options.apiUrl || 'https://voice-journal-j6z7kmi07-daviderapidas-projects.vercel.app',
            ...options
        };
        this.init();
    }

    init() {
        // Create UI elements
        this.createUI();
        // Initialize recording functionality
        this.setupRecording();
    }

    createUI() {
        this.container.innerHTML = `
            <div class="voice-journal">
                <button id="recordButton" class="record-button">Start Recording</button>
                <button id="stopButton" class="stop-button" style="display: none;">Stop Recording</button>
                <div id="status" class="status"></div>
                <div id="transcription" class="transcription" contenteditable="false"></div>
                <button id="editButton" class="edit-button" style="display: none;">Edit</button>
                <button id="saveButton" class="save-button" style="display: none;">Save</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .voice-journal {
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .record-button, .stop-button, .edit-button, .save-button {
                margin: 10px;
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
            }
            .record-button {
                background-color: #f44336;
                color: white;
            }
            .record-button:hover {
                background-color: #d32f2f;
            }
            .stop-button {
                background-color: #4CAF50;
                color: white;
            }
            .stop-button:hover {
                background-color: #45a049;
            }
            .edit-button {
                background-color: #2196F3;
                color: white;
            }
            .edit-button:hover {
                background-color: #1976D2;
            }
            .save-button {
                background-color: #4CAF50;
                color: white;
            }
            .save-button:hover {
                background-color: #45a049;
            }
            .status {
                margin: 10px 0;
                color: #666;
            }
            .transcription {
                min-height: 50px;
                padding: 10px;
                margin: 10px 0;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .transcription[contenteditable="true"] {
                background-color: #f9f9f9;
                border: 2px solid #2196F3;
                outline: none;
            }
        `;
        document.head.appendChild(style);

        // Get references to elements
        this.recordButton = this.container.querySelector('#recordButton');
        this.stopButton = this.container.querySelector('#stopButton');
        this.status = this.container.querySelector('#status');
        this.transcription = this.container.querySelector('#transcription');
        this.editButton = this.container.querySelector('#editButton');
        this.saveButton = this.container.querySelector('#saveButton');

        // Add event listeners
        this.editButton.onclick = () => this.toggleEdit();
        this.saveButton.onclick = () => this.saveTranscription();
    }

    async setupRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 48000,
                    sampleSize: 16,
                    latency: 0,
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true
                }
            });

            const mimeType = this.getSupportedMimeType();
            if (!mimeType) {
                throw new Error('No supported audio MIME type found');
            }

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 192000
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                await this.transcribeAudio(audioBlob, mimeType);
                this.audioChunks = [];
            };

            this.recordButton.onclick = () => this.startRecording();
            this.stopButton.onclick = () => this.stopRecording();
        } catch (error) {
            this.status.textContent = 'Error accessing microphone: ' + error.message;
            this.recordButton.disabled = true;
            console.error('Microphone error:', error);
        }
    }

    getSupportedMimeType() {
        const types = [
            'audio/mp4',
            'audio/mpeg',
            'audio/wav',
            'audio/webm',
            'audio/ogg'
        ];
        return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
    }

    startRecording() {
        this.audioChunks = [];
        this.mediaRecorder.start(1000);
        this.recordButton.style.display = 'none';
        this.stopButton.style.display = 'block';
        this.status.textContent = 'Recording...';
    }

    stopRecording() {
        this.mediaRecorder.stop();
        this.recordButton.style.display = 'block';
        this.stopButton.style.display = 'none';
        this.status.textContent = 'Processing...';
    }

    async transcribeAudio(audioBlob, mimeType) {
        try {
            const formData = new FormData();
            let extension = 'mp4';
            if (mimeType.includes('mpeg')) extension = 'mp3';
            if (mimeType.includes('wav')) extension = 'wav';
            if (mimeType.includes('webm')) extension = 'webm';
            if (mimeType.includes('ogg')) extension = 'ogg';

            formData.append('file', audioBlob, `recording.${extension}`);
            formData.append('model', 'whisper-1');

            this.status.textContent = 'Transcribing...';

            const response = await fetch(`${this.options.apiUrl}/transcribe`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();
            this.transcription.textContent = data.text;
            this.transcription.setAttribute('data-original-text', data.text);
            this.status.textContent = 'Transcription complete';
            
            // Show edit button and ensure it's properly initialized
            this.editButton.style.display = 'inline-block';
            this.editButton.disabled = false;
            console.log('Edit button should be visible now');
        } catch (error) {
            this.status.textContent = 'Error: ' + error.message;
            console.error('Transcription error:', error);
        }
    }

    toggleEdit() {
        const isEditing = this.transcription.contentEditable === 'true';
        console.log('Toggle edit called, current state:', isEditing);
        
        if (isEditing) {
            this.transcription.contentEditable = 'false';
            this.editButton.textContent = 'Edit';
            this.saveButton.style.display = 'none';
            this.transcription.textContent = this.transcription.getAttribute('data-original-text') || '';
        } else {
            this.transcription.contentEditable = 'true';
            this.transcription.focus();
            this.editButton.textContent = 'Cancel';
            this.saveButton.style.display = 'inline-block';
        }
    }

    async saveTranscription() {
        try {
            const editedText = this.transcription.textContent;
            console.log('Saving transcription:', editedText); // Debug log

            const response = await fetch(`${this.options.apiUrl}/save-transcription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: editedText })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Save error response:', errorText); // Debug log
                throw new Error(`Failed to save transcription: ${errorText}`);
            }

            const result = await response.json();
            console.log('Save response:', result); // Debug log

            this.transcription.setAttribute('data-original-text', editedText);
            this.transcription.contentEditable = 'false';
            this.editButton.textContent = 'Edit';
            this.saveButton.style.display = 'none';
            this.status.textContent = 'Transcription saved';
        } catch (error) {
            this.status.textContent = 'Error saving: ' + error.message;
            console.error('Save error:', error);
        }
    }
}

// Make it available globally
window.VoiceJournal = VoiceJournal; 