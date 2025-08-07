from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
import PyPDF2
from transformers import pipeline
from translate import Translator as LibreTranslator

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'txt'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Initialize local models
try:
    qa_pipeline = pipeline("question-answering", model="distilbert-base-cased-distilled-squad")
except:
    qa_pipeline = None

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def extract_text_from_pdf(filepath):
    text = ""
    with open(filepath, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text()
    return text

def extract_text_from_txt(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        return file.read()

def get_ai_response(question, context=None):
    if not qa_pipeline:
        return "Error: Question answering model not loaded. Please try again later."
    
    if not context:
        return "Please provide some context by uploading a document first."
    
    try:
        result = qa_pipeline(question=question, context=context)
        return result['answer']
    except Exception as e:
        return f"Error answering question: {str(e)}"

def translate_text(text, target_lang='en'):
    try:
        translator = LibreTranslator(to_lang=target_lang)
        translation = translator.translate(text)
        return translation
    except Exception as e:
        return f"Translation error: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    question = data.get('question')
    context = data.get('context', '')
    
    if not question:
        return jsonify({'error': 'No question provided'}), 400
    
    answer = get_ai_response(question, context)
    return jsonify({'answer': answer})

@app.route('/translate', methods=['POST'])
def translate_text_route():
    data = request.get_json()
    text = data.get('text')
    target_lang = data.get('target_lang', 'en')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    translated_text = translate_text(text, target_lang)
    return jsonify({'translated_text': translated_text})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            if filename.endswith('.pdf'):
                text = extract_text_from_pdf(filepath)
            elif filename.endswith('.txt'):
                text = extract_text_from_txt(filepath)
            else:
                return jsonify({'error': 'Unsupported file type'}), 400
            
            # Clean up
            os.remove(filepath)
            
            return jsonify({
                'text': text,
                'filename': filename
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'File type not allowed'}), 400

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)