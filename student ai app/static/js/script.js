// static/js/script.js
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            // Reset document section when switching away
            if (tabId !== 'document') {
                resetDocumentSection();
            }
        });
    });
    
    // Q&A Section
    const questionInput = document.getElementById('question-input');
    const askButton = document.getElementById('ask-button');
    const chatHistory = document.getElementById('chat-history');
    
    askButton.addEventListener('click', sendQuestion);
    questionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendQuestion();
        }
    });
    
    function sendQuestion() {
        const question = questionInput.value.trim();
        if (!question) return;
        
        // Add user message to chat
        addMessage(question, 'user');
        questionInput.value = '';
        
        // Show loading state
        askButton.disabled = true;
        askButton.innerHTML = '<i class="fas fa-spinner loading"></i> Processing';
        
        // Get context from document section if available
        const extractedText = document.getElementById('extracted-text').textContent.trim();
        const context = extractedText || '';
        
        // Send question to backend
        fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question,
                context: context
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            addMessage(data.answer, 'ai');
        })
        .catch(error => {
            addMessage(`Error: ${error.message}`, 'ai');
        })
        .finally(() => {
            askButton.disabled = false;
            askButton.innerHTML = '<i class="fas fa-paper-plane"></i> Ask';
        });
    }
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            ${text}
            <span class="message-time">${timeString}</span>
        `;
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    // Translator Section
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const swapButton = document.getElementById('swap-langs');
    const sourceText = document.getElementById('source-text');
    const translatedText = document.getElementById('translated-text');
    const translateButton = document.getElementById('translate-button');
    
    swapButton.addEventListener('click', function() {
        const tempLang = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempLang;
        
        if (sourceText.value.trim()) {
            translateText();
        }
    });
    
    translateButton.addEventListener('click', translateText);
    
    function translateText() {
        const text = sourceText.value.trim();
        if (!text) return;
        
        translateButton.disabled = true;
        translateButton.innerHTML = '<i class="fas fa-spinner loading"></i> Translating';
        
        fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                target_lang: targetLang.value
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            translatedText.value = data.translated_text;
            
            // If source language was auto, update it to detected language
            if (sourceLang.value === 'auto' && data.src_lang) {
                sourceLang.value = data.src_lang;
            }
        })
        .catch(error => {
            translatedText.value = `Translation error: ${error.message}`;
        })
        .finally(() => {
            translateButton.disabled = false;
            translateButton.innerHTML = '<i class="fas fa-language"></i> Translate';
        });
    }
    
    // Document Section
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const extractedText = document.getElementById('extracted-text');
    const useForQaButton = document.getElementById('use-for-qa');
    const translateDocButton = document.getElementById('translate-doc');
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('active');
    }
    
    function unhighlight() {
        dropZone.classList.remove('active');
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            fileInput.files = files;
            handleFiles();
        }
    }
    
    function handleFiles() {
        const file = fileInput.files[0];
        if (!file) return;
        
        // Check file type
        const validTypes = ['application/pdf', 'text/plain'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
            alert('Please upload a PDF or text file.');
            return;
        }
        
        // Show loading state
        dropZone.innerHTML = '<i class="fas fa-spinner loading"></i><p>Processing document...</p>';
        
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            extractedText.textContent = data.text;
            useForQaButton.disabled = false;
            translateDocButton.disabled = false;
            
            // Reset drop zone
            dropZone.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Drag & drop your PDF or text file here</p>
                <p>or</p>
                <input type="file" id="file-input" accept=".pdf,.txt">
                <label for="file-input" class="browse-btn">Browse Files</label>
            `;
            
            // Re-attach event listeners
            document.getElementById('file-input').addEventListener('change', handleFiles);
        })
        .catch(error => {
            extractedText.textContent = `Error: ${error.message}`;
            dropZone.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Drag & drop your PDF or text file here</p>
                <p>or</p>
                <input type="file" id="file-input" accept=".pdf,.txt">
                <label for="file-input" class="browse-btn">Browse Files</label>
            `;
            document.getElementById('file-input').addEventListener('change', handleFiles);
        });
    }
    
    useForQaButton.addEventListener('click', function() {
        // Switch to Q&A tab
        document.querySelector('.tab-button[data-tab="qa"]').click();
        
        // Focus on question input
        questionInput.focus();
    });
    
    translateDocButton.addEventListener('click', function() {
        const text = extractedText.textContent.trim();
        if (!text) return;
        
        // Switch to translator tab
        document.querySelector('.tab-button[data-tab="translate"]').click();
        
        // Set the text to translate
        sourceText.value = text;
        
        // Focus on source text
        sourceText.focus();
    });
    
    function resetDocumentSection() {
        fileInput.value = '';
        extractedText.textContent = '';
        useForQaButton.disabled = true;
        translateDocButton.disabled = true;
    }
});