from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import json
import os
from pathlib import Path

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the directory paths
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

# Mount static files (React build)
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


class OrderItem(BaseModel):
    item_code: str = ""
    description: str = ""
    merge_style: Optional[str] = ""
    shade: Optional[str] = ""
    remark: Optional[str] = ""
    department: Optional[str] = "REGULAR"
    cost_center: Optional[str] = ""
    uqc: str = "KGS"
    pending_qty: float = 0.0
    grn_qty: float = 0.0
    qty: float = 0.0
    rate: float = 0.0
    amount: float = 0.0

class PurchaseOrder(BaseModel):
    po_no: str
    date: str  # Keeping as string for simplicity with frontend date pickers
    ord_mode: str = "CONSUMABLE"
    mode: str = "Direct"
    store: str = "SURAT"
    party_name: str
    agent: str = "DIRECT"
    reference: Optional[str] = ""
    ref_date: Optional[str] = ""
    currency: Optional[str] = ""
    cr_days: int = 60
    del_days: int = 0
    freight_type: str = "EXTRA"
    is_import: bool = False
    status: str = "Open"
    gstin: Optional[str] = ""
    address: Optional[str] = ""
    
    # Footer
    delivery_party: Optional[str] = ""
    del_terms: str = "IMMEDIATELY"
    pay_terms: str = "60 DAYS"
    despatch_ins: Optional[str] = ""
    special_note: Optional[str] = ""
    remarks: Optional[str] = ""
    
    # Totals
    total_item: int = 0
    total_qty: float = 0.0
    gross_amount: float = 0.0
    discount: float = 0.0
    add_less: float = 0.0
    freight_amt: float = 0.0
    net_amount: float = 0.0
    
    items: List[OrderItem]
    
    # Audit trail and GRN tracking
    updates: List[dict] = []
    grn_records: List[dict] = []
    
    # GST fields
    gst_type: Optional[str] = "intra-state"
    cgst_percent: Optional[float] = 9.0
    sgst_percent: Optional[float] = 9.0
    igst_percent: Optional[float] = 18.0
    other_charges: Optional[float] = 0.0
    terms_conditions_text: Optional[str] = ""

@app.get("/")
def read_root():
    """Serve the React app"""
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {"status": "ok", "message": "Purchase Order API Running"}

# Catch-all route to serve React app for client-side routing
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve React app for all non-API routes"""
    # If it's an API route, let it pass through
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Serve the React app
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {"error": "Frontend not built"}

import json
import os

# File to store orders
ORDERS_FILE = "orders.json"

def load_orders():
    if not os.path.exists(ORDERS_FILE):
        # Initialize with empty array if file doesn't exist
        save_orders([])
        return []
    try:
        with open(ORDERS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_orders(orders):
    with open(ORDERS_FILE, "w") as f:
        json.dump(orders, f, indent=2)

# Initialize orders file on startup
if not os.path.exists(ORDERS_FILE):
    print("📝 Initializing orders.json file...")
    save_orders([])
    print("✅ orders.json created successfully!")

@app.get("/api/orders")
def get_orders():
    return load_orders()


@app.post("/api/orders")
async def create_order(order: PurchaseOrder):
    """Create a new purchase order"""
    from datetime import datetime
    try:
        current_orders = load_orders()
        
        # Add creation timestamp to updates
        order_dict = order.dict()
        order_dict['updates'] = [{
            "timestamp": datetime.now().isoformat(),
            "action": "created",
            "changes": {},
            "user": "System"
        }]
        order_dict['grn_records'] = []
        
        # Append the new order to the list
        current_orders.append(order_dict)
        save_orders(current_orders)
        
        return {
            "confirmed_po": order.po_no,
            "message": "Order created successfully"
        }
    except Exception as e:
        print(f"Error creating order: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise


@app.delete("/api/orders")
async def delete_order(po_no: str):
    """Delete a purchase order by PO number (query parameter)"""
    orders = load_orders()
    
    # Filter out the order with matching po_no
    filtered_orders = [o for o in orders if o.get("po_no") != po_no]
    
    if len(filtered_orders) == len(orders):
        return {"success": False, "message": f"Order {po_no} not found"}
    
    save_orders(filtered_orders)
    return {"success": True, "message": f"Order {po_no} deleted successfully"}

@app.put("/api/orders")
async def update_order(order: PurchaseOrder):
    """Update an existing purchase order"""
    from datetime import datetime
    orders = load_orders()
    
    # Find and update the order with matching po_no
    updated = False
    for i, existing_order in enumerate(orders):
        if existing_order.get("po_no") == order.po_no:
            # Track changes
            changes = {}
            new_order_dict = order.dict()
            
            # Compare key fields for changes
            for key in ['party_name', 'discount', 'add_less', 'freight_amt', 'net_amount']:
                if existing_order.get(key) != new_order_dict.get(key):
                    changes[key] = {
                        "old": existing_order.get(key),
                        "new": new_order_dict.get(key)
                    }
            
            # Preserve existing updates and add new one
            existing_updates = existing_order.get('updates', [])
            existing_updates.append({
                "timestamp": datetime.now().isoformat(),
                "action": "updated",
                "changes": changes,
                "user": "System"
            })
            new_order_dict['updates'] = existing_updates
            
            # Preserve existing GRN records
            new_order_dict['grn_records'] = existing_order.get('grn_records', [])
            
            orders[i] = new_order_dict
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail=f"Order {order.po_no} not found")
    
    save_orders(orders)
    return {"confirmed_po": order.po_no, "message": "Order updated successfully"}
