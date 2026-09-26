import { Dashboard } from "@/components/operations/dashboard";
import { getOperationsData } from "@/data/operations";
import { mockDashboardMetrics, mockStatuses } from "@/data/mockPlanning";
export default async function DashboardPage() { return <Dashboard {...await getOperationsData()} statuses={mockStatuses} metrics={mockDashboardMetrics} />; }
