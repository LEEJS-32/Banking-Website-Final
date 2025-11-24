import pandas as pd
import numpy as np
import joblib
import shap
import warnings
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_recall_curve, classification_report

# Suppress warnings
warnings.filterwarnings('ignore')

# ==============================================================================
# 1. LOAD & PROCESS DATA
# ==============================================================================
print("[1/5] Loading and Processing Data...")
file_path = 'data/CreditCardData.csv'

try:
    df = pd.read_csv(file_path)
    df.columns = df.columns.str.strip()
    # Clean Amount
    df['Amount'] = df['Amount'].astype(str).str.replace('£', '', regex=False)
    df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce')
    # Clean Time
    df['Time'] = pd.to_numeric(df['Time'], errors='coerce')
except FileNotFoundError:
    print("Error: File not found.")
    exit()

# ==============================================================================
# 1.5 DISPLAY DISTINCT VALUES (For Your Website Dropdowns)
# ==============================================================================
print("\n[1.5/5] 📋 EXTRACTING DATA FOR WEBSITE DROPDOWNS...")
print("      (Use these lists to populate your HTML Select options)\n")

dropdown_cols = [
    'Merchant Group', 
    'Country of Transaction', 
    'Country of Residence', 
    'Bank', 
    'Type of Transaction', 
    'Entry Mode', 
    'Type of Card'
]

for col in dropdown_cols:
    # Handle column name variations (e.g. Type of Transact)
    actual_col = col
    if col not in df.columns:
        if col == 'Type of Transaction' and 'Type of Transact' in df.columns:
            actual_col = 'Type of Transact'
        else:
            continue # Column not found
            
    unique_vals = df[actual_col].dropna().unique()
    print(f" -> [{col}] ({len(unique_vals)} Options):")
    # Print list neatly
    print(f"    {list(unique_vals)[:10]} {'... and more' if len(unique_vals) > 10 else ''}")
    print("-" * 50)

print("\n")

# ==============================================================================
# FEATURE ENGINEERING & RISK SCORING
# ==============================================================================
# 1. Spending Averages
avg_spending_map = df.groupby('Merchant Group')['Amount'].mean().to_dict()
df['Category_Avg_Amount'] = df['Merchant Group'].map(avg_spending_map)
df['Amount_vs_Category_Avg'] = df['Amount'] / df['Category_Avg_Amount']

# 2. Age Groups
df['Age_Group'] = pd.cut(df['Age'], bins=[0, 18, 30, 50, 150], labels=[0, 1, 2, 3]).astype(int)

# 3. Risk Scoring (Target Encoding)
target_col = 'Fraud'
cat_cols = ['Type of Card', 'Entry Mode', 'Merchant Group', 'Country of Transaction', 
            'Shipping Address', 'Country of Residence', 'Bank', 'Type of Transaction']
actual_cat_cols = [c for c in cat_cols if c in df.columns]
if 'Type of Transact' in df.columns: actual_cat_cols.append('Type of Transact')

saved_risk_maps = {}
global_mean = df[target_col].mean()

for col in actual_cat_cols:
    risk_map = df.groupby(col)[target_col].mean()
    saved_risk_maps[col] = risk_map.to_dict()
    df[f'{col}_Risk'] = df[col].map(risk_map).fillna(global_mean)

# --- Final Cleanup ---
cols_to_drop = actual_cat_cols + ['Transaction ID', 'Date', 'Day of Week', 'Age']
df = df.drop(columns=cols_to_drop, errors='ignore')
df = pd.get_dummies(df, columns=['Gender'], drop_first=True)
df = df.fillna(0)

# Save columns for export
feature_columns = df.drop(target_col, axis=1).columns.tolist()

# ==============================================================================
# 2. TRAIN & COMPARE MODELS
# ==============================================================================
print("[2/5] Training 4 Models to find the best one...")

X = df.drop(target_col, axis=1)
y = df[target_col]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Scaler (for Logistic Regression only)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Imbalance Ratio
ratio = float(np.sum(y_train == 0)) / np.sum(y_train == 1)

models = {
    "Logistic Regression": LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42),
    "Random Forest": RandomForestClassifier(class_weight='balanced', n_estimators=100, random_state=42, n_jobs=-1),
    "XGBoost": XGBClassifier(scale_pos_weight=ratio, n_estimators=200, max_depth=6, learning_rate=0.05, random_state=42, n_jobs=-1),
    "LightGBM": LGBMClassifier(scale_pos_weight=ratio, n_estimators=200, learning_rate=0.05, random_state=42, n_jobs=-1, verbose=-1)
}

# Selection Logic
best_f1 = 0
best_model = None
best_name = ""
best_threshold = 0.5

