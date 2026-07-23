import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Table Component for Enterprise dashboard.
 * @param {Array} columns - [{ header: 'Col Title', key: 'prop', sortable: true, render: (row) => jsx }]
 * @param {Array} data - Row datasets
 * @param {number} totalPages - Total pages for pagination
 * @param {number} currentPage - Active page index
 * @param {function} onPageChange - Handler for page transition
 * @param {string} sortField - The field currently sorted
 * @param {string} sortDirection - 'asc' or 'desc'
 * @param {function} onSort - Handler when column header is clicked
 * @param {boolean} loading - Displays skeletons on loading
 */
const Table = ({
  columns,
  data = [],
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  sortField,
  sortDirection,
  onSort,
  loading = false
}) => {
  return (
    <div className="w-full flex flex-col">
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 select-none ${col.sortable && onSort ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && onSort && sortField === col.key && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
            {loading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4">
                      <div className="h-4 bg-slate-800 rounded-md w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row._id || rIdx}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4.5 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-violet-600 border-violet-500 text-white font-medium'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
