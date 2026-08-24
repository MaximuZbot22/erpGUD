import React, { createContext, useContext, useState, useEffect } from 'react';

export type ErpVersion = 'v1' | 'v2';

interface VersionContextType {
  version: ErpVersion;
  setVersion: (ver: ErpVersion) => void;
  toggleVersion: () => void;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const VersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [version, setVersionState] = useState<ErpVersion>(() => {
    const saved = localStorage.getItem('gud_erp_version');
    return (saved === 'v1' || saved === 'v2') ? saved : 'v2';
  });

  const setVersion = (ver: ErpVersion) => {
    setVersionState(ver);
    localStorage.setItem('gud_erp_version', ver);
  };

  const toggleVersion = () => {
    setVersion(version === 'v1' ? 'v2' : 'v1');
  };

  useEffect(() => {
    localStorage.setItem('gud_erp_version', version);
  }, [version]);

  return (
    <VersionContext.Provider value={{ version, setVersion, toggleVersion }}>
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = (): VersionContextType => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};
