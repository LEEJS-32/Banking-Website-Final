from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Load the trained fraud detection system
print("Loading fraud detection system...")
try:
    system = joblib.load('fraud_detection_system.joblib')
    model = system['model']
    risk_maps = system['risk_maps']
    avg_spending_map = system['avg_spending_map']
    global_mean = system['global_mean']
    optimal_threshold = system['optimal_threshold']
    feature_columns = system['columns']
    model_type = system['model_type']
    scaler = system.get('scaler', None)
    
    print(f"✅ Loaded {model_type} model")
    print(f"✅ Optimal threshold: {optimal_threshold:.4f}")
    print(f"✅ Feature columns: {len(feature_columns)}")
    print(f"✅ Risk maps loaded for: {list(risk_maps.keys())}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    exit(1)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': model_type,
        'threshold': optimal_threshold,
        'features': len(feature_columns)
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict fraud for a transaction
    """
    try:
        data = request.get_json()
        print(f"\n🔍 Received prediction request: {data}")
        
        # Extract input features
        amount = float(data.get('Amount', 0))
        time = int(data.get('Time', 12))
        gender = data.get('Gender', 'M')
        age = int(data.get('Age', 30))
        merchant_group = data.get('Merchant_Group', 'Other')
        country_transaction = data.get('Country_of_Transaction', 'United Kingdom')
        shipping_address = data.get('Shipping_Address', 'United Kingdom')
        country_residence = data.get('Country_of_Residence', 'United Kingdom')
        bank = data.get('Bank', 'HSBC')
        type_of_card = data.get('Type_of_Card', 'Visa')
        entry_mode = data.get('Entry_Mode', 'CVC')
        type_of_transaction = data.get('Type_of_Transaction', 'Online')
        
        # STEP 1: Calculate Category_Avg_Amount
        category_avg = avg_spending_map.get(merchant_group, avg_spending_map.get('Other', 100))
        
        # STEP 2: Calculate Amount_vs_Category_Avg
        amount_vs_category_avg = amount / category_avg if category_avg > 0 else 1.0
        
        # STEP 3: Calculate Age_Group
        if age <= 18:
            age_group = 0
        elif age <= 30:
            age_group = 1
        elif age <= 50:
            age_group = 2
        else:
            age_group = 3
        
        # STEP 4: Get risk scores from risk maps
        def get_risk(col_name, value):
            """Get risk score for a categorical value"""
            # Try exact column name first
            if col_name in risk_maps:
                return risk_maps[col_name].get(value, global_mean)
            
            # Try variations (handle 'Type of Transact' vs 'Type of Transaction')
            if col_name == 'Type of Transaction' and 'Type of Transact' in risk_maps:
                return risk_maps['Type of Transact'].get(value, global_mean)
            
            return global_mean
        
        type_of_card_risk = get_risk('Type of Card', type_of_card)
        entry_mode_risk = get_risk('Entry Mode', entry_mode)
        merchant_group_risk = get_risk('Merchant Group', merchant_group)
        country_transaction_risk = get_risk('Country of Transaction', country_transaction)
        shipping_address_risk = get_risk('Shipping Address', shipping_address)
        country_residence_risk = get_risk('Country of Residence', country_residence)
        bank_risk = get_risk('Bank', bank)
        type_of_transaction_risk = get_risk('Type of Transaction', type_of_transaction)
        
        # STEP 5: Create feature dictionary in exact order
        features_dict = {
            'Category_Avg_Amount': category_avg,
            'Amount_vs_Category_Avg': amount_vs_category_avg,
            'Age_Group': age_group,
            'Type of Card_Risk': type_of_card_risk,
            'Entry Mode_Risk': entry_mode_risk,
            'Merchant Group_Risk': merchant_group_risk,
            'Country of Transaction_Risk': country_transaction_risk,
            'Shipping Address_Risk': shipping_address_risk,
            'Country of Residence_Risk': country_residence_risk,
            'Bank_Risk': bank_risk,
            'Type of Transaction_Risk': type_of_transaction_risk,
            'Time': time,
            'Amount': amount,
            'Gender_M': 1 if gender == 'M' else 0
        }
        
        # Create DataFrame with features in correct order
        input_df = pd.DataFrame([features_dict])
        input_df = input_df.reindex(columns=feature_columns, fill_value=0)
        
        print(f"✅ Prepared features: {list(input_df.columns)}")
        print(f"   Values: {input_df.iloc[0].to_dict()}")
        
        # Make prediction
        if model_type == "Logistic Regression" and scaler:
            input_scaled = scaler.transform(input_df)
            fraud_prob = model.predict_proba(input_scaled)[:, 1][0]
        else:
            fraud_prob = model.predict_proba(input_df)[:, 1][0]
        
        is_fraud = fraud_prob >= optimal_threshold
        
        # Determine risk level
        if fraud_prob >= 0.7:
            risk_level = 'high'
        elif fraud_prob >= 0.4:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        # Generate human-readable reasons
        reasons = []
        
        if amount > 5000:
            reasons.append(f'Very high transaction amount (£{amount:,.2f})')
        elif amount > 1000:
            reasons.append(f'High transaction amount (£{amount:,.2f})')
        
        if amount_vs_category_avg > 10:
            reasons.append(f'Amount is {amount_vs_category_avg:.1f}x higher than category average')
        elif amount_vs_category_avg > 5:
            reasons.append(f'Amount is significantly above category average')
        
        if time < 6 or time > 23:
            reasons.append(f'Unusual transaction time ({time}:00)')
        
        if country_transaction_risk > 0.15:
            reasons.append(f'High-risk transaction country ({country_transaction})')
        
        if merchant_group_risk > 0.10:
            reasons.append(f'High-risk merchant category ({merchant_group})')
        
        if bank_risk > 0.05:
            reasons.append(f'Bank shows elevated risk pattern')
        
        if not reasons:
            reasons.append('Normal transaction pattern detected')
        
        result = {
            'is_fraud': bool(is_fraud),
            'fraud_probability': float(fraud_prob),
            'risk_level': risk_level,
            'confidence': float(fraud_prob if is_fraud else 1 - fraud_prob),
            'reasons': reasons,
            'merchant_group': merchant_group,
            'category_avg': float(category_avg),
            'model': model_type
        }
        
        print(f"🎯 Prediction: {'🚨 FRAUD' if is_fraud else '✅ SAFE'} (prob: {fraud_prob:.4f})")
        print(f"   Risk Level: {risk_level.upper()}")
        print(f"   Reasons: {reasons}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 FRAUD DETECTION API STARTING")
    print("="*60)
    print(f"Model: {model_type}")
    print(f"Threshold: {optimal_threshold:.4f}")
    print(f"Available endpoints:")
    print("  - GET  /health  - Check API status")
    print("  - POST /predict - Detect fraud")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
