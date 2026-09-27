import { Dashboard } from "@/components/operations/dashboard";
import { getOperationsData } from "@/data/operations";
export default async function DashboardPage() { return <Dashboard {...await getOperationsData(0, 10)} />; }
