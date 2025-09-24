import { readCache } from "@/lib/kv";
import { MainDashboardTabs } from "@/components/MainDashboardTabs";

export default async function Home() {
  // Always fetch fresh data from blob, not from in-memory cache
  const data = await readCache();
  const allAircraft = data?.aircraft || [];
  
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Maintenance Dashboard</h1>
      <MainDashboardTabs aircraft={allAircraft} />
    </main>
  );
}
