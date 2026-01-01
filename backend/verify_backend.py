import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_backend_persistence():
    print(f"Testing backend at {BASE_URL}...")
    
    # 1. Get initial count
    try:
        r = requests.get(f"{BASE_URL}/api/orders")
        initial_orders = r.json()
        print(f"Initial orders count: {len(initial_orders)}")
    except Exception as e:
        print(f"Failed to contact backend: {e}")
        return

    # 2. Create a dummy order
    dummy_order = {
        "po_no": "TEST/001",
        "date": "2025-01-01",
        "party_name": "Test Party",
        "ord_mode": "CONSUMABLE",
        "mode": "Direct",
        "store": "SURAT",
        "agent": "Test Agent",
        "cr_days": 30,
        "del_days": 10,
        "freight_type": "EXTRA",
        "items": [],
        "total_item": 0,
        "total_qty": 0.0,
        "gross_amount": 0.0,
        "discount": 0.0,
        "add_less": 0.0,
        "freight_amt": 0.0,
        "net_amount": 0.0
    }
    
    print("Sending POST request...")
    r = requests.post(f"{BASE_URL}/api/orders", json=dummy_order)
    if r.status_code == 200:
        print("Create SUCCESS")
    else:
        print(f"Create FAILED: {r.status_code} {r.text}")
        return

    # 3. Get orders again
    print("Fetching orders again...")
    r = requests.get(f"{BASE_URL}/api/orders")
    final_orders = r.json()
    print(f"Final orders count: {len(final_orders)}")
    
    found = any(o['po_no'] == "TEST/001" for o in final_orders)
    if found:
        print("VERIFICATION PASSED: Order persisted.")
    else:
        print("VERIFICATION FAILED: Order NOT found.")

if __name__ == "__main__":
    test_backend_persistence()
