import { Complaints } from "@/components/operations/complaints";
import { getOperationsData } from "@/data/operations";
import { mockStatuses } from "@/data/mockPlanning";
export default async function ComplaintsPage() { const { complaints } = await getOperationsData(); return <Complaints complaints={complaints} statuses={mockStatuses} />; }
