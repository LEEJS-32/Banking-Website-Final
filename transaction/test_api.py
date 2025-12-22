from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

print("Loading fraud detection system...")
system = joblib.load('fraud_detection_system.joblib')
model = system['model']
model_type = system['model_type']
optimal_threshold = system['optimal_threshold']
print(f"✅ Model loaded: {model_type}")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model': model_type,
        'threshold': float(optimal_threshold)
    })

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working!'})

if __name__ == '__main__':
    print("Starting API on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
