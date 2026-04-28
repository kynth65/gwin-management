"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { applyColorTheme, applyFavicon } from "@/lib/color-utils";

export type BusinessConfig = {
  id: string;
  businessName: string;
  primaryColor: string;
  iconUrl: string | null;
};

type CustomizationContextType = {
  config: BusinessConfig;
  updateConfig: (partial: Partial<BusinessConfig>) => void;
};

const CustomizationContext = createContext<CustomizationContextType | null>(null);

export function useCustomization() {
  const ctx = useContext(CustomizationContext);
  if (!ctx) throw new Error("useCustomization must be used within CustomizationProvider");
  return ctx;
}

interface CustomizationProviderProps {
  initialConfig: BusinessConfig;
  children: React.ReactNode;
}

export function CustomizationProvider({ initialConfig, children }: CustomizationProviderProps) {
  const [config, setConfig] = useState<BusinessConfig>(initialConfig);

  useEffect(() => {
    applyColorTheme(config.primaryColor);
    applyFavicon(config.iconUrl);
    if (config.businessName) {
      document.title = config.businessName;
    }
  }, [config.primaryColor, config.iconUrl, config.businessName]);

  function updateConfig(partial: Partial<BusinessConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  return (
    <CustomizationContext.Provider value={{ config, updateConfig }}>
      {children}
    </CustomizationContext.Provider>
  );
}
