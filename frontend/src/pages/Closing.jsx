import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import API from '../services/api';
import { Check, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

const Closing = () => {
  const { user } = useSelector((state) => state.auth);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reconcileList, setReconcileList] = useState([]);
  const [actualCounts, setActualCounts] = useState({}); // itemId -> actualQuantity
  const [reportData, setReportData] = useState(null);

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/inventory?branch=${user.branch?._id}&limit=100`);
      if (res.data.success) {
        setReconcileList(res.data.data);
        const counts = {};
        res.data.data.forEach(item => {
          counts[item.item._id] = item.quantity;
        });
        setActualCounts(counts);
      }
    } catch (err) {
      toast.error('Failed to load reconciliation stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 1) {
      fetchReconciliationData();
    }
  }, [step]);

  const handleCountChange = (itemId, val) => {
    setActualCounts({
      ...actualCounts,
      [itemId]: Math.max(0, parseInt(val) || 0)
    });
  };

  // Step 1: Submit Reconciliation Adjustments
  const handleReconcileSubmit = async () => {
    try {
      setLoading(true);
      const adjustments = reconcileList.map(row => ({
        item: row.item._id,
        actualQuantity: actualCounts[row.item._id],
        notes: `Monthly close reconciliation adjustment.`
      })).filter(adj => {
        const row = reconcileList.find(r => r.item._id === adj.item);
        return row.quantity !== adj.actualQuantity; // only send if there is a difference
      });

      if (adjustments.length > 0) {
        const res = await API.post('/closing/reconcile', {
          branch: user.branch?._id,
          adjustments
        });
        if (res.data.success) {
          toast.success('Reconciliation completed! Stock levels adjusted.');
        }
      } else {
        toast.info('No stock adjustments were needed.');
      }
      
      // Proceed to Step 2
      setStep(2);
    } catch (err) {
      toast.error('Reconciliation adjustments failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate Monthly Report
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/closing/report?branch=${user.branch?._id}`);
      if (res.data.success) {
        setReportData(res.data.data);
        setStep(3); // Proceed to Step 3 (Review)
      }
    } catch (err) {
      toast.error('Failed to compile report snapshot');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Archive month
  const handleArchiveMonth = async () => {
    try {
      setLoading(true);
      const res = await API.post('/closing/archive', {
        branch: user.branch?._id
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Month archived successfully!');
        setStep(4); // Success page
      }
    } catch (err) {
      toast.error('Archiving failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Monthly Closing Wizard</h1>
        <p className="text-xs text-slate-500 mt-1">Reconcile current branch counts, freeze monthly transactions, and archive reports</p>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { label: 'Stock Reconciliation', s: 1 },
          { label: 'Compile Report', s: 2 },
          { label: 'Final Review', s: 3 },
          { label: 'Archive & Lock', s: 4 }
        ].map((item) => {
          const isDone = step > item.s;
          const isActive = step === item.s;
          return (
            <div
              key={item.s}
              className={`p-4 rounded-xl border ${
                isActive
                  ? 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold'
                  : isDone
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : 'bg-slate-900/40 border-slate-900 text-slate-600'
              } flex items-center gap-2.5 transition-all text-xs`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                isDone ? 'bg-violet-500 text-white' : 'bg-slate-950 text-slate-500'
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : item.s}
              </span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Steps Content Panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Step 1: Stock Count Reconciliation</h2>
              <p className="text-xs text-slate-500">Verify and enter physical count of all inventory. Discrepancies will be saved as adjustments.</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Item Name</th>
                    <th className="px-4 py-3 font-semibold text-center">System Qty</th>
                    <th className="px-4 py-3 font-semibold text-center w-32">Actual Count</th>
                    <th className="px-4 py-3 font-semibold text-center">Discrepancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {reconcileList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                        No inventory items in branch to reconcile.
                      </td>
                    </tr>
                  ) : (
                    reconcileList.map((row) => {
                      const actual = actualCounts[row.item._id] ?? row.quantity;
                      const diff = actual - row.quantity;
                      return (
                        <tr key={row._id}>
                          <td className="px-4 py-3 font-semibold text-slate-400">{row.item.sku}</td>
                          <td className="px-4 py-3">{row.item.name}</td>
                          <td className="px-4 py-3 text-center">{row.quantity}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-center text-slate-200 focus:outline-none focus:border-violet-500"
                              value={actual}
                              onChange={(e) => handleCountChange(row.item._id, e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {diff === 0 ? (
                              <span className="text-slate-500">-</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-400">+{diff} (Gain)</span>
                            ) : (
                              <span className="text-red-400">{diff} (Shrink)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
              <button
                onClick={handleReconcileSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
              >
                <span>Submit & Compile Report</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto shadow-xl">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Step 2: Generate Monthly Audit Snapshot</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ready to compile aggregate metrics for {user.branch?.name}. Click compile to prepare database closing snapshots.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-6">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Back to Reconciliation
              </button>
              <button
                onClick={handleGenerateReport}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
              >
                <span>Compile Snapshot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && reportData && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Step 3: Review Snapshot ({reportData.month})</h2>
              <p className="text-xs text-slate-500">Confirm all monthly transactions match before archiving this period permanently.</p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Stock In Additions</span>
                <span className="text-lg font-black text-slate-200 block">₹{reportData.stockIn.totalValue.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block">{reportData.stockIn.totalQuantity} items received</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Stock Out Dispatches</span>
                <span className="text-lg font-black text-slate-200 block">₹{reportData.stockOut.totalValue.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block">{reportData.stockOut.totalQuantity} items issued</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Completed Transfers</span>
                <span className="text-lg font-black text-slate-200 block">{reportData.transfersCount}</span>
                <span className="text-[10px] text-slate-400 block">Internal shipments processed</span>
              </div>
            </div>

            {/* Safety Warning */}
            <div className="flex gap-3 p-4 bg-amber-950/20 border border-amber-500/10 rounded-xl text-amber-400 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong>Warning: Period Archival Action</strong>
                <p className="mt-1 leading-normal text-slate-300">
                  Archiving the month logs a snapshot of all ledger balances and records a permanent close log. You must guarantee all data matches.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleArchiveMonth}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Archive & Close Month</span>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Month Period Closed Successfully!</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-normal">
                Reconciliation data adjustments have been saved, snapshot metrics compiled, and archive logged into Audit Trails.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
              >
                Restart Close Process
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Closing;
