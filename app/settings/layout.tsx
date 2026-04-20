import { Sidebar } from "@/components/shared/sidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
