import serial
import time
import struct
import numpy as np
import cv2
import sys

# ==========================================
# CONFIGURATION
# ==========================================
SCANNER_PORT = 'COM3'   
MATCH_THRESHOLD = 25    # Lowered slightly since we have more area to cover

# ==========================================
# 1. R307 DRIVER
# ==========================================
class R307:
    def __init__(self, port):
        try:
            self.ser = serial.Serial(port, 57600, timeout=1)
            self.HEADER = b'\xEF\x01'
            self.ADDR = b'\xFF\xFF\xFF\xFF'
        except:
            print(f"[-] Could not connect to {port}")
            sys.exit()

    def send_cmd(self, pid, content):
        length = len(content) + 2
        checksum = (pid + length + sum(content)) & 0xFFFF
        pkt = self.HEADER + self.ADDR + struct.pack('>B', pid) + struct.pack('>H', length) + content + struct.pack('>H', checksum)
        self.ser.write(pkt)

    def get_response(self):
        head = self.ser.read(2)
        if head != self.HEADER: return None
        self.ser.read(4)
        pid = self.ser.read(1)[0]
        leng = struct.unpack('>H', self.ser.read(2))[0]
        content = self.ser.read(leng-2)
        self.ser.read(2)
        return content

    def capture(self):
        print(">> PLACE FINGER...")
        self.send_cmd(0x01, b'\x01')
        time.sleep(0.5) 
        resp = self.get_response()
        if resp and resp[0] == 0x00:
            print("   [+] Captured.")
            return True
        return False

    def download(self):
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
# 2. IMAGE PROCESSING (UPDATED: NO CENTER CROP)
# ==========================================
def process_image(img):
    # 1. Normalize
    img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
    
    # 2. CLAHE (Contrast Enhancement)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    img = clahe.apply(img)
    
    # 3. SAFETY CROP ONLY (Remove 5px from edges)
    # R307 often has a noisy black border. We remove just that.
    # We DO NOT crop the center anymore.
    h, w = img.shape
    img = img[5:h-5, 5:w-5]
    
    return img

# ==========================================
# 3. SIFT MATCHING
# ==========================================
def get_match_score(img1, img2):
    sift = cv2.SIFT_create()
    kp1, des1 = sift.detectAndCompute(img1, None)
    kp2, des2 = sift.detectAndCompute(img2, None)

    if des1 is None or des2 is None:
        return 0, None

    index_params = dict(algorithm=1, trees=5)
    search_params = dict(checks=50)
    flann = cv2.FlannBasedMatcher(index_params, search_params)
    
    try:
        matches = flann.knnMatch(des1, des2, k=2)
    except:
        return 0, None

    good_matches = []
    for m, n in matches:
        if m.distance < 0.75 * n.distance: # Slightly relaxed ratio for full image
            good_matches.append(m)

    match_img = cv2.drawMatches(img1, kp1, img2, kp2, good_matches, None, flags=2)
    
    return len(good_matches), match_img

# ==========================================
# 4. MAIN APP
# ==========================================
if __name__ == "__main__":
    scanner = R307(SCANNER_PORT)
    database = {} 

    while True:
        print("\n" + "="*30)
        action = input("[1] Enroll (SIFT)\n[2] Verify (SIFT)\n[3] Exit\nSelect: ")
        
        if action == '3': break

        if scanner.capture():
            raw = scanner.download()
            if raw:
                img = scanner.to_image(raw)
                current_finger = process_image(img)
                
                cv2.imshow("Scanner Input", current_finger)
                cv2.waitKey(100)

                if action == '1':
                    uid = input("Enter User ID: ")
                    database[uid] = current_finger
                    print(f"[+] User {uid} Enrolled.")

                elif action == '2':
                    if not database:
                        print("[-] Database empty.")
                        continue
                    
                    best_score = 0
                    best_user = None
                    best_viz = None
                    
                    print("\n--- Matching ---")
                    for uid, db_img in database.items():
                        score, viz = get_match_score(current_finger, db_img)
                        print(f"User [{uid}] - Match Points: {score}")
                        
                        if score > best_score:
                            best_score = score
                            best_user = uid
                            best_viz = viz
                    
                    print("-" * 20)
                    if best_score > MATCH_THRESHOLD:
                        print(f"✅ ACCESS GRANTED: {best_user}")
                        print(f"   Score: {best_score}")
                        
                        if best_viz is not None:
                            cv2.imshow("Match Visualization", best_viz)
                            print("   [Press any key to close match window...]")
                            cv2.waitKey(0)
                            try:
                                cv2.destroyWindow("Match Visualization")
                            except:
                                pass
                    else:
                        print(f"❌ ACCESS DENIED")
                        print(f"   Best score was {best_score}")

    cv2.destroyAllWindows()