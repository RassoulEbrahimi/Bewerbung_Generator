import re
import os
import logging
import time
from datetime import datetime
from functools import wraps
import tiktoken
from flask import Flask, request, jsonify, session, make_response
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import openai
from tenacity import retry, stop_after_attempt, wait_exponential
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf.csrf import CSRFProtect, generate_csrf

# Keep existing environment variable loading and logging configuration
load_dotenv()
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app (keep existing configuration)
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///xbewerbung.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.getenv('SECRET_KEY') or 'your_fallback_secret_key_here'

app.config['SESSION_COOKIE_SECURE'] = True  # for HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Allows cross-site cookies

# Initialize CSRF protection
csrf = CSRFProtect(app)
csrf.init_app(app)

# Keep existing database initialization
db = SQLAlchemy(app)

# MODIFIED: Update CORS configuration to include your GitHub Pages URL and local development URL
CORS(app, resources={r"/*": {
    "origins": ["https://rassoulebrahimi.github.io", "https://rassoulebrahimi.github.io/xBewerbung", "https://xbewerbung.onrender.com", "http://localhost:5000"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "X-CSRFToken"],  # Changed from "X-CSRF-Token" to "X-CSRFToken"
    "supports_credentials": True
}})

# Keep existing OpenAI client initialization
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Lebenslauf(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Stellenanzeige(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Bewerbung(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    lebenslauf_id = db.Column(db.Integer, db.ForeignKey('lebenslauf.id'), nullable=False)
    stellenanzeige_id = db.Column(db.Integer, db.ForeignKey('stellenanzeige.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    cost_info = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create the database and tables
with app.app_context():
    db.create_all()

def calculate_cost(input_tokens, output_tokens, model="gpt-3.5-turbo-0125", is_batch=False):
    input_price = 0.50
    output_price = 1.50
    
    input_millions = input_tokens / 1_000_000
    output_millions = output_tokens / 1_000_000
    
    total_cost = (input_millions * input_price) + (output_millions * output_price)
    
    if is_batch:
        total_cost *= 0.5
    
    return total_cost

def rate_limit(max_per_minute):
    min_interval = 60.0 / max_per_minute
    last_called = [0.0]
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            left_to_wait = min_interval - elapsed
            if left_to_wait > 0:
                time.sleep(left_to_wait)
            ret = func(*args, **kwargs)
            last_called[0] = time.time()
            return ret
        return wrapper
    return decorator

def num_tokens_from_string(string: str, encoding_name: str = "cl100k_base") -> int:
    encoding = tiktoken.get_encoding(encoding_name)
    return len(encoding.encode(string))

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def call_openai_api(prompt):
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Sie sind ein professioneller Bewerbungsschreiber."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {str(e)}")
        raise

def extract_key_information(lebenslauf, stellenanzeige):
    info = {
        "applicant_name": "",
        "applicant_address": "",
        "job_position": "",
        "company_name": "",
        "company_address": "",
        "requirements": [],
        "responsibilities": []
    }

    lebenslauf_lines = lebenslauf.split('\n')
    info["applicant_name"] = lebenslauf_lines[0].strip()
    info["applicant_address"] = "\n".join(lebenslauf_lines[1:4]).strip()

    position_match = re.search(r'Stellenanzeige:\s*([\w\s]+)\s*\(m/w/d\)', stellenanzeige)
    if position_match:
        info["job_position"] = position_match.group(1).strip()

    company_match = re.search(r'Unternehmen:\s*([\w\s]+)', stellenanzeige)
    if company_match:
        info["company_name"] = company_match.group(1).strip()

    address_match = re.search(r'([\w\s]+\n\d{5}\s*[\w\s]+)', stellenanzeige)
    if address_match:
        info["company_address"] = address_match.group(1).strip()

    req_section = re.search(r'Ihr Profil:(.*?)(?=Wir bieten:|$)', stellenanzeige, re.DOTALL)
    if req_section:
        info["requirements"] = [req.strip() for req in req_section.group(1).split('\n') if req.strip()]

    resp_section = re.search(r'Aufgaben:(.*?)(?=Ihr Profil:|$)', stellenanzeige, re.DOTALL)
    if resp_section:
        info["responsibilities"] = [resp.strip() for resp in resp_section.group(1).split('\n') if resp.strip()]

    return info

def generate_bewerbung(lebenslauf, stellenanzeige):
    info = extract_key_information(lebenslauf, stellenanzeige)
    
    prompt = f"""
    Erstellen Sie ein professionelles Bewerbungsanschreiben auf Deutsch basierend auf folgendem Lebenslauf und der Stellenanzeige:

    Bewerber: {info['applicant_name']}
    Position: {info['job_position']}
    Unternehmen: {info['company_name']}
    Adresse: {info['company_address']}

    Lebenslauf:
    {lebenslauf}

    Stellenanzeige:
    {stellenanzeige}

    Anforderungen:
    {', '.join(info['requirements'])}

    Aufgaben:
    {', '.join(info['responsibilities'])}

    Das Anschreiben sollte folgende Punkte enthalten:
    1. Anrede (falls ein Ansprechpartner bekannt ist, ansonsten "Sehr geehrte Damen und Herren,")
    2. Einleitung mit Bezug auf die Stelle
    3. 2-3 Absätze zu relevanten Qualifikationen und Erfahrungen, die auf die Anforderungen und Aufgaben eingehen
    4. Abschluss mit Gesprächswunsch
    5. Grußformel

    Bitte verwenden Sie durchgehend die "Ich"-Form und vermeiden Sie Platzhaltertexte.
    Das Anschreiben sollte nicht länger als 500 Wörter sein.
    Beginnen Sie direkt mit der Anrede, ohne vorherige Adressinformationen oder Überschriften.
    """

    prompt_tokens = num_tokens_from_string(prompt)
    
    try:
        bewerbung = call_openai_api(prompt)
        
        completion_tokens = num_tokens_from_string(bewerbung)
        total_tokens = prompt_tokens + completion_tokens
        
        cost = calculate_cost(prompt_tokens, completion_tokens)
        
        logger.info(f"Tokens used: {total_tokens} (Prompt: {prompt_tokens}, Completion: {completion_tokens})")
        logger.info(f"Estimated cost: ${cost:.6f}")
        
        formatted_bewerbung = format_bewerbung(bewerbung, info)
        formatted_bewerbung += f"\n\nGeschätzte Kosten für diese Bewerbung: ${cost:.6f}"
        
        return formatted_bewerbung, None, cost
    except Exception as e:
        error_message = f"Es ist ein Fehler bei der Generierung des Anschreibens aufgetreten: {str(e)}"
        logger.error(error_message)
        return None, error_message, None

def format_bewerbung(bewerbung, info):
    current_date = datetime.now().strftime('%d.%m.%Y')
    header = f"""{info['applicant_name']}
    {info['applicant_address']}

    {info['company_name']}
    {info['company_address']}

    {current_date}

    Bewerbung als {info['job_position']}"""

    full_bewerbung = header + bewerbung

    if full_bewerbung.count("Mit freundlichen Grüßen") > 1:
        full_bewerbung = full_bewerbung.rsplit("Mit freundlichen Grüßen", 1)[0] + "Mit freundlichen Grüßen\n\n" + info['applicant_name']
    
    return full_bewerbung.strip()

# MODIFIED: Update login_required decorator to include CSRF protection
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        if 'user_id' not in session:
            return jsonify({"error": "Login required"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Add a route to get CSRF token
@app.route('/get-csrf-token', methods=['GET'])
def get_csrf_token():
    try:
        token = generate_csrf()
        return jsonify({'csrf_token': token})
    except Exception as e:
        app.logger.error(f"Error generating CSRF token: {str(e)}")
        return jsonify({'error': 'Failed to generate CSRF token'}), 500

# MODIFIED: Update register route
@app.route('/register', methods=['POST', 'OPTIONS'])
@csrf.exempt  # Exempt this route from CSRF protection as it's the initial point of contact
def register():
    if request.method == 'OPTIONS':
        return '', 204
    
    app.logger.info(f"Received {request.method} request for /register")
    app.logger.info(f"Headers: {request.headers}")
    
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already registered"}), 400
    
    new_user = User(email=data['email'], name=data.get('name'))
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "User registered successfully"}), 201

# MODIFIED: Update login route
@app.route('/login', methods=['POST', 'OPTIONS'])
@csrf.exempt  # Exempt this route from CSRF protection as it's the initial point of contact
def login():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        app.logger.info("Login attempt received")
        data = request.json
        app.logger.info(f"Login data: {data}")
        
        if not data or 'email' not in data or 'password' not in data:
            app.logger.error("Invalid login data received")
            return jsonify({"error": "Ungültige Anmeldedaten"}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        app.logger.info(f"User found: {user is not None}")
        
        if user and user.check_password(data['password']):
            session['user_id'] = user.id
            user.last_login = datetime.utcnow()
            db.session.commit()
            app.logger.info(f"Login successful for user: {user.id}")
            return jsonify({"message": "Erfolgreich angemeldet"}), 200
        
        app.logger.warning(f"Failed login attempt for email: {data.get('email')}")
        return jsonify({"error": "Ungültige E-Mail oder Passwort"}), 401
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({"error": "Ein unerwarteter Fehler ist aufgetreten"}), 500
    

@app.route('/logout', methods=['POST', 'OPTIONS'])
@csrf.exempt  # Temporarily exempt from CSRF protection for debugging
def logout():
    if request.method == 'OPTIONS':
        return '', 204
    
    app.logger.info(f"Logout attempt. Session: {session}")
    app.logger.info(f"Request headers: {request.headers}")
    app.logger.info(f"Request data: {request.get_data()}")
    
    if 'user_id' not in session:
        app.logger.warning("Logout attempted without user_id in session")
        return jsonify({"error": "Sie sind nicht angemeldet."}), 401  # Changed to 401 Unauthorized
    
    try:
        session.pop('user_id', None)
        app.logger.info("User successfully logged out")
        return jsonify({"message": "Erfolgreich abgemeldet"}), 200
    except Exception as e:
        app.logger.error(f"Error during logout: {str(e)}")
        return jsonify({"error": "Ein Fehler ist beim Abmelden aufgetreten."}), 500


# MODIFIED: Update generate_bewerbung route to include CSRF protection
@app.route('/generate_bewerbung', methods=['POST', 'OPTIONS'])
@csrf.exempt  # Exempt this route from CSRF protection as it's handled on the client-side
@rate_limit(max_per_minute=10)
@login_required
def api_generate_bewerbung():
    if request.method == 'OPTIONS':
        return '', 204  # No content needed for preflight request
    
    try:
        logger.info("Received request for generate_bewerbung")
        start_time = time.time()

        data = request.json
        if not data:
            logger.warning("No data received in request")
            return jsonify({"error": "Keine Daten erhalten. Bitte senden Sie einen gültigen JSON-Body."}), 400

        lebenslauf = data.get('lebenslauf', '')
        stellenanzeige = data.get('stellenanzeige', '')

        if not lebenslauf or not stellenanzeige:
            logger.warning("Missing lebenslauf or stellenanzeige in request")
            return jsonify({"error": "Lebenslauf und Stellenanzeige sind erforderlich."}), 400

        if len(lebenslauf) > 5000 or len(stellenanzeige) > 5000:
            logger.warning("Lebenslauf or stellenanzeige exceeds 5000 characters")
            return jsonify({"error": "Lebenslauf oder Stellenanzeige zu lang. Maximal 5000 Zeichen erlaubt."}), 400

        bewerbung, error_message, cost = generate_bewerbung(lebenslauf, stellenanzeige)
        
        if error_message:
            return jsonify({"error": error_message}), 500

        # Save the generated Bewerbung
        user_id = session['user_id']
        new_lebenslauf = Lebenslauf(user_id=user_id, content=lebenslauf)
        new_stellenanzeige = Stellenanzeige(user_id=user_id, content=stellenanzeige)
        db.session.add(new_lebenslauf)
        db.session.add(new_stellenanzeige)
        db.session.flush()

        new_bewerbung = Bewerbung(
            user_id=user_id,
            lebenslauf_id=new_lebenslauf.id,
            stellenanzeige_id=new_stellenanzeige.id,
            content=bewerbung,
            cost_info=f"${cost:.6f}"
        )
        db.session.add(new_bewerbung)
        db.session.commit()

        response = {
            "bewerbung": bewerbung,
            "estimated_cost": f"${cost:.6f}",
            "bewerbung_id": new_bewerbung.id
        }

        logger.info(f"Request processed in {time.time() - start_time:.2f} seconds")
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Ein unerwarteter Fehler ist aufgetreten."}), 500

@app.route('/')
def index():
    return "Hello, World! Application is running"

@app.route('/test', methods=['GET', 'OPTIONS'])
def test():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers['Access-Control-Allow-Origin'] = 'https://rassoulebrahimi.github.io'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200
    return jsonify({"message": "Test successful"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)))