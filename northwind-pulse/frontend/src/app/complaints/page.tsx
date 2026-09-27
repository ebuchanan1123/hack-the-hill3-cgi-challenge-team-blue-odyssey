import { Complaints } from "@/components/operations/complaints";
import { getOperationsData } from "@/data/operations";
export default async function ComplaintsPage() { const { complaints, statuses, complaintTotal, complaintOffset, complaintLimit } = await getOperationsData(); return <Complaints complaints={complaints} statuses={statuses} total={complaintTotal} offset={complaintOffset} limit={complaintLimit} />; }
