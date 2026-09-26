import { DecisionTwin } from "@/components/planning/decision-twin";
import { mockPlans, mockQuestions } from "@/data/mockPlanning";
export default function DecisionTwinPage() { return <DecisionTwin plans={mockPlans} suggestions={mockQuestions} />; }