print(f"\n{'Model':<20} | {'F1 Score':<8} | {'Precision':<10} | {'Recall':<8}")
print("-" * 55)

for name, model in models.items():
    if name == "Logistic Regression":
        model.fit(X_train_scaled, y_train)
        y_prob = model.predict_proba(X_test_scaled)[:, 1]
    else:
        model.fit(X_train, y_train)
        y_prob = model.predict_proba(X_test)[:, 1]
    
    # Optimize Threshold
    precision, recall, thresholds = precision_recall_curve(y_test, y_prob)
    f1_scores = np.nan_to_num(2 * recall * precision / (recall + precision))
    
    best_idx = np.argmax(f1_scores)
    curr_f1 = f1_scores[best_idx]
    
    print(f"{name:<20} | {curr_f1:.4f}   | {precision[best_idx]:.4f}     | {recall[best_idx]:.4f}")
    
    if curr_f1 > best_f1:
        best_f1 = curr_f1
        best_model = model
        best_name = name
        best_threshold = thresholds[best_idx]

# ==============================================================================
# 3. SAVE THE WINNER
# ==============================================================================
print(f"\n[3/5] 🏆 WINNER: {best_name} (Threshold: {best_threshold:.4f})")

system_bundle = {
    "model": best_model,
    "risk_maps": saved_risk_maps,
    "avg_spending_map": avg_spending_map,
    "global_mean": global_mean,
    "optimal_threshold": best_threshold,
    "columns": feature_columns,
    "model_type": best_name
}
if best_name == "Logistic Regression":
    system_bundle["scaler"] = scaler

joblib.dump(system_bundle, 'fraud_detection_system.joblib')
print(" -> System Saved.")

# ==============================================================================
# 4. SHAP EXPLAINABILITY
# ==============================================================================
print("\n[4/5] Initializing SHAP Explainer...")

if best_name in ["XGBoost", "LightGBM", "Random Forest"]:
    explainer = shap.TreeExplainer(best_model)
else:
    masker = shap.maskers.Independent(data=X_train_scaled)
    explainer = shap.LinearExplainer(best_model, masker=masker)

print(" -> SHAP Explainer Ready.")

# ==============================================================================
# 5. LIVE SIMULATION
# ==============================================================================
print("\n[5/5] SIMULATING A FRAUDULENT TRANSACTION...")

# Fake Fraud: Electronics (£5000) in Russia at 3 AM
# I increased the values here so you can see a "Block" and "Reason" in the terminal
fraud_input = pd.DataFrame([{
    'Category_Avg_Amount': 200.0,
    'Amount_vs_Category_Avg': 25.0,  # 12.5x higher (Suspicious)
    'Age_Group': 1,
    'Type of Card_Risk': 0.04,
    'Entry Mode_Risk': 0.04,
    'Merchant Group_Risk': 0.15,
    'Country of Transaction_Risk': 0.25, # Russia
    'Shipping Address_Risk': 0.25,
    'Country of Residence_Risk': 0.01,
    'Bank_Risk': 0.02,
    'Type of Transaction_Risk': 0.12,
    'Time': 3,   # 3 AM (Suspicious)
    'Amount': 5000.0,
    'Gender_M': 1
}])
fraud_input = fraud_input.reindex(columns=feature_columns, fill_value=0)

# Predict
if best_name == "Logistic Regression":
    prob = best_model.predict_proba(scaler.transform(fraud_input))[:, 1][0]
    shap_vals = explainer.shap_values(scaler.transform(fraud_input))
else:
    prob = best_model.predict_proba(fraud_input)[:, 1][0]
    shap_vals = explainer.shap_values(fraud_input)

print(f"Prediction: {'⛔ FRAUD DETECTED' if prob >= best_threshold else '✅ APPROVED'}")
print(f"Confidence: {prob:.4f}")

print("\n--- WHY WAS THIS FLAGGED? ---")

# Handle SHAP output format
if isinstance(shap_vals, list):
    vals = shap_vals[1][0]
elif len(shap_vals.shape) > 1:
    vals = shap_vals[0]
else:
    vals = shap_vals

impact_df = pd.DataFrame({'Feature': feature_columns, 'Impact': vals})
top_reasons = impact_df.sort_values(by='Impact', ascending=False).head(3)

for i, row in top_reasons.iterrows():
    if row['Impact'] > 0:
        print(f"Reason: {row['Feature']} (+{row['Impact']:.2f})")
        if row['Feature'] == 'Amount_vs_Category_Avg': print("  -> Spending is unusually high.")
        if 'Country' in row['Feature']: print("  -> High Risk Location.")
        if row['Feature'] == 'Time': print("  -> Unusual Transaction Time.")

print("\nDone.")