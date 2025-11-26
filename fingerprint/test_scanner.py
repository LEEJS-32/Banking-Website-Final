import serial
import time

try:
    print("Attempting to connect to COM3...")
    ser = serial.Serial('COM3', 57600, timeout=2)
    print(f"✓ Successfully opened COM3")
    print(f"  Port: {ser.port}")
    print(f"  Baudrate: {ser.baudrate}")
    print(f"  Is open: {ser.is_open}")
    
    # Try sending a command to verify scanner responds
    print("\nSending verification packet to scanner...")
    HEADER = b'\xEF\x01'
    ADDR = b'\xFF\xFF\xFF\xFF'
    
    # VfyPwd command (0x13) with default password 0x00000000
    cmd = b'\x13\x00\x00\x00\x00'
    length = len(cmd) + 2
    checksum = (0x01 + length + sum(cmd)) & 0xFFFF
    
    import struct
    packet = HEADER + ADDR + b'\x01' + struct.pack('>H', length) + cmd + struct.pack('>H', checksum)
    
    ser.write(packet)
    time.sleep(0.5)
    
    response = ser.read(32)
    if len(response) > 0:
        print(f"✓ Scanner responded with {len(response)} bytes: {response.hex()}")
        print("Scanner is working properly!")
    else:
        print("✗ No response from scanner")
        print("  Make sure the scanner has power (LED should be on)")
    
    ser.close()
    
except serial.SerialException as e:
    print(f"✗ Error: {e}")
    print("\nPossible causes:")
    print("1. Another program is using COM3 (close the fingerprint API)")
    print("2. Scanner doesn't have power")
    print("3. Wrong COM port (but Device Manager shows COM3)")
except Exception as e:
    print(f"✗ Unexpected error: {e}")
