// src/context/DraftModalContext.js
import React, { createContext, useState, useContext } from 'react';

const DraftModalContext = createContext(null);

export const DraftModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState({});

  const openDraftModal = (props) => {
    setModalProps(props);
    setIsModalOpen(true);
  };

  const closeDraftModal = () => {
    setIsModalOpen(false);
  };

  return (
    <DraftModalContext.Provider value={{ isModalOpen, modalProps, openDraftModal, closeDraftModal }}>
      {children}
    </DraftModalContext.Provider>
  );
};

export const useDraftModal = () => {
  const context = useContext(DraftModalContext);
  if (context === null) {
    throw new Error('useDraftModal must be used within a DraftModalProvider');
  }
  return context;
};