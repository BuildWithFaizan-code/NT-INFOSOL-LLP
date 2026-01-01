import React, { useState, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import axios from 'axios';
import { Trash2, Save, Plus, FileText, X, Printer, Edit, RefreshCw, Download, History, Package } from 'lucide-react';
import * as XLSX from 'xlsx';

// Register AG Grid modules (required for v33+)
ModuleRegistry.registerModules([AllCommunityModule]);

// default initial state matching screenshot
const initialFormState = {
  po_no: "",
  date: "",
  ord_mode: "",
  mode: "",
  store: "",
  party_name: "",
  agent: "",
  reference: "",
  ref_date: "",
  currency: "",
  currency_rate: "",
  cr_days: "",
  del_days: "",
  freight_type: "",
  is_import: false,
  status: "",
  gstin: "",
  address: "",

  // Footer fields
  delivery_party: "",
  del_terms: "",
  pay_terms: "",
  despatch_ins: "",
  special_note: "",
  remarks: "",

  // Footer Totals (Calculated/Input)
  discount: "",
  add_less: "",
  freight_amt: "",
  terms_conditions: false,
  duties_charges: false,

  // GST fields
  gst_type: "intra-state", // 'intra-state' or 'inter-state'
  cgst_percent: "9",
  sgst_percent: "9",
  igst_percent: "18",
  other_charges: "",
  terms_conditions_text: "1. Payment terms: Net 60 days from invoice date\n2. Delivery: As per agreed schedule\n3. Quality: As per approved samples\n4. Returns: Within 7 days with prior approval\n5. Disputes: Subject to Surat jurisdiction"
};

const initialRowData = [];

// Pre-calculate initial amounts
initialRowData.forEach(row => row.amount = row.qty * row.rate);


function App() {
  const [formData, setFormData] = useState(initialFormState);
  const [rowData, setRowData] = useState(initialRowData);
  const [gridApi, setGridApi] = useState(null);

  const [viewMode, setViewMode] = useState('entry'); // 'entry' | 'list'
  const [editMode, setEditMode] = useState('new'); // 'new', 'view', 'edit'
  const [originalData, setOriginalData] = useState(null); // For cancel functionality
  const [currentPONo, setCurrentPONo] = useState(null); // Track current PO number
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showDutiesModal, setShowDutiesModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [savedOrders, setSavedOrders] = useState([]);
  const gridRef = useRef();

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/orders');
      console.log("=== FETCH DEBUG ===");
      console.log("Response data:", res.data);
      console.log("Is Array?", Array.isArray(res.data));
      console.log("Length:", res.data?.length);
      console.log("First item:", res.data?.[0]);
      setSavedOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  }, []);

  const handleAddRow = useCallback(() => {
    const newRow = {
      item_code: "",
      description: "",
      merge_style: "",
      shade: "",
      remark: "",
      department: "REGULAR",
      cost_center: "DIAPER DIVISION",
      uqc: "KGS",
      pending_qty: 0,
      grn_qty: 0,
      qty: 0,
      rate: 0,
      amount: 0
    };
    setRowData(prev => [...prev, newRow]);
  }, []);

  // Field change handler
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Grid Calculations
  const totals = useMemo(() => {
    let totalQty = 0;
    let grossAmount = 0;

    rowData.forEach(row => {
      totalQty += parseFloat(row.qty || 0);
      grossAmount += parseFloat(row.amount || 0);
    });

    const gross = parseFloat(grossAmount.toFixed(2));

    // Discount is a percentage
    const discountPercent = parseFloat(formData.discount || 0);
    const discountAmount = (gross * discountPercent) / 100;

    // Subtotal after discount
    const subtotal = gross - discountAmount;

    // GST Calculation
    const cgstPercent = parseFloat(formData.cgst_percent || 0);
    const sgstPercent = parseFloat(formData.sgst_percent || 0);
    const igstPercent = parseFloat(formData.igst_percent || 0);

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (formData.gst_type === 'intra-state') {
      // Intra-state: CGST + SGST
      cgstAmount = (subtotal * cgstPercent) / 100;
      sgstAmount = (subtotal * sgstPercent) / 100;
    } else {
      // Inter-state: IGST only
      igstAmount = (subtotal * igstPercent) / 100;
    }

    const totalTax = cgstAmount + sgstAmount + igstAmount;

    // Other charges and freight
    const otherCharges = parseFloat(formData.other_charges || 0);
    const addLess = parseFloat(formData.add_less || 0);
    const freight = parseFloat(formData.freight_amt || 0);

    // Net Amount = Subtotal + Taxes + Other Charges + Freight + Add/Less
    const netAmount = subtotal + totalTax + otherCharges + freight + addLess;

    return {
      totalItem: rowData.length,
      totalQty: totalQty.toFixed(2),
      grossAmount: gross.toFixed(2),
      discountPercent: discountPercent.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      cgstPercent: cgstPercent.toFixed(2),
      cgstAmount: cgstAmount.toFixed(2),
      sgstPercent: sgstPercent.toFixed(2),
      sgstAmount: sgstAmount.toFixed(2),
      igstPercent: igstPercent.toFixed(2),
      igstAmount: igstAmount.toFixed(2),
      totalTax: totalTax.toFixed(2),
      otherCharges: otherCharges.toFixed(2),
      addLess: addLess.toFixed(2),
      freight: freight.toFixed(2),
      netAmount: netAmount.toFixed(2)
    };
  }, [rowData, formData.discount, formData.add_less, formData.freight_amt, formData.gst_type, formData.cgst_percent, formData.sgst_percent, formData.igst_percent, formData.other_charges]);

  // Column Definitions for Items Grid
  const columnDefs = useMemo(() => [
    { headerName: "#", valueGetter: "node.rowIndex + 1", width: 50, pinned: 'left', headerClass: 'ag-header-cell-text-center', editable: false },
    { field: 'item_code', headerName: 'Item Code', width: 100, editable: editMode !== 'view' },
    { field: 'description', headerName: 'Description', width: 150, editable: editMode !== 'view' },
    { field: 'merge_style', headerName: 'Merge No/...', width: 100, editable: editMode !== 'view' },
    { field: 'shade', headerName: 'Shade', width: 80, editable: editMode !== 'view' },
    { field: 'remark', headerName: 'Remark', width: 100, editable: editMode !== 'view' },
    { field: 'department', headerName: 'Department', width: 120, editable: editMode !== 'view' },
    { field: 'cost_center', headerName: 'Cost Center', width: 130, editable: editMode !== 'view' },
    { field: 'uqc', headerName: 'UQC', width: 70, editable: editMode !== 'view' },
    {
      field: 'pending_qty',
      headerName: '₹Pend ...',
      width: 80,
      editable: editMode !== 'view',
      valueParser: params => parseFloat(params.newValue || 0),
      cellClass: 'ag-right-aligned-cell'
    },
    {
      field: 'grn_qty',
      headerName: '₹GRN Q...',
      width: 80,
      editable: editMode !== 'view',
      valueParser: params => parseFloat(params.newValue || 0),
      cellClass: 'ag-right-aligned-cell'
    },
    {
      field: 'qty',
      headerName: 'Qty',
      width: 80,
      editable: editMode !== 'view',
      valueParser: params => parseFloat(params.newValue || 0),
      cellClass: 'ag-right-aligned-cell',
      onCellValueChanged: (params) => {
        const newQty = parseFloat(params.newValue || 0);
        const rate = parseFloat(params.data.rate || 0);
        params.data.amount = newQty * rate;
        params.api.refreshCells({ rowNodes: [params.node], columns: ['amount'] });
        setRowData([...params.api.getRenderedNodes().map(node => node.data)]);
      }
    },
    {
      field: 'rate',
      headerName: 'Rate',
      width: 90,
      editable: editMode !== 'view',
      valueParser: params => parseFloat(params.newValue || 0),
      cellClass: 'ag-right-aligned-cell',
      onCellValueChanged: (params) => {
        const qty = parseFloat(params.data.qty || 0);
        const newRate = parseFloat(params.newValue || 0);
        params.data.amount = qty * newRate;
        params.api.refreshCells({ rowNodes: [params.node], columns: ['amount'] });
        setRowData([...params.api.getRenderedNodes().map(node => node.data)]);
      }
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 100,
      editable: false,
      valueFormatter: p => p.value ? Number(p.value).toFixed(2) : '0.00',
      cellClass: 'ag-right-aligned-cell'
    },
    {
      headerName: 'Action',
      width: 60,
      pinned: 'right',
      editable: false,
      cellRenderer: (params) => (
        <button
          onClick={() => {
            const newData = rowData.filter((_, i) => i !== params.node.rowIndex);
            setRowData(newData);
          }}
          className="text-red-600 hover:text-red-800 p-1"
          title="Delete Row"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ], [rowData, editMode]);

  const onGridReady = (params) => {
    setGridApi(params.api);
  };

  const handleSave = async () => {
    // Sanitise Items: Ensure numbers are numbers, not empty strings
    const sanitizedItems = rowData.map(item => ({
      ...item,
      qty: parseFloat(item.qty || 0),
      rate: parseFloat(item.rate || 0),
      amount: parseFloat(item.amount || 0),
    }));

    const finalPayload = {
      ...formData,
      // Sanitise numeric headers
      cr_days: parseInt(formData.cr_days || 0),
      del_days: parseInt(formData.del_days || 0),
      discount: parseFloat(formData.discount || 0),
      add_less: parseFloat(formData.add_less || 0),
      freight_amt: parseFloat(formData.freight_amt || 0),

      items: sanitizedItems,

      // Sanitise calculated totals
      total_item: parseInt(totals.totalItem || 0),
      total_qty: parseFloat(totals.totalQty || 0),
      gross_amount: parseFloat(totals.grossAmount || 0),
      net_amount: parseFloat(totals.netAmount || 0),

      // Sanitise GST fields
      cgst_percent: parseFloat(formData.cgst_percent || 0),
      sgst_percent: parseFloat(formData.sgst_percent || 0),
      igst_percent: parseFloat(formData.igst_percent || 0),
      other_charges: parseFloat(formData.other_charges || 0),
    };

    try {
      console.log("Sending Payload:", finalPayload);
      console.log("Edit Mode:", editMode);
      console.log("Current PO No:", currentPONo);

      let response;
      if (editMode === 'new') {
        // Create new PO
        response = await axios.post('http://127.0.0.1:8000/api/orders', finalPayload);
        alert(`Success! Order created. PO: ${response.data.confirmed_po}`);
        setCurrentPONo(response.data.confirmed_po);
        setEditMode('view');
      } else if (editMode === 'edit') {
        // Update existing PO - ensure we use the original PO number
        const updatePayload = {
          ...finalPayload,
          po_no: currentPONo // Force the original PO number
        };
        console.log("Update Payload with forced PO:", updatePayload);
        response = await axios.put('http://127.0.0.1:8000/api/orders', updatePayload);
        alert(`Success! Order updated. PO: ${response.data.confirmed_po}`);
        setEditMode('view');
        setOriginalData(null);
      }

      // Refresh list and stay in entry view
      await fetchOrders();

    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save order. Check console/backend.");
    }
  };

  // Handle viewing/editing a saved order
  const handleViewOrder = useCallback((orderData) => {
    console.log("Loading order for edit:", orderData);

    // Load header data
    setFormData({
      po_no: orderData.po_no || "",
      date: orderData.date || "",
      ord_mode: orderData.ord_mode || "",
      mode: orderData.mode || "",
      store: orderData.store || "",
      party_name: orderData.party_name || "",
      agent: orderData.agent || "",
      reference: orderData.reference || "",
      ref_date: orderData.ref_date || "",
      currency: orderData.currency || "",
      currency_rate: orderData.currency_rate || "",
      cr_days: orderData.cr_days || "",
      del_days: orderData.del_days || "",
      freight_type: orderData.freight_type || "",
      is_import: orderData.is_import || false,
      status: orderData.status || "",
      gstin: orderData.gstin || "",
      address: orderData.address || "",
      delivery_party: orderData.delivery_party || "",
      del_terms: orderData.del_terms || "",
      pay_terms: orderData.pay_terms || "",
      despatch_ins: orderData.despatch_ins || "",
      special_note: orderData.special_note || "",
      remarks: orderData.remarks || "",
      discount: orderData.discount || "",
      add_less: orderData.add_less || "",
      freight_amt: orderData.freight_amt || "",
      terms_conditions: orderData.terms_conditions || false,
      duties_charges: orderData.duties_charges || false
    });

    // Load items data
    setRowData(orderData.items || []);

    // Switch to view mode (read-only)
    setEditMode('view');
    setCurrentPONo(orderData.po_no);
    setViewMode('entry');
    setOriginalData(null);
  }, []);

  // Handle deleting a saved order
  const handleDeleteOrder = useCallback(async (po_no) => {
    if (!confirm(`Are you sure you want to delete PO: ${po_no}?`)) {
      return;
    }

    try {
      console.log("Attempting to delete PO:", po_no);
      const url = `http://127.0.0.1:8000/api/orders?po_no=${encodeURIComponent(po_no)}`;
      console.log("DELETE request URL:", url);

      const response = await axios.delete(url);
      console.log("Delete response:", response.data);

      if (response.data.success) {
        alert(`Order ${po_no} deleted successfully!`);
        await fetchOrders();
        setViewMode('list');
      } else {
        alert(`Failed to delete: ${response.data.message}`);
      }
    } catch (error) {
      console.error("Delete Error Details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      alert(`Failed to delete order. Error: ${error.response?.data?.detail || error.message}`);
    }
  }, [fetchOrders]);

  // Handle creating a new order (reset form)
  const handleNewOrder = useCallback(() => {
    setFormData(initialFormState);
    setRowData([]);
    setViewMode('entry');
    setEditMode('new');
    setCurrentPONo(null);
    setOriginalData(null);
  }, []);

  // Handle editing an existing order
  const handleEdit = useCallback(() => {
    // Store current data for cancel functionality
    setOriginalData({
      formData: { ...formData },
      rowData: [...rowData]
    });
    setEditMode('edit');
  }, [formData, rowData]);

  // Handle canceling changes
  const handleCancel = useCallback(() => {
    if (editMode === 'edit' && originalData) {
      // Restore original data
      const confirmDiscard = window.confirm('Discard all changes?');
      if (confirmDiscard) {
        setFormData(originalData.formData);
        setRowData(originalData.rowData);
        setEditMode('view');
        setOriginalData(null);
      }
    } else if (editMode === 'new') {
      // Clear form for new PO
      const confirmClear = window.confirm('Clear all fields?');
      if (confirmClear) {
        setFormData(initialFormState);
        setRowData([]);
        setCurrentPONo(null);
      }
    }
  }, [editMode, originalData]);

  // Handle exporting PO to Excel/CSV
  const handleExport = useCallback(() => {
    if (!formData.po_no) {
      alert('Please save the PO first before exporting.');
      return;
    }

    // Prepare data for export
    const exportData = {
      'Company': 'NT INFOSOL LLP',
      'Address': 'A-801, Swastik Universal, Beside Valentine Multiplex, Piplod-Dumas Road, Surat-395007',
      '': '',
      'PO Number': formData.po_no,
      'Date': formData.date,
      'Party Name': formData.party_name,
      'Store': formData.store,
      'Mode': formData.mode,
      'Agent': formData.agent,
      'GSTIN': formData.gstin,
      'Address_': formData.address,
      'Payment Terms': formData.pay_terms,
      'Delivery Terms': formData.del_terms,
    };

    // Create worksheet from header data
    const ws = XLSX.utils.json_to_sheet([exportData]);

    // Add items table
    XLSX.utils.sheet_add_json(ws, rowData, { origin: -1, skipHeader: false });

    // Add totals
    const totalsData = {
      'Gross Amount': totals.grossAmount,
      'Discount (%)': formData.discount,
      'Discount Amount': totals.discountAmount,
      'Add/Less': totals.addLess,
      'Freight': totals.freight,
      'Net Amount': totals.netAmount
    };
    XLSX.utils.sheet_add_json(ws, [totalsData], { origin: -1 });

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Order');

    // Download file
    XLSX.writeFile(wb, `PO_${formData.po_no}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [formData, rowData, totals]);

  // Handle viewing update history
  const handleViewUpdates = useCallback(() => {
    setShowUpdatesModal(true);
  }, []);

  // Handle viewing GRN details
  const handleViewGRN = useCallback(() => {
    setShowGRNModal(true);
  }, []);

  // Handle printing the current PO
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${formData.po_no || 'New'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .header h1 { font-size: 24px; margin-bottom: 8px; }
          .header h3 { font-size: 11px; font-weight: normal; margin-top: 0; margin-bottom: 10px; color: #555; line-height: 1.4; }
          .header h2 { font-size: 18px; color: #666; margin-top: 8px; }
          .po-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 12px; }
          .po-details div { padding: 5px; }
          .po-details strong { display: inline-block; width: 120px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          .items-table th, .items-table td { border: 1px solid #000; padding: 5px; text-align: left; }
          .items-table th { background-color: #f0f0f0; font-weight: bold; }
          .items-table td.number { text-align: right; }
          .totals { margin-left: auto; width: 300px; font-size: 12px; }
          .totals div { display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #ddd; }
          .totals .net-amount { font-weight: bold; font-size: 14px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
          .footer { margin-top: 40px; font-size: 11px; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature div { text-align: center; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NT INFOSOL LLP</h1>
          <h3 style="font-size: 12px; font-weight: normal; margin-top: 5px; color: #333;">A-801, Swastik Universal, Beside Valentine Multiplex, Piplod-Dumas Road, Surat-395007</h3>
          <h2>PURCHASE ORDER</h2>
        </div>
        
        <div class="po-details">
          <div><strong>PO No:</strong> ${formData.po_no || 'N/A'}</div>
          <div><strong>Date:</strong> ${formData.date || 'N/A'}</div>
          <div><strong>Vendor/Supplier:</strong> ${formData.party_name || 'N/A'}</div>
          <div><strong>Store:</strong> ${formData.store || 'N/A'}</div>
          <div><strong>Mode:</strong> ${formData.mode || 'N/A'}</div>
          <div><strong>Agent:</strong> ${formData.agent || 'N/A'}</div>
          <div><strong>Address:</strong> ${formData.address || 'N/A'}</div>
          <div><strong>GSTIN:</strong> ${formData.gstin || 'N/A'}</div>
          <div><strong>Payment Terms:</strong> ${formData.pay_terms || 'N/A'}</div>
          <div><strong>Delivery Terms:</strong> ${formData.del_terms || 'N/A'}</div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item Code</th>
              <th>Description</th>
              <th>Dept</th>
              <th>UQC</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowData.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.item_code || ''}</td>
                <td>${item.description || ''}</td>
                <td>${item.department || ''}</td>
                <td>${item.uqc || ''}</td>
                <td class="number">${Number(item.qty || 0).toFixed(3)}</td>
                <td class="number">${Number(item.rate || 0).toFixed(2)}</td>
                <td class="number">${Number(item.amount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div><span>Gross Amount:</span><span>₹${totals.grossAmount}</span></div>
          <div><span>Discount (${formData.discount || 0}%):</span><span>₹${totals.discountAmount}</span></div>
          <div><span>Add/Less:</span><span>₹${totals.addLess}</span></div>
          <div><span>Freight:</span><span>₹${totals.freight}</span></div>
          <div class="net-amount"><span>Net Amount:</span><span>₹${totals.netAmount}</span></div>
        </div>
        
        <div class="footer">
          <p><strong>Remarks:</strong> ${formData.remarks || 'N/A'}</p>
          <p><strong>Special Note:</strong> ${formData.special_note || 'N/A'}</p>
        </div>
        
        <div class="signature">
          <div>
            <p>_____________________</p>
            <p>Prepared By</p>
          </div>
          <div>
            <p>_____________________</p>
            <p>Authorized Signature</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      // Close window after printing (optional)
      // printWindow.close();
    };
  }, [formData, rowData, totals]);

  // Inline render function or component outside is better, but let's just use a variable for the conditional render in return
  // or simply keep it simple.

  // Determine if form should be read-only
  const isReadOnly = editMode === 'view';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 font-sans text-xs">
      {/* Title Bar */}
      <div className="bg-white border-b border-red-800 px-2 py-1 flex items-center text-red-800 font-bold text-sm">
        <FileText size={16} className="mr-2" /> Purchase Order
      </div>

      {/* Main Header Label */}
      <div className="bg-gray-200 border-b border-gray-400 py-1 text-center font-bold text-base text-black shadow-sm">
        Purchase Order Generation
      </div>

      {viewMode === 'list' ? (
        <div className="flex-grow bg-white p-2 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Saved Purchase Orders</h2>
            <button onClick={fetchOrders} className="desktop-btn"><RefreshCw size={14} className="mr-1" /> Refresh List</button>
          </div>


          {/* Grid Container with explicit height via flex-grow + relative/absolute */}
          <div className="flex-grow w-full relative border border-gray-300">
            <div className="absolute inset-0 ag-theme-alpine">
              {savedOrders.length === 0 && <div className="absolute top-10 w-full text-center text-gray-500 z-10">No records found. Click Refresh or check backend.</div>}
              <AgGridReact
                rowData={Array.isArray(savedOrders) ? savedOrders : []}
                columnDefs={[
                  { field: 'po_no', headerName: 'PO No', sortable: true, filter: true },
                  { field: 'date', headerName: 'Date', sortable: true, filter: true },
                  { field: 'party_name', headerName: 'Party Name', sortable: true, filter: true, width: 250 },
                  { field: 'net_amount', headerName: 'Net Amount', sortable: true, filter: true, valueFormatter: p => `₹${p.value}` },
                  { field: 'status', headerName: 'Status' },
                  {
                    headerName: 'Action',
                    width: 150,
                    pinned: 'right',
                    cellRenderer: (params) => (
                      <div className="flex gap-1 items-center h-full">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(params.data);
                            // Trigger print after a short delay to ensure data is loaded
                            setTimeout(() => handlePrint(), 100);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Print PO"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(params.data);
                            // Trigger edit after a short delay to ensure data is loaded
                            setTimeout(() => handleEdit(), 100);
                          }}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Edit PO"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(params.data.po_no);
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete PO"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  }
                ]}
                defaultColDef={{ resizable: true }}
                onRowClicked={(event) => handleViewOrder(event.data)}
                onGridReady={(params) => {
                  setTimeout(() => params.api.sizeColumnsToFit(), 100);
                }}
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            * Backend has {Array.isArray(savedOrders) ? savedOrders.length : 0} records.
          </div>
        </div>
      ) : (
        <>
          {/* Form Header Area */}
          <div className="p-2 grid grid-cols-12 gap-y-1 gap-x-4 bg-white border-b border-gray-300">
            {/* Row 1 */}
            <div className="col-span-2 flex items-center justify-end font-semibold">P.O. No. :</div>
            <div className="col-span-2"><input name="po_no" value={formData.po_no} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input text-right" /></div>

            <div className="col-span-2 flex items-center justify-end font-semibold">Date :</div>
            <div className="col-span-2"><input type="date" name="date" value={formData.date} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

            <div className="col-span-2 flex items-center justify-end font-semibold">Ord. Mode :</div>
            <div className="col-span-2">
              <select name="ord_mode" value={formData.ord_mode} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input">
                <option value="">Select...</option>
                <option>CONSUMABLE</option>
                <option>REGULAR</option>
              </select>
            </div>

            {/* Row 2 */}
            <div className="col-span-2 flex items-center justify-end font-semibold">Party Name :</div>
            <div className="col-span-4"><input name="party_name" value={formData.party_name} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

            <div className="col-span-2 flex items-center justify-end font-semibold">Mode :</div>
            <div className="col-span-2">
              <select name="mode" value={formData.mode} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input">
                <option value="">Select...</option>
                <option>Direct</option>
                <option>Agent</option>
              </select>
            </div>

            <div className="col-span-1 flex items-center justify-end font-semibold">Store :</div>
            <div className="col-span-1">
              <select name="store" value={formData.store} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input">
                <option value="">Select...</option>
                <option>SURAT</option>
                <option>MUMBAI</option>
              </select>
            </div>

            {/* Row 3 */}
            <div className="col-span-2 flex items-center justify-end font-semibold">Ref. Date :</div>
            <div className="col-span-2">
              <input type="date" name="ref_date" value={formData.ref_date} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input w-full" />
            </div>

            <div className="col-span-2 flex items-center justify-end font-semibold">Currency :</div>
            <div className="col-span-2 flex gap-1">
              <select name="currency" value={formData.currency} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input w-2/3">
                <option>INR</option>
                <option>USD</option>
              </select>
              <input name="currency_rate" value={formData.currency_rate || "1.00"} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input w-1/3 text-center" />
            </div >

            <div className="col-span-2 flex items-center justify-end font-semibold">Agent :</div>
            <div className="col-span-2"><input name="agent" value={formData.agent} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

            {/* Row 4 - New Fields */}
            <div className="col-span-2 flex items-center justify-end font-semibold">Cr. Days :</div>
            <div className="col-span-2"><input name="cr_days" value={formData.cr_days} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input text-right" type="number" /></div>

            <div className="col-span-2 flex items-center justify-end font-semibold">Del. Days :</div>
            <div className="col-span-2"><input name="del_days" value={formData.del_days} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input text-right" type="number" /></div>

            <div className="col-span-1 flex items-center justify-end font-semibold">Freight :</div>
            <div className="col-span-1">
              <select name="freight_type" value={formData.freight_type} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input">
                <option value="">Select...</option>
                <option>EXTRA</option>
                <option>PAID</option>
                <option>TO PAY</option>
              </select>
            </div >

            <div className="col-span-2 flex items-center justify-center gap-2">
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name="is_import" checked={formData.is_import} onChange={handleInputChange} /> Import
              </label>
              <select name="status" value={formData.status} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input w-20">
                <option value="">Select...</option>
                <option>Open</option>
                <option>Close</option>
              </select>
            </div >


            {/* Row 5 - Address */}
            < div className="col-span-2 flex items-center justify-end font-semibold" > GSTIN :</div >
            <div className="col-span-2"><input name="gstin" value={formData.gstin} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

            <div className="col-span-1 flex items-center justify-end font-semibold">Address :</div>
            <div className="col-span-7"><input name="address" value={formData.address} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input w-full" /></div>
          </div >

          {/* Grid Area */}
          <div className="flex-1 bg-gray-50 p-1 overflow-hidden">
            <div className="ag-theme-alpine h-full w-full">
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={{ resizable: true, sortable: true, filter: true }}
                onGridReady={onGridReady}
                readOnlyEdit={isReadOnly}
                suppressClickEdit={isReadOnly}
              />
            </div>
          </div >

          {/* Footer Area */}
          < div className="bg-white border-t border-gray-400 p-2 text-xs" >
            <div className="grid grid-cols-12 gap-2">
              {/* Left Col */}
              <div className="col-span-5 grid grid-cols-12 gap-1">
                <div className="col-span-3 text-right font-semibold">Delivery Party :</div>
                <div className="col-span-8"><input name="delivery_party" value={formData.delivery_party} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>
                <div className="col-span-1"><button className="desktop-btn w-full">...</button></div>

                <div className="col-span-3 text-right font-semibold">Del. Terms :</div>
                <div className="col-span-9"><input name="del_terms" value={formData.del_terms} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

                <div className="col-span-3 text-right font-semibold">Pay. Terms :</div>
                <div className="col-span-9"><input name="pay_terms" value={formData.pay_terms} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

                <div className="col-span-3 text-right font-semibold">Despatch Ins :</div>
                <div className="col-span-9"><input name="despatch_ins" value={formData.despatch_ins} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

                <div className="col-span-3 text-right font-semibold">Sp. Note :</div>
                <div className="col-span-9"><input name="special_note" value={formData.special_note} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>

                <div className="col-span-3 text-right font-semibold">Remarks :</div>
                <div className="col-span-9"><input name="remarks" value={formData.remarks} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input" /></div>
              </div>

              {/* Middle Col (Buttons) */}
              <div className="col-span-2 flex flex-col justify-center gap-2 px-4">
                <button className="desktop-btn py-2" onClick={() => setShowDutiesModal(true)}>Duties & Charges</button>
                <button className="desktop-btn py-2" onClick={() => setShowTermsModal(true)}>Terms & Condition</button>
              </div>

              {/* Right Col (Totals) */}
              <div className="col-span-5 grid grid-cols-12 gap-x-2 gap-y-0.5 items-center text-[10px]">
                <div className="col-span-3 text-right font-semibold">Total Item :</div>
                <div className="col-span-3"><input value={totals.totalItem} readOnly className="desktop-input text-center font-bold h-5" /></div>

                <div className="col-span-3 text-right font-semibold">Total Qty :</div>
                <div className="col-span-3"><input value={totals.totalQty} readOnly className="desktop-input text-center font-bold h-5" /></div>

                {/* Divider */}
                <div className="col-span-12 border-t border-gray-300 my-0.5"></div>

                <div className="col-span-8 text-right font-bold">Gross Amount :</div>
                <div className="col-span-4"><input value={totals.grossAmount} readOnly className="desktop-input text-right font-bold bg-yellow-50 h-5" /></div>

                <div className="col-span-8 text-right">Discount (%) :</div>
                <div className="col-span-2">
                  <input name="discount" value={formData.discount} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input text-right h-5" type="number" step="0.01" placeholder="%" />
                </div>
                <div className="col-span-2">
                  <input value={`-₹${totals.discountAmount}`} readOnly className="desktop-input text-right bg-gray-100 text-red-600 font-semibold h-5 text-[9px]" title="Calculated discount amount" />
                </div>

                {/* Subtotal */}
                <div className="col-span-8 text-right font-bold text-blue-600 text-[11px]">Subtotal :</div>
                <div className="col-span-4"><input value={totals.subtotal} readOnly className="desktop-input text-right font-bold bg-blue-50 h-5" /></div>

                {/* GST Section - Compact */}
                {formData.gst_type === 'intra-state' ? (
                  <>
                    <div className="col-span-8 text-right text-green-700">CGST ({formData.cgst_percent}%) :</div>
                    <div className="col-span-4"><input value={totals.cgstAmount} readOnly className="desktop-input text-right bg-green-50 h-5" /></div>

                    <div className="col-span-8 text-right text-green-700">SGST ({formData.sgst_percent}%) :</div>
                    <div className="col-span-4"><input value={totals.sgstAmount} readOnly className="desktop-input text-right bg-green-50 h-5" /></div>
                  </>
                ) : (
                  <>
                    <div className="col-span-8 text-right text-green-700">IGST ({formData.igst_percent}%) :</div>
                    <div className="col-span-4"><input value={totals.igstAmount} readOnly className="desktop-input text-right bg-green-50 h-5" /></div>
                  </>
                )}

                {/* Total Tax */}
                <div className="col-span-8 text-right font-bold text-green-700 text-[11px]">Total Tax :</div>
                <div className="col-span-4"><input value={totals.totalTax} readOnly className="desktop-input text-right font-bold bg-green-100 h-5" /></div>

                {/* Other Charges - Only if > 0 */}
                {parseFloat(totals.otherCharges) > 0 && (
                  <>
                    <div className="col-span-8 text-right">Other Charges :</div>
                    <div className="col-span-4"><input value={totals.otherCharges} readOnly className="desktop-input text-right bg-gray-50 h-5" /></div>
                  </>
                )}

                <div className="col-span-8 text-right">Add / Less :</div>
                <div className="col-span-4"><input name="add_less" value={formData.add_less} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input text-right h-5" type="number" /></div>

                <div className="col-span-5 text-right">
                  <span className="bg-gray-400 text-white px-1.5 py-0.5 inline-block text-[9px]">Freight :</span>
                </div>
                <div className="col-span-3"><input name="freight_amt" value={formData.freight_amt} onChange={handleInputChange} disabled={isReadOnly} className="desktop-input text-right h-5" type="number" /></div>
                <div className="col-span-4"></div>

                {/* Divider before Net Amount */}
                <div className="col-span-12 border-t-2 border-red-600 my-0.5"></div>

                <div className="col-span-8 text-right font-bold text-red-600 text-[11px]">Net Amount :</div>
                <div className="col-span-4 flex items-center">
                  <div className="bg-red-600 text-white px-1.5 font-bold select-none text-[10px] h-5 flex items-center">₹</div>
                  <input value={totals.netAmount} readOnly className="desktop-input text-right font-bold text-red-600 flex-1 h-5" />
                </div>
              </div>
            </div>
          </div >
        </>
      )}

      {/* Action Bar */}
      <div className="bg-white border-t border-gray-300 p-2 flex justify-center gap-2 shadow-inner">
        <fieldset className="border border-gray-300 px-2 flex gap-2">
          <legend className="text-[10px] px-1 ml-2 font-semibold">Action</legend>
          {viewMode === 'entry' ? (
            <>
              {/* Entry View Buttons */}
              {editMode === 'new' || editMode === 'edit' ? (
                <>
                  <button className="desktop-btn" onClick={handleAddRow}><Plus size={14} className="mr-1" /> Add Item</button>
                  <button className="desktop-btn" onClick={handleSave}><Save size={14} className="mr-1" /> Save</button>
                  <button className="desktop-btn" onClick={handleCancel}><X size={14} className="mr-1" /> Cancel</button>
                  <button className="desktop-btn" onClick={() => { fetchOrders(); setViewMode('list'); }}><FileText size={14} className="mr-1" /> Show Record</button>
                </>
              ) : (
                <>
                  {/* View Mode Buttons */}
                  <button className="desktop-btn" onClick={handleAddRow}><Plus size={14} className="mr-1" /> Add Item</button>
                  <button className="desktop-btn" onClick={handleEdit}><Edit size={14} className="mr-1" /> Edit</button>
                  <button className="desktop-btn text-red-600" onClick={() => handleDeleteOrder(currentPONo)}><Trash2 size={14} className="mr-1" /> Delete</button>
                  <button className="desktop-btn" onClick={handlePrint}><Printer size={14} className="mr-1" /> Print</button>
                  <button className="desktop-btn" onClick={() => { fetchOrders(); setViewMode('list'); }}><FileText size={14} className="mr-1" /> Show Record</button>
                </>
              )}
            </>
          ) : (
            <>
              {/* List View Buttons */}
              <button className="desktop-btn" onClick={handleNewOrder}><Plus size={14} className="mr-1" /> New Order</button>
              <button className="desktop-btn" onClick={() => setViewMode('entry')}>Back to Entry</button>
            </>
          )}

          <button className="desktop-btn" onClick={() => { fetchOrders(); setViewMode('list'); }}>Exit</button>
        </fieldset>

        <div className="flex gap-1 items-end ml-4">
          <button className="desktop-btn" onClick={handleExport} disabled={!formData.po_no} title="Export to Excel"><Download size={14} className="mr-1" /> Export</button>
          <button className="desktop-btn" onClick={handleViewUpdates} disabled={!formData.po_no} title="View update history"><History size={14} className="mr-1" /> Updates</button>
          <button className="desktop-btn" onClick={handleViewGRN} disabled={!formData.po_no} title="View GRN details"><Package size={14} className="mr-1" /> GRN_Details</button>
        </div>
      </div>

      {/* Updates Modal */}
      {showUpdatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowUpdatesModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Update History - PO {formData.po_no}</h2>
              <button onClick={() => setShowUpdatesModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              {formData.updates && formData.updates.length > 0 ? (
                formData.updates.map((update, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-blue-600 capitalize">{update.action}</span>
                        <span className="text-gray-500 text-sm ml-2">by {update.user}</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(update.timestamp).toLocaleString()}</span>
                    </div>
                    {update.changes && Object.keys(update.changes).length > 0 && (
                      <div className="mt-2 text-sm">
                        <strong>Changes:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {Object.entries(update.changes).map(([field, change]) => (
                            <li key={field}>
                              <span className="font-medium">{field}:</span>
                              <span className="text-red-600"> {JSON.stringify(change.old)}</span> →
                              <span className="text-green-600"> {JSON.stringify(change.new)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No update history available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {showGRNModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowGRNModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">GRN Details - PO {formData.po_no}</h2>
              <button onClick={() => setShowGRNModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {formData.grn_records && formData.grn_records.length > 0 ? (
                formData.grn_records.map((grn, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">GRN #{grn.grn_no}</h3>
                        <p className="text-sm text-gray-600">Date: {grn.grn_date}</p>
                      </div>
                    </div>
                    {grn.items && grn.items.length > 0 && (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="p-2 text-left">Item Code</th>
                            <th className="p-2 text-right">Ordered</th>
                            <th className="p-2 text-right">Received</th>
                            <th className="p-2 text-right">Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grn.items.map((item, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2">{item.item_code}</td>
                              <td className="p-2 text-right">{item.ordered_qty}</td>
                              <td className="p-2 text-right text-green-600 font-semibold">{item.received_qty}</td>
                              <td className="p-2 text-right text-orange-600">{item.pending_qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {grn.remarks && (
                      <p className="mt-2 text-sm italic text-gray-600">Remarks: {grn.remarks}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No GRN records found for this PO</p>
                  <p className="text-sm text-gray-400">GRN records will appear here once goods are received</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duties & Charges Modal */}
      {showDutiesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDutiesModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Duties & Charges</h2>
              <button onClick={() => setShowDutiesModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* GST Type Selection */}
              <div>
                <label className="font-semibold mb-2 block">GST Type:</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gst_type"
                      value="intra-state"
                      checked={formData.gst_type === 'intra-state'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Intra-State (CGST + SGST)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gst_type"
                      value="inter-state"
                      checked={formData.gst_type === 'inter-state'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Inter-State (IGST)
                  </label>
                </div>
              </div>

              {/* Tax Inputs */}
              <div className="grid grid-cols-2 gap-4">
                {formData.gst_type === 'intra-state' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">CGST (%)</label>
                      <input
                        type="number"
                        name="cgst_percent"
                        value={formData.cgst_percent}
                        onChange={handleInputChange}
                        className="desktop-input"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500 mt-1">= ₹{totals.cgstAmount}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">SGST (%)</label>
                      <input
                        type="number"
                        name="sgst_percent"
                        value={formData.sgst_percent}
                        onChange={handleInputChange}
                        className="desktop-input"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500 mt-1">= ₹{totals.sgstAmount}</p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">IGST (%)</label>
                    <input
                      type="number"
                      name="igst_percent"
                      value={formData.igst_percent}
                      onChange={handleInputChange}
                      className="desktop-input"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">= ₹{totals.igstAmount}</p>
                  </div>
                )}
              </div>

              {/* Other Charges */}
              <div>
                <label className="block text-sm font-medium mb-1">Other Charges (₹)</label>
                <input
                  type="number"
                  name="other_charges"
                  value={formData.other_charges}
                  onChange={handleInputChange}
                  className="desktop-input"
                  step="0.01"
                />
              </div>

              {/* Tax Summary */}
              <div className="bg-blue-50 p-3 rounded">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal (after discount):</span>
                  <span className="font-semibold">₹{totals.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Total Tax:</span>
                  <span className="font-semibold text-blue-600">₹{totals.totalTax}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Other Charges:</span>
                  <span className="font-semibold">₹{totals.otherCharges}</span>
                </div>
              </div>

              <button
                onClick={() => setShowDutiesModal(false)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Condition Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowTermsModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Terms & Conditions</h2>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                name="terms_conditions_text"
                value={formData.terms_conditions_text}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded p-3 text-sm"
                rows="12"
                placeholder="Enter terms and conditions..."
              />

              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;




