import React from 'react';
import StickyTableShell from '../../elements/StickyTableShell';

const BaseStatsTable = ({ 
  data, 
  columns, 
  emptyMessage = 'No data available'
}) => {
  // Only show visible columns (non-hidden)
  const visibleColumns = columns.filter(col => !col.hidden);

  if (!data || data.length === 0) {
    return (
      <div className="lg-glass-secondary lg-rounded-lg p-4 border border-white/40 dark:border-white/10">
        <p className="text-neutral-500 dark:text-neutral-400 text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <StickyTableShell className="overflow-x-auto rounded-b-lg">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm md:text-base rounded-b-lg">
        <thead className="bg-white/40 dark:bg-black/30">
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
        <tbody className="bg-white/20 dark:bg-black/20 divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/30 dark:hover:bg-white/5">
              {visibleColumns.map((column, colIndex) => {
                // Safely get value or provide a default
                const value = row ? row[column.key] : undefined;
                
                // Safely render value
                let renderedValue;
                try {
                  if (column.renderer) {
                    // Use try-catch around the renderer to catch any errors
                    renderedValue = column.renderer(value, row || {});
                  } else {
                    renderedValue = value;
                  }
                } catch (err) {
                  console.error(`Error rendering column ${column.key}:`, err);
                  renderedValue = "Error";
                }
                
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
    </StickyTableShell>
  );
};

export default BaseStatsTable;
