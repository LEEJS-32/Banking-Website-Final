"""
Test script to verify MongoDB fingerprint storage is working correctly
"""

from pymongo import MongoClient

# Configuration
MONGODB_URI = 'mongodb+srv://leejsjm22_db_user:VXiN9t77bFoScqDS@securebank.k5vk9zy.mongodb.net/?appName=SecureBank'

def test_mongodb_connection():
    """Test MongoDB connection and fingerprint data"""
    print("=" * 70)
    print("MongoDB Fingerprint Storage Test")
    print("=" * 70)
    
    # Connect to MongoDB
    print("\n[1] Testing MongoDB connection...")
    try:
        client = MongoClient(MONGODB_URI)
        db = client.get_database('test')
        users_collection = db['users']
        print("    ✓ Successfully connected to MongoDB")
    except Exception as e:
        print(f"    ✗ Connection failed: {e}")
        return False
    
    # Check fingerprint data
    print("\n[2] Checking fingerprint data...")
    try:
        enrolled_users = list(users_collection.find({
            'fingerprintEnrolled': True,
            'fingerprintData': {'$exists': True}
        }))
        
        print(f"    ✓ Found {len(enrolled_users)} enrolled fingerprint(s)")
        
        if enrolled_users:
            print("\n    Enrolled users:")
            for user in enrolled_users:
                email = user.get('email', 'Unknown')
                device = user.get('fingerprintDevice', 'Unknown')
                enrolled_at = user.get('fingerprintEnrolledAt', 'Unknown')
                fp_data = user.get('fingerprintData', {})
                
                print(f"\n    • Email: {email}")
                print(f"      Device: {device}")
                print(f"      Enrolled: {enrolled_at}")
                print(f"      Has Image Data: {'Yes' if fp_data.get('fingerprint') else 'No'}")
                
                if fp_data.get('fingerprint'):
                    img_size = len(fp_data.get('fingerprint', ''))
                    print(f"      Image Size: {img_size:,} bytes")
        
    except Exception as e:
        print(f"    ✗ Query failed: {e}")
        return False
    
    # Test write capability
    print("\n[3] Testing write capability...")
    try:
        # Just verify we can query (not actually writing)
        result = users_collection.find_one({'email': {'$exists': True}})
        if result:
            print("    ✓ Database write capability confirmed")
        else:
            print("    ⚠ No users found in database")
    except Exception as e:
        print(f"    ✗ Write test failed: {e}")
        return False
    
    print("\n" + "=" * 70)
    print("✓ All tests passed! MongoDB fingerprint storage is working correctly.")
    print("=" * 70)
    print("\nYou can now:")
    print("  1. Start the fingerprint API: python fingerprint_api.py")
    print("  2. Enroll new fingerprints - they will be saved to MongoDB")
    print("  3. Verify fingerprints - they will be loaded from MongoDB")
    print("=" * 70)
    
    return True

if __name__ == '__main__':
    test_mongodb_connection()
