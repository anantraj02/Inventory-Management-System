import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../services/api';
import Table from '../components/common/Table';
import { FileText, FileDown, Search, Calendar, Store, Database } from 'lucide-react';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const Reports = () => {
  const { user } = useSelector((state) => state.auth);

  // States
  const [reportType, setReportType] = useState('transactions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branch, setBranch] = useState(user.branch?._id || '');

  const [branches, setBranches] = useState([]);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);

  const isGlobalUser = () => {
    return user?.role?.name === 'Main Admin' || user?.role?.name === 'Auditor';
  };

  const fetchBranches = async () => {
    try {
      const res = await API.get('/branches?limit=100');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isGlobalUser()) {
      fetchBranches();
    }
  }, []);

  const handleFetchReportData = async () => {
    try {
      setLoading(true);
      setDataList([]);
      
      const query = `?startDate=${startDate}&endDate=${endDate}&branch=${branch}`;
      let res;
      
      if (reportType === 'transactions') {
        res = await API.get(`/reports/transactions${query}`);
        if (res.data.success) {
          // Combine stockIn and stockOut for display
          const ins = (res.data.data.stockIn || []).map(x => ({ ...x, txnType: 'Stock In' }));
          const outs = (res.data.data.stockOut || []).map(x => ({ ...x, txnType: 'Stock Out' }));
          const combined = [...ins, ...outs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setDataList(combined);
        }
      } else if (reportType === 'transfers') {
        res = await API.get(`/reports/transfers${query}`);
        if (res.data.success) setDataList(res.data.data);
      } else if (reportType === 'low-stock') {
        res = await API.get(`/reports/low-stock${query}`);
        if (res.data.success) setDataList(res.data.data);
      } else if (reportType === 'vendor-purchases') {
        res = await API.get(`/reports/vendor-purchases${query}`);
        if (res.data.success) setDataList(res.data.data);
      } else if (reportType === 'employee-issues') {
        res = await API.get(`/reports/employee-issues${query}`);
        if (res.data.success) setDataList(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to query report data');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on change of inputs
  useEffect(() => {
    handleFetchReportData();
  }, [reportType, startDate, endDate, branch]);

  // EXPORT EXCEL (.xlsx)
  const handleExportExcel = () => {
    if (dataList.length === 0) return toast.warning('No data to export.');
    
    // Flat map data based on type
    const rows = dataList.map((row, idx) => {
      if (reportType === 'transactions') {
        return {
          'No': idx + 1,
          'Txn Type': row.txnType,
          'Branch': row.branch?.name,
          'Reference': row.invoiceNumber || row.type || 'Internal Request',
          'Items Count': row.items?.length || 0,
          'Total Amount (INR)': row.totalAmount,
          'Notes': row.notes || '',
          'Timestamp': new Date(row.createdAt).toLocaleString()
        };
      }
      if (reportType === 'transfers') {
        return {
          'No': idx + 1,
          'From Branch': row.fromBranch?.name,
          'To Branch': row.toBranch?.name,
          'Items Count': row.items?.length || 0,
          'Status': row.status,
          'Initiated By': row.createdBy?.name,
          'Timestamp': new Date(row.createdAt).toLocaleString()
        };
      }
      if (reportType === 'low-stock') {
        return {
          'No': idx + 1,
          'SKU': row.sku,
          'Item Name': row.itemName,
          'Category': row.categoryName,
          'Branch Name': row.branchName,
          'Current Stock': row.quantity,
          'Min Safety Limit': row.minStockLevel,
          'Rack Location': row.rackLocation || 'N/A'
        };
      }
      if (reportType === 'vendor-purchases') {
        return {
          'No': idx + 1,
          'Vendor': row.vendor?.name,
          'Invoice #': row.invoiceNumber,
          'Total Value (INR)': row.totalAmount,
          'Received By': row.receivedBy?.name,
          'Timestamp': new Date(row.createdAt).toLocaleString()
        };
      }
      if (reportType === 'employee-issues') {
        return {
          'No': idx + 1,
          'Employee Name': row.recipientEmployee?.name,
          'Emp ID': row.recipientEmployee?.employeeId,
          'Branch': row.branch?.name,
          'Items Issued': row.items?.map(it => `${it.item?.name} (${it.quantity})`).join(', '),
          'Notes': row.notes || '',
          'Timestamp': new Date(row.createdAt).toLocaleString()
        };
      }
      return {};
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report Sheet');
    XLSX.writeFile(wb, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Spreadsheet exported successfully!');
  };

  // EXPORT PDF (.pdf)
  const handleExportPDF = () => {
    if (dataList.length === 0) return toast.warning('No data to export.');

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');

    // Header Title
    doc.setFontSize(20);
    doc.setTextColor(139, 92, 246); // Primary Purple
    doc.text(`VORTEX ERP: ${reportType.toUpperCase()} REPORT`, 14, 20);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Report Period: ${startDate || 'All Time'} - ${endDate || 'Present'}`, 14, 28);
    doc.text(`Generated By: ${user.name} (${user.role.name})`, 14, 34);
    doc.text(`Timestamp: ${new Date().toLocaleString()}`, 14, 40);

    // Draw horizontal line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 44, 196, 44);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate 900
    let yPos = 52;

    // Output Rows
    dataList.slice(0, 30).forEach((row, idx) => {
      // Prevent overflow
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }

      let lineText = '';
      if (reportType === 'transactions') {
        lineText = `${idx + 1}. [${row.txnType}] Ref: ${row.invoiceNumber || row.type || 'Internal'} - Amt: INR ${row.totalAmount.toLocaleString()} - Date: ${new Date(row.createdAt).toLocaleDateString()}`;
      } else if (reportType === 'transfers') {
        lineText = `${idx + 1}. Transfer: ${row.fromBranch?.name} -> ${row.toBranch?.name} - Status: [${row.status}] - Initiated: ${row.createdBy?.name}`;
      } else if (reportType === 'low-stock') {
        lineText = `${idx + 1}. SKU: ${row.sku} - Item: ${row.itemName} - Stock: ${row.quantity} (Min: ${row.minStockLevel}) - Branch: ${row.branchName}`;
      } else if (reportType === 'vendor-purchases') {
        lineText = `${idx + 1}. Vendor: ${row.vendor?.name} - Invoice: ${row.invoiceNumber} - Total: INR ${row.totalAmount.toLocaleString()}`;
      } else if (reportType === 'employee-issues') {
        lineText = `${idx + 1}. Issued To: ${row.recipientEmployee?.name} (${row.recipientEmployee?.employeeId}) - Branch: ${row.branch?.name}`;
      }

      doc.text(lineText, 14, yPos);
      yPos += 8;
    });

    if (dataList.length > 30) {
      doc.setFontStyle('italic');
      doc.text(`... and ${dataList.length - 30} more entries. (Preview limited to first 30 pages)`, 14, yPos + 4);
    }

    doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF document exported successfully!');
  };

  // Columns for Preview table dynamically based on reportType
  const getColumns = () => {
    if (reportType === 'transactions') {
      return [
        { header: 'Type', key: 'txnType' },
        { header: 'Branch', key: 'branch', render: (row) => <span>{row.branch?.name}</span> },
        { header: 'Ref / Invoice', key: 'invoiceNumber', render: (row) => <span>{row.invoiceNumber || row.type || 'Request'}</span> },
        { header: 'Amount', key: 'totalAmount', render: (row) => <span className="font-semibold">₹{row.totalAmount.toLocaleString()}</span> },
        { header: 'Date', key: 'createdAt', render: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span> }
      ];
    }
    if (reportType === 'transfers') {
      return [
        { header: 'From Branch', key: 'fromBranch', render: (row) => <span>{row.fromBranch?.name}</span> },
        { header: 'To Branch', key: 'toBranch', render: (row) => <span>{row.toBranch?.name}</span> },
        { header: 'Items Count', key: 'items', render: (row) => <span>{row.items?.length || 0}</span> },
        { header: 'Status', key: 'status' },
        { header: 'Created By', key: 'createdBy', render: (row) => <span>{row.createdBy?.name}</span> }
      ];
    }
    if (reportType === 'low-stock') {
      return [
        { header: 'SKU', key: 'sku' },
        { header: 'Item Name', key: 'itemName' },
        { header: 'Branch Name', key: 'branchName' },
        { header: 'Stock Qty', key: 'quantity', render: (row) => <span className="text-red-400 font-bold">{row.quantity}</span> },
        { header: 'Min Level', key: 'minStockLevel' }
      ];
    }
    if (reportType === 'vendor-purchases') {
      return [
        { header: 'Supplier / Vendor', key: 'vendor', render: (row) => <span>{row.vendor?.name}</span> },
        { header: 'Invoice #', key: 'invoiceNumber' },
        { header: 'Total Value', key: 'totalAmount', render: (row) => <span className="font-semibold">₹{row.totalAmount.toLocaleString()}</span> },
        { header: 'Received By', key: 'receivedBy', render: (row) => <span>{row.receivedBy?.name}</span> },
        { header: 'Date', key: 'createdAt', render: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span> }
      ];
    }
    if (reportType === 'employee-issues') {
      return [
        { header: 'Employee Name', key: 'employee', render: (row) => <span>{row.recipientEmployee?.name}</span> },
        { header: 'Emp ID', key: 'empId', render: (row) => <span>{row.recipientEmployee?.employeeId}</span> },
        { header: 'Branch Location', key: 'branch', render: (row) => <span>{row.branch?.name}</span> },
        { header: 'Details', key: 'notes' },
        { header: 'Date', key: 'createdAt', render: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span> }
      ];
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Enterprise Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Generate ledger summaries, stock transaction exports, and low-stock alerts lists</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-semibold border border-emerald-500/20 transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Excel Spread</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white rounded-xl text-xs font-semibold border border-violet-500/20 transition-all cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF Print</span>
          </button>
        </div>
      </div>

      {/* Query Filter panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none transition-all"
          >
            <option value="transactions">Stock Transaction Ledger</option>
            <option value="transfers">Branch Transfer Report</option>
            <option value="low-stock">Safety Low Stock Report</option>
            <option value="vendor-purchases">Vendor Purchases Report</option>
            <option value="employee-issues">Employee Issues Report</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none transition-all"
          />
        </div>

        {isGlobalUser() ? (
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Branch Location</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none transition-all"
            >
              <option value="">All Branches</option>
              {branches.map(br => (
                <option key={br._id} value={br._id}>{br.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Branch Location</label>
            <input
              type="text"
              value={user.branch?.name || 'Headquarters'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed"
              disabled
            />
          </div>
        )}
      </div>

      {/* Table Preview */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2">Table Preview (Recent 100 rows)</span>
        <Table
          columns={getColumns()}
          data={dataList.slice(0, 100)}
          totalPages={1}
          currentPage={1}
          loading={loading}
          onPageChange={() => {}}
        />
      </div>
    </div>
  );
};

export default Reports;
