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

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black shadow rounded-b-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {columns.map((column) => {
              // Skip hidden columns
              if (column.hidden) return null;
              
              return (
                <th 
                  key={column.key}
                  scope="col" 
                  className={`px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${column.sortable !== false ? 'cursor-pointer' : ''}`}
                  onClick={() => column.sortable !== false && requestSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable !== false && (
                      <span className="ml-1">
                        {sortConfig.key === column.key ? (
                          <svg 
                            className="w-4 h-4" 
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
                        ) : (
                          <svg 
                            className="w-4 h-4 opacity-0 group-hover:opacity-50" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
          {sortedData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-900">
              {columns.map((column) => {
                // Skip hidden columns
                if (column.hidden) return null;
                
                // Get the cell value
                const value = row[column.key];
                
                // Format the value based on the renderer function if provided
                const renderedValue = column.renderer ? column.renderer(value, row) : value;
                
                return (
                  <td 
                    key={`${rowIndex}-${column.key}`} 
                    className="px-2 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200"
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