import { AppShell } from "@/components/shared/app-shell";
import { CustomizationProvider } from "@/components/customization/customization-context";
import { getBusinessConfig } from "@/lib/config-cache";
import type { BusinessConfig } from "@/components/customization/customization-context";

const DEFAULT_CONFIG: BusinessConfig = {
  id: "singleton",
  businessName: "GWIN Management",
  primaryColor: "#761f7f",
  iconUrl: null,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dbConfig = await getBusinessConfig();
  const config: BusinessConfig = dbConfig
    ? {
        id: dbConfig.id,
        businessName: dbConfig.businessName,
        primaryColor: dbConfig.primaryColor,
        iconUrl: dbConfig.iconUrl ?? null,
      }
    : DEFAULT_CONFIG;

  return (
    <CustomizationProvider initialConfig={config}>
      <AppShell>{children}</AppShell>
    </CustomizationProvider>
  );
}
