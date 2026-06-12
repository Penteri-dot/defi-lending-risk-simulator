export function RiskExplained() {
  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-0.5">Risk Explained</h2>
        <p className="text-sm text-slate-500">
          A plain-English reference on the credit risk concepts underlying this simulator.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
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

      <Concept title="Scenario Replay vs Hypothetical Shocks">
        <p>
          A hypothetical shock ("BTC −30%") is a single point estimate, and the number is
          chosen by the analyst. Historical scenario replay removes that degree of freedom:
          it uses the price path the market <em>actually</em> took — including the timing,
          the cross-asset correlation, and the partial recoveries. A position can survive
          a clean −30% shock yet still get liquidated mid-path when losses cluster on
          consecutive days. Replaying named events (March 2020, FTX) is also how risk teams
          communicate: "would we have survived FTX week?" is a sharper question than
          "would we survive −25%?".
        </p>
      </Concept>

      <Concept title="Liquidation Probability (Bootstrap Monte Carlo)">
        <p>
          Both shocks and replays are deterministic. The probabilistic question —{" "}
          <em>how likely is liquidation within 30 days?</em> — needs a distribution of
          future paths. This simulator uses a <strong className="text-slate-300">joint
          historical bootstrap</strong>: it resamples whole days of actual returns (all
          assets together, preserving their correlation) and walks the position through
          thousands of simulated paths. No normality assumption, no estimated parameters —
          the data speaks for itself, with the trade-off that the simulation can only
          replay days it has seen. Every estimate ships with its limitations stated:
          daily closes ignore intraday wicks, independent draws ignore volatility
          clustering, and a calm sample window understates tail risk.
        </p>
      </Concept>

      <Concept title="A Stablecoin Depeg Cuts Both Ways">
        <p>
          When USDC traded at $0.91 in March 2023, positions that had <em>borrowed</em>{" "}
          USDC saw their debt shrink and their health factor improve. Positions that had
          posted USDC <em>as collateral</em> were damaged. Whether a depeg helps or hurts
          you depends entirely on which side of the balance sheet the stablecoin sits —
          try both in the Historical Scenarios view. This is the same asset-liability
          thinking that applies to currency mismatches in traditional banking.
        </p>
      </Concept>
      </div>
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
