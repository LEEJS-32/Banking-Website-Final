"""
Fingerprint Scanner API for Banking System
Integrates R307 fingerprint scanner with the banking website
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import serial
import time
import struct
import numpy as np
import cv2
import base64
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ==========================================
# CONFIGURATION
# ==========================================
SCANNER_PORT = 'COM3'
MATCH_THRESHOLD = 25
DATABASE_FILE = 'fingerprint_db.json'

# ==========================================
# R307 DRIVER
# ==========================================
class R307:
    def __init__(self, port):
        self.HEADER = b'\xEF\x01'
        self.ADDR = b'\xFF\xFF\xFF\xFF'
        self.connected = False
        self.ser = None
        self.port = port  # Store port for reconnection
        
        # Try to connect with retries
        self._connect()
    
    def _connect(self):
        """Internal method to connect to scanner"""
        for attempt in range(3):
            try:
                if attempt > 0:
                    time.sleep(0.5)  # Wait before retry
                
                # Close existing connection if any
                if self.ser and self.ser.is_open:
                    try:
                        self.ser.close()
                    except:
                        pass
                    
                self.ser = serial.Serial(
                    port=self.port, 
                    baudrate=57600, 
                    timeout=2,
                    write_timeout=2,
                    dsrdtr=False,
                    rtscts=False
                )
                self.connected = True
                print(f"[+] Successfully connected to {self.port}")
                return True
            except serial.SerialException as e:
                if attempt == 2:  # Last attempt
                    print(f"[-] Could not connect to {self.port} after 3 attempts")
                    print(f"    Error: {str(e)}")
                    self.connected = False
            except Exception as e:
                if attempt == 2:
                    print(f"[-] Unexpected error: {str(e)}")
                    self.connected = False
        return False
    
    def reconnect(self):
        """Try to reconnect to the scanner"""
        print(f"[*] Attempting to reconnect to {self.port}...")
        return self._connect()

    def send_cmd(self, pid, content):
        if not self.connected:
            return False
        try:
            length = len(content) + 2
            checksum = (pid + length + sum(content)) & 0xFFFF
            pkt = self.HEADER + self.ADDR + struct.pack('>B', pid) + struct.pack('>H', length) + content + struct.pack('>H', checksum)
            self.ser.write(pkt)
            return True
        except (serial.SerialException, OSError) as e:
            print(f"[!] Communication error: {e}")
            self.connected = False
            return False

    def get_response(self):
        if not self.connected:
            return None
        try:
            head = self.ser.read(2)
            if head != self.HEADER: return None
            self.ser.read(4)
            pid = self.ser.read(1)[0]
            leng = struct.unpack('>H', self.ser.read(2))[0]
            content = self.ser.read(leng-2)
            self.ser.read(2)
            return content
        except (serial.SerialException, OSError) as e:
            print(f"[!] Communication error: {e}")
            self.connected = False
            return None

    def capture(self, timeout=5):
        if not self.connected:
            return False
        print(">> Waiting for finger...")
        self.send_cmd(0x01, b'\x01')
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            time.sleep(0.1)
            resp = self.get_response()
            if resp and resp[0] == 0x00:
                print("   [+] Captured.")
                return True
        return False

    def download(self):
        if not self.connected:
            return None
        print("   [*] Downloading...")
        self.send_cmd(0x01, b'\x0a')
        resp = self.get_response()
        if not resp or resp[0] != 0x00: return None
        
        raw = bytearray()
        while len(raw) < 36864:
            if self.ser.read(2) != self.HEADER: continue
            self.ser.read(4)
            pid = self.ser.read(1)[0]
            leng = struct.unpack('>H', self.ser.read(2))[0]
            raw.extend(self.ser.read(leng-2))
            self.ser.read(2)
            if pid == 0x08: break
        return raw

    def to_image(self, raw_data):
        arr = np.frombuffer(raw_data, dtype=np.uint8)
        hi = (arr >> 4) * 17
        lo = (arr & 0x0F) * 17
        img = np.dstack((hi, lo)).flatten().reshape(288, 256)
        return img.astype(np.uint8)

# ==========================================
# IMAGE PROCESSING
# ==========================================
def process_image(img):
    img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    img = clahe.apply(img)
    h, w = img.shape
    img = img[5:h-5, 5:w-5]
    return img

def get_match_score(img1, img2):
    sift = cv2.SIFT_create()
    kp1, des1 = sift.detectAndCompute(img1, None)
    kp2, des2 = sift.detectAndCompute(img2, None)

    if des1 is None or des2 is None:
        return 0

    index_params = dict(algorithm=1, trees=5)
    search_params = dict(checks=50)
    flann = cv2.FlannBasedMatcher(index_params, search_params)
    
    try:
        matches = flann.knnMatch(des1, des2, k=2)
    except:
        return 0

    good_matches = []
    for m, n in matches:
        if m.distance < 0.75 * n.distance:
            good_matches.append(m)

    return len(good_matches)

def image_to_base64(img):
    """Convert numpy image to base64 string"""
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')

def base64_to_image(b64_string):
    """Convert base64 string to numpy image"""
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

# ==========================================
# DATABASE FUNCTIONS
# ==========================================
def load_database():
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_database(db):
    with open(DATABASE_FILE, 'w') as f:
        json.dump(db, f)

# ==========================================
# SCANNER INSTANCE
# ==========================================
scanner = R307(SCANNER_PORT)

# ==========================================
# API ENDPOINTS
# ==========================================

@app.route('/health', methods=['GET'])
def health():
    """Check if fingerprint scanner is connected, attempt reconnection if disconnected"""
    # If disconnected, try to reconnect
    if not scanner.connected:
        scanner.reconnect()
    
    return jsonify({
        'status': 'ok' if scanner.connected else 'disconnected',
        'scanner': 'R307',
        'port': SCANNER_PORT,
        'auto_reconnect': True
    })

@app.route('/reconnect', methods=['POST'])
def reconnect():
    """Manually trigger scanner reconnection"""
    success = scanner.reconnect()
    return jsonify({
        'success': success,
        'status': 'ok' if scanner.connected else 'disconnected',
        'message': 'Reconnected successfully' if success else 'Failed to reconnect. Check if scanner is plugged in.'
    })

@app.route('/enroll', methods=['POST'])
def enroll_fingerprint():
    """
    Enroll a new fingerprint
    Body: { "userId": "user_email_or_id" }
    """
    try:
        data = request.json
        user_id = data.get('userId')
        
        if not user_id:
            return jsonify({'error': 'userId is required'}), 400
        
        if not scanner.connected:
            return jsonify({'error': 'Scanner not connected'}), 500
        
        # Capture fingerprint
        if not scanner.capture():
            return jsonify({'error': 'Failed to capture fingerprint. Please place finger on scanner.'}), 400
        
        # Download image
        raw = scanner.download()
        if not raw:
            return jsonify({'error': 'Failed to download fingerprint image'}), 500
        
        # Process image
        img = scanner.to_image(raw)
        processed_img = process_image(img)
        
        # Convert to base64 for storage
        img_b64 = image_to_base64(processed_img)
        
        # Load database
        db = load_database()
        
        # Store fingerprint
        db[user_id] = {
            'fingerprint': img_b64,
            'enrolled_at': datetime.now().isoformat(),
            'device': 'R307'
        }
        
        save_database(db)
        
        return jsonify({
            'success': True,
            'message': f'Fingerprint enrolled successfully for {user_id}',
            'userId': user_id
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/verify', methods=['POST'])
def verify_fingerprint():
    """
    Verify a fingerprint against enrolled users
    Body: { "userId": "user_email_or_id" } (optional - if not provided, matches against all)
    """
    try:
        data = request.json
        user_id = data.get('userId')
        
        if not scanner.connected:
            return jsonify({'error': 'Scanner not connected'}), 500
        
        # Capture fingerprint
        if not scanner.capture():
            return jsonify({'error': 'Failed to capture fingerprint. Please place finger on scanner.'}), 400
        
        # Download image
        raw = scanner.download()
        if not raw:
            return jsonify({'error': 'Failed to download fingerprint image'}), 500
        
        # Process image
        img = scanner.to_image(raw)
        processed_img = process_image(img)
        
        # Load database
        db = load_database()
        
        if not db:
            return jsonify({'error': 'No fingerprints enrolled in database'}), 400
        
        # If userId provided, check only that user
        if user_id:
            if user_id not in db:
                return jsonify({
                    'verified': False,
                    'message': f'No fingerprint enrolled for {user_id}'
                }), 404
            
            stored_img = base64_to_image(db[user_id]['fingerprint'])
            score = get_match_score(processed_img, stored_img)
            
            if score > MATCH_THRESHOLD:
                return jsonify({
                    'verified': True,
                    'userId': user_id,
                    'score': int(score),
                    'message': 'Fingerprint verified successfully'
                })
            else:
                return jsonify({
                    'verified': False,
                    'score': int(score),
                    'message': 'Fingerprint does not match'
                })
        
        # If no userId, match against all
        best_score = 0
        best_user = None
        
        for uid, user_data in db.items():
            stored_img = base64_to_image(user_data['fingerprint'])
            score = get_match_score(processed_img, stored_img)
            
            if score > best_score:
                best_score = score
                best_user = uid
        
        if best_score > MATCH_THRESHOLD:
            return jsonify({
                'verified': True,
                'userId': best_user,
                'score': int(best_score),
                'message': f'Fingerprint matched: {best_user}'
            })
        else:
            return jsonify({
                'verified': False,
                'score': int(best_score),
                'message': 'No matching fingerprint found'
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/remove', methods=['POST'])
def remove_fingerprint():
    """
    Remove an enrolled fingerprint
    Body: { "userId": "user_email_or_id" }
    """
    try:
        data = request.json
        user_id = data.get('userId')
        
        if not user_id:
            return jsonify({'error': 'userId is required'}), 400
        
        db = load_database()
        
        if user_id not in db:
            return jsonify({'error': f'No fingerprint found for {user_id}'}), 404
        
        del db[user_id]
        save_database(db)
        
        return jsonify({
            'success': True,
            'message': f'Fingerprint removed for {user_id}'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/list', methods=['GET'])
def list_enrolled():
    """List all enrolled fingerprints"""
    try:
        db = load_database()
        users = []
        
        for user_id, user_data in db.items():
            users.append({
                'userId': user_id,
                'enrolled_at': user_data.get('enrolled_at'),
                'device': user_data.get('device', 'Unknown')
            })
        
        return jsonify({
            'total': len(users),
            'users': users
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# RUN SERVER
# ==========================================
if __name__ == '__main__':
    print("=" * 50)
    print("Fingerprint Scanner API Server")
    print("=" * 50)
    print(f"Scanner Port: {SCANNER_PORT}")
    print(f"Match Threshold: {MATCH_THRESHOLD}")
    print(f"Scanner Status: {'Connected' if scanner.connected else 'Disconnected'}")
    print("=" * 50)
    print("\nStarting server on http://localhost:5002")
    print("\nAvailable endpoints:")
    print("  GET  /health  - Check scanner status")
    print("  POST /enroll  - Enroll fingerprint")
    print("  POST /verify  - Verify fingerprint")
    print("  POST /remove  - Remove fingerprint")
    print("  GET  /list    - List enrolled users")
    print("=" * 50)
    
    # Disable debug mode to prevent auto-reloader from blocking COM port
    app.run(host='0.0.0.0', port=5002, debug=False)

