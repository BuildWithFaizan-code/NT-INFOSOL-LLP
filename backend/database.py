from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./orders.db")

# Fix for Render PostgreSQL URL (uses postgres:// instead of postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class PurchaseOrderDB(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    po_no = Column(String, unique=True, index=True)
    date = Column(String)
    ord_mode = Column(String)
    mode = Column(String)
    store = Column(String)
    party_name = Column(String)
    agent = Column(String)
    reference = Column(String)
    ref_date = Column(String)
    currency = Column(String)
    cr_days = Column(Integer)
    del_days = Column(Integer)
    freight_type = Column(String)
    is_import = Column(Boolean)
    status = Column(String)
    gstin = Column(String)
    address = Column(String)
    delivery_party = Column(String)
    del_terms = Column(String)
    pay_terms = Column(String)
    despatch_ins = Column(String)
    special_note = Column(String)
    remarks = Column(String)
    total_item = Column(Integer)
    total_qty = Column(Float)
    gross_amount = Column(Float)
    discount = Column(Float)
    add_less = Column(Float)
    freight_amt = Column(Float)
    net_amount = Column(Float)
    items = Column(JSON)
    updates = Column(JSON)
    grn_records = Column(JSON)
    gst_type = Column(String)
    cgst_percent = Column(Float)
    sgst_percent = Column(Float)
    igst_percent = Column(Float)
    other_charges = Column(Float)
    terms_conditions_text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
def init_db():
    Base.metadata.create_all(bind=engine)

# Get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
