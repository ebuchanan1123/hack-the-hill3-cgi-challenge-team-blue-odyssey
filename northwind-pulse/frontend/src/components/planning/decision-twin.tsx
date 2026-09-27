import { PageHeader } from "@/components/pulse/shared";
import { AskPulse } from "@/components/planning/ask-pulse";
import { InvestmentStrategy } from "@/components/planning/investment-strategy";

export function DecisionTwin() {
  return (
    <>
      <PageHeader title="Decision Twin" />
      <div className="decision-content decision-workspace">
        <InvestmentStrategy />
        <AskPulse />
      </div>
    </>
  );
}
