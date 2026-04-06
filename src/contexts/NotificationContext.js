import React, { createContext, useState, useContext, useCallback } from "react";

const NotificationContext = createContext({});

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    visible: false,
    type: "",
    message: "",
  });

  const showNotification = useCallback((type, message) => {
    setNotification({ visible: true, type, message });
    setTimeout(() => {
      setNotification({ visible: false, type: "", message: "" });
    }, 3000);
  }, []);

  const showSuccess = useCallback(
    (message) => {
      showNotification("success", message);
    },
    [showNotification]
  );

  const showError = useCallback(
    (message) => {
      showNotification("error", message);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message) => {
      showNotification("info", message);
    },
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notification,
        showNotification,
        showSuccess,
        showError,
        showInfo,
      }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};
