# Purchase Order Management System

A modern Purchase Order (PO) management application built with React (Frontend) and FastAPI (Backend) with comprehensive GST tax support for Indian businesses.

## Features

### Core Functionality
- ✅ Create, Edit, View, and Delete Purchase Orders
- ✅ Real-time item grid with automatic amount calculations
- ✅ Save and load orders from JSON backend
- ✅ Print-ready PO format
- ✅ Export to Excel functionality

### Advanced Features
- ✅ **Audit Trail (Updates)** - Track all changes made to POs
- ✅ **GRN Details** - Goods Receipt Note tracking
- ✅ **GST Tax System** - Full Indian GST compliance
  - Intra-State (CGST + SGST)
  - Inter-State (IGST)
  - Other charges support
  - Real-time tax calculations
- ✅ **Terms & Conditions** - Customizable T&C for each PO

### UI/UX
- Responsive full-screen layout
- AG Grid for efficient data handling
- Color-coded tax breakdown
- Compact, optimized column widths
- Direct action buttons (Print, Edit, Delete) in list view

## Tech Stack

### Frontend
- **React** 18.3.1
- **Vite** 7.3.0
- **AG Grid React** 33.0.2
- **Axios** for API calls
- **Lucide React** for icons
- **Tailwind CSS** for styling
- **XLSX** for Excel export

### Backend
- **FastAPI** - High-performance Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **JSON** file-based storage

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- npm or yarn

### Backend Setup

```bash
cd backend
pip install fastapi uvicorn
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

1. **Create New PO**: Click "Add Item" to add items, fill in details, and click "Save"
2. **Edit PO**: Click the Edit button in the list or action bar
3. **Print PO**: Click the Print button to generate a print-ready document
4. **GST Configuration**: Click "Duties & Charges" to set GST type and percentages
5. **Terms & Conditions**: Click "Terms & Condition" to edit T&C text
6. **View Updates**: Click "Updates" to see audit trail
7. **GRN Details**: Click "GRN_Details" to view goods receipt information

## GST Tax Rates

### Common GST Rates in India
- **Textiles/Fabrics**: 5% (CGST 2.5% + SGST 2.5% or IGST 5%)
- **Garments**: 12% (CGST 6% + SGST 6% or IGST 12%)
- **Electronics/Machinery**: 18% (CGST 9% + SGST 9% or IGST 18%) - **Default**
- **Luxury Items**: 28% (CGST 14% + SGST 14% or IGST 28%)

## Project Structure

```
.
├── backend/
│   ├── main.py                 # FastAPI application
│   └── purchase_orders.json    # Data storage
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Styles
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

- `GET /api/orders` - Fetch all purchase orders
- `POST /api/orders` - Create new purchase order
- `PUT /api/orders` - Update existing purchase order
- `DELETE /api/orders?po_no={po_no}` - Delete purchase order

## License

MIT License

## Author

Nilesh Patel 

