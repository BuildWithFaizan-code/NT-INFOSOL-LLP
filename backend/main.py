from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
import json
import os
from pathlib import Path

# Import database components
from database import init_db, get_db, PurchaseOrderDB

app = FastAPI()

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    print("🚀 Starting application...")
    init_db()
    print("✅ Database initialized successfully!")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    date: str
    ord_mode: str = "CONSUMABLE"
    mode: str = "Direct"
    store: str = ""
    party_name: str = ""
    agent: str = ""
    reference: str = ""
    ref_date: str = ""
    currency: str = ""
    cr_days: int = 0
    del_days: int = 0
    freight_type: str = "PAID"
    is_import: bool = False
    status: str = "Open"
    gstin: str = ""
    address: str = ""
    delivery_party: str = ""
    del_terms: str = ""
    pay_terms: str = ""
    despatch_ins: str = ""
    special_note: str = ""
    remarks: str = ""
    total_item: int = 0
    total_qty: float = 0.0
    gross_amount: float = 0.0
    discount: float = 0.0
    add_less: float = 0.0
    freight_amt: float = 0.0
    net_amount: float = 0.0
    items: List[OrderItem] = []
    updates: Optional[List[dict]] = []
    grn_records: Optional[List[dict]] = []
    gst_type: str = "intra-state"
    cgst_percent: float = 0.0
    sgst_percent: float = 0.0
    igst_percent: float = 0.0
    other_charges: float = 0.0
    terms_conditions_text: str = ""


@app.get("/")
async def root():
    return {"message": "Purchase Order API", "status": "running"}


# Serve React app for all other routes
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {"error": "Frontend not built"}


@app.get("/api/orders")
def get_orders(db: Session = Depends(get_db)):
    """Get all purchase orders from database"""
    try:
        orders = db.query(PurchaseOrderDB).all()
        return [
            {
                "po_no": order.po_no,
                "date": order.date,
                "ord_mode": order.ord_mode,
                "mode": order.mode,
                "store": order.store,
                "party_name": order.party_name,
                "agent": order.agent,
                "reference": order.reference,
                "ref_date": order.ref_date,
                "currency": order.currency,
                "cr_days": order.cr_days,
                "del_days": order.del_days,
                "freight_type": order.freight_type,
                "is_import": order.is_import,
                "status": order.status,
                "gstin": order.gstin,
                "address": order.address,
                "delivery_party": order.delivery_party,
                "del_terms": order.del_terms,
                "pay_terms": order.pay_terms,
                "despatch_ins": order.despatch_ins,
                "special_note": order.special_note,
                "remarks": order.remarks,
                "total_item": order.total_item,
                "total_qty": order.total_qty,
                "gross_amount": order.gross_amount,
                "discount": order.discount,
                "add_less": order.add_less,
                "freight_amt": order.freight_amt,
                "net_amount": order.net_amount,
                "items": order.items,
                "updates": order.updates,
                "grn_records": order.grn_records,
                "gst_type": order.gst_type,
                "cgst_percent": order.cgst_percent,
                "sgst_percent": order.sgst_percent,
                "igst_percent": order.igst_percent,
                "other_charges": order.other_charges,
                "terms_conditions_text": order.terms_conditions_text,
            }
            for order in orders
        ]
    except Exception as e:
        print(f"❌ Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/orders")
async def create_order(order: PurchaseOrder, db: Session = Depends(get_db)):
    """Create a new purchase order"""
    try:
        existing = db.query(PurchaseOrderDB).filter(PurchaseOrderDB.po_no == order.po_no).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"PO {order.po_no} already exists")
        
        order_dict = order.dict()
        order_dict['updates'] = [{
            "timestamp": datetime.now().isoformat(),
            "action": "created",
            "changes": {},
            "user": "System"
        }]
        order_dict['grn_records'] = []
        
        db_order = PurchaseOrderDB(**order_dict)
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        
        print(f"✅ Created PO: {order.po_no}")
        return {"confirmed_po": order.po_no, "message": "Order created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/orders")
async def update_order(order: PurchaseOrder, db: Session = Depends(get_db)):
    """Update an existing purchase order"""
    try:
        db_order = db.query(PurchaseOrderDB).filter(PurchaseOrderDB.po_no == order.po_no).first()
        if not db_order:
            raise HTTPException(status_code=404, detail=f"PO {order.po_no} not found")
        
        order_dict = order.dict()
        for key, value in order_dict.items():
            if key != 'updates' and hasattr(db_order, key):
                setattr(db_order, key, value)
        
        current_updates = db_order.updates or []
        current_updates.append({
            "timestamp": datetime.now().isoformat(),
            "action": "updated",
            "changes": {},
            "user": "System"
        })
        db_order.updates = current_updates
        
        db.commit()
        db.refresh(db_order)
        
        print(f"✅ Updated PO: {order.po_no}")
        return {"confirmed_po": order.po_no, "message": "Order updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/orders")
async def delete_order(po_no: str, db: Session = Depends(get_db)):
    """Delete a purchase order"""
    try:
        db_order = db.query(PurchaseOrderDB).filter(PurchaseOrderDB.po_no == po_no).first()
        if not db_order:
            raise HTTPException(status_code=404, detail=f"PO {po_no} not found")
        
        db.delete(db_order)
        db.commit()
        
        print(f"✅ Deleted PO: {po_no}")
        return {"message": f"Order {po_no} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
