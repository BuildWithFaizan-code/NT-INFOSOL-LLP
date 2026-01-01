import requests
import time
import subprocess
import sys
import os

def test_api():
    print("Starting backend...")
    # Start server in background
    proc = subprocess.Popen(["py", "-m", "uvicorn", "main:app", "--port", "8001"], cwd=os.getcwd())
    
    time.sleep(5) # Wait for startup
    
    try:
        print("Testing Root Endpoint...")
        r = requests.get("http://127.0.0.1:8001/")
        print(f"Root: {r.status_code} {r.json()}")
        
        print("Testing Order Creation...")
        payload = {
            "po_no": "TEST/001",
            "date": "2025-01-01",
            "party_name": "Test Party",
            "items": [
                {
                    "item_code": "I001",
                    "description": "Test Item",
                    "qty": 10.0,
                    "rate": 100.0,
                    "amount": 1000.0
                }
            ],
            # Totals
            "total_item": 1,
            "total_qty": 10.0,
            "gross_amount": 1000.0,
            "net_amount": 1000.0
        }
        r = requests.post("http://127.0.0.1:8001/api/orders", json=payload)
        print(f"Create Order: {r.status_code}")
        print(f"Response: {r.json()}")
        
        if r.status_code == 200:
             print("SUCCESS: Backend verification passed.")
        else:
             print("FAILURE: Backend returned error.")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        print("Stopping backend...")
        proc.terminate()

if __name__ == "__main__":
    # Install requests if missing (unlikely in this env but good practice)
    # subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    test_api()
