import React, { useState, useMemo } from 'react';

const BaseStatsTable = ({ 
  data, 
  columns, 
  emptyMessage = 'No data available'
}) => {
  // Only show visible columns (non-hidden)
  const visibleColumns = columns.filter(col => !col.hidden);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
        <p className="text-neutral-500 dark:text-neutral-400 text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-b-lg">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm md:text-base rounded-b-lg">
        <thead className="bg-neutral-50 dark:bg-black">
          <tr>
            {visibleColumns.map((column) => (
              <th 
                key={column.key}
                scope="col" 
                className={`
                  px-1 py-2 sm:px-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider
                  ${column.sortable !== false ? '' : ''}
                `}
              >
                <div className="flex items-center">
                  <span className="whitespace-nowrap">{column.header}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-900">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-neutral-50 dark:hover:bg-black">
              {visibleColumns.map((column, colIndex) => {
                const value = row[column.key];
                const renderedValue = column.renderer 
                  ? column.renderer(value, row) 
                  : value;
                const isFirstColumn = colIndex === 0;
                return (
                  <td 
                    key={`${rowIndex}-${column.key}`} 
                    className={`
                      px-1 py-2 sm:px-2 whitespace-nowrap text-xs sm:text-sm 
                      ${isFirstColumn 
                        ? 'font-medium text-neutral-900 dark:text-white min-w-[120px]' 
                        : 'text-neutral-800 dark:text-neutral-200'}
                    `}
                  >
                    {renderedValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BaseStatsTable;