import React, { useState, useMemo } from 'react';

const BaseStatsTable = ({ 
  data, 
  columns, 
  defaultSortColumn = null, 
  defaultSortDirection = 'desc', 
  emptyMessage = 'No data available'
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: defaultSortColumn,
    direction: defaultSortDirection
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !data || data.length === 0) return data;
    
    return [...data].sort((a, b) => {
      // Handle null or undefined values
      if (a[sortConfig.key] == null) return 1;
      if (b[sortConfig.key] == null) return -1;
      
      // Get column type
      const column = columns.find(col => col.key === sortConfig.key);
      const valueA = a[sortConfig.key];
      const valueB = b[sortConfig.key];
      
      // Sort based on data type
      if (column && column.type === 'number') {
        return sortConfig.direction === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      } else if (column && column.type === 'date') {
        return sortConfig.direction === 'asc' 
          ? new Date(valueA) - new Date(valueB) 
          : new Date(valueB) - new Date(valueA);
      } else {
        // Default string comparison
        return sortConfig.direction === 'asc' 
          ? valueA.toString().localeCompare(valueB.toString()) 
          : valueB.toString().localeCompare(valueA.toString());
      }
    });
  }, [data, sortConfig, columns]);

  const requestSort = (key) => {
    setSortConfig((prevConfig) => {
      // If clicking the same column, toggle direction
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      
      // Default to descending for new column
      return {
        key,
        direction: 'desc'
      };
    });
  };

  // Get visible columns (non-hidden)
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
                  ${column.sortable !== false ? 'cursor-pointer' : ''}
                `}
                onClick={() => column.sortable !== false && requestSort(column.key)}
              >
                <div className="flex items-center">
                  <span className="whitespace-nowrap">{column.header}</span>
                  {column.sortable !== false && (
                    <span className="ml-1">
                      {sortConfig.key === column.key ? (
                        <svg 
                          className="w-3 h-3" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          {sortConfig.direction === 'asc' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          )}
                        </svg>
                      ) : null}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-900">
          {sortedData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-neutral-50 dark:hover:bg-black">
              {visibleColumns.map((column, colIndex) => {
                // Get the cell value
                const value = row[column.key];
                
                // Format the value based on the renderer function if provided
                const renderedValue = column.renderer 
                  ? column.renderer(value, row) 
                  : value;
                
                // Apply special styling to first column
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