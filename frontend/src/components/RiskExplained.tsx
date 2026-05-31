export function RiskExplained() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-0.5">Risk Explained</h2>
        <p className="text-sm text-slate-500">
          A plain-English reference on the credit risk concepts underlying this simulator.
        </p>
      </div>

      <Concept title="Loan-to-Value (LTV)">
        <p>
          LTV is the ratio of outstanding debt to the market value of collateral:{" "}
          <Code>LTV = total borrowed / total collateral value</Code>. Each asset
          has a maximum LTV cap — the protocol will not allow new borrows that push the
          ratio above this ceiling. A higher LTV means more leverage and less room for
          collateral prices to fall before the position becomes impaired. Traditional lenders
          apply similar haircuts when accepting securities or real estate as collateral.
        </p>
      </Concept>

      <Concept title="Health Factor">
        <p>
          The health factor is the primary solvency indicator. It measures how well
          the weighted collateral value covers the outstanding debt, using each asset's
          liquidation threshold rather than its borrow cap:{" "}
          <Code>HF = Σ(amount × price × liq_threshold) / total_borrowed</Code>.
        </p>
        <p className="mt-2">
          A value above 1.0 means the position is solvent. When the health factor falls
          below 1.0, the collateral can no longer fully cover the debt at liquidation
          prices, and the position becomes eligible for liquidation. The further above 1.0,
          the larger the buffer against adverse price moves.
        </p>
      </Concept>

      <Concept title="Liquidation Threshold vs Max LTV">
        <p>
          These two parameters serve different purposes. The{" "}
          <strong className="text-slate-300">maximum LTV</strong> governs how much a borrower
          can draw down at origination — it is a conservative entry limit. The{" "}
          <strong className="text-slate-300">liquidation threshold</strong> is set higher: it
          is the point at which an existing position triggers forced liquidation. The gap
          between them acts as a buffer zone, giving borrowers time to react to falling
          collateral prices before liquidators intervene. In traditional finance, this gap is
          analogous to the difference between an initial margin requirement and a maintenance
          margin requirement.
        </p>
      </Concept>

      <Concept title="Why Stress Testing Matters">
        <p>
          Point-in-time risk metrics tell you whether a position is solvent <em>today</em>.
          Stress testing asks: what happens if collateral prices fall sharply? In credit risk
          management, this is standard practice — regulators require banks to demonstrate
          solvency under severe but plausible scenarios (e.g. a 30–40% drawdown in major
          asset classes).
        </p>
        <p className="mt-2">
          For DeFi lending, the same logic applies: crypto collateral is volatile, and a
          portfolio that looks safe at a health factor of 1.2 may become liquidatable in a
          single trading session. A meaningful safety margin — often expressed as a health
          factor comfortably above 2.0 — provides the collateral buffer needed to withstand
          downside scenarios without triggering forced liquidation.
        </p>
      </Concept>
    </div>
  );
}

function Concept({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{title}</h3>
      <div className="text-sm text-slate-400 leading-relaxed">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-slate-300 bg-slate-900/60 px-1 py-0.5 rounded text-xs">
      {children}
    </code>
  );
}
