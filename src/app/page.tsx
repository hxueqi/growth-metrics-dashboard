import { Dashboard } from "@/components/Dashboard";
import { SWRConfig } from "swr";

export default function Home() {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
      }}
    >
      <Dashboard />
    </SWRConfig>
  );
}
