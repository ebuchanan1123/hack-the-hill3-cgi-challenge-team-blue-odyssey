/** Northwind's resolution targets by priority. An operational service target, not a prediction. */
export const resolutionTargetDays: Record<string, number> = { P1: 5, P2: 10, P3: 20 };

export type DeadlineState = "Overdue" | "Due soon" | "On track";
export const deadlineOrder: DeadlineState[] = ["Overdue", "Due soon", "On track"];
const dueSoonWithinDays = 2;

export interface Deadline { state: DeadlineState; daysRemaining: number; label: string; sentence: string }

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

export function getDeadline({ priority, daysOpen }: { priority: string; daysOpen: number }): Deadline | null {
  const target = resolutionTargetDays[priority];
  if (target === undefined) return null;
  const daysRemaining = target - daysOpen;
  if (daysRemaining < 0) return { state: "Overdue", daysRemaining, label: `${days(-daysRemaining)} overdue`, sentence: `This complaint is already ${days(-daysRemaining)} overdue.` };
  const label = daysRemaining === 0 ? "Due today" : daysRemaining === 1 ? "Due tomorrow" : `Due in ${days(daysRemaining)}`;
  if (daysRemaining <= dueSoonWithinDays) return { state: "Due soon", daysRemaining, label, sentence: `This complaint is ${label.toLowerCase()}.` };
  return { state: "On track", daysRemaining, label, sentence: `This complaint is still within its resolution target (${label.toLowerCase()}).` };
}
