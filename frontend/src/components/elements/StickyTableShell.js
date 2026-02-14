import React from 'react';

const StickyTableShell = ({
  children,
  className = '',
  stickyTop = 'var(--app-header-offset)',
  stickyStackOffset = '0px',
  style
}) => {
  const tableStickyTop = `calc(${stickyTop} + ${stickyStackOffset})`;

  return (
    <div
      className={className}
      style={{ '--table-sticky-top': tableStickyTop, ...style }}
    >
      {children}
    </div>
  );
};

export default StickyTableShell;
