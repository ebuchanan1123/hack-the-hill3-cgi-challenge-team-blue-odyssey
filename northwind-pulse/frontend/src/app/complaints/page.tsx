import { Complaints } from "@/components/operations/complaints";
import { getOperationsData } from "@/data/operations";
export default async function ComplaintsPage() { const { complaints, statuses } = await getOperationsData(); return <Complaints complaints={complaints} statuses={statuses} />; }
