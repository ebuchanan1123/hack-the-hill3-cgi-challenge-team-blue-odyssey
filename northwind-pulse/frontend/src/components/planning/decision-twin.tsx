import { PageHeader } from "@/components/pulse/shared";
import { InvestmentStrategy } from "@/components/planning/investment-strategy";

export function DecisionTwin() {
  return (
    <>
      <PageHeader title="Decision Twin" />
      <div className="decision-content decision-workspace">
        <InvestmentStrategy />
      </div>
    </>
  );
}
