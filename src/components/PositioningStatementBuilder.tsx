import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Save,
} from 'lucide-react';
import {
  formatPositioningStatement,
  isPositioningComponentsComplete,
} from '../data/ventures';
import {
  CompetitorAlternative,
  MarketBattlefieldState,
  PositioningStatementState,
  Venture,
} from '../types/venture';

interface PositioningStatementBuilderProps {
  venture: Venture;
  completedAlternatives: CompetitorAlternative[];
  battlefieldState: MarketBattlefieldState;
  state: PositioningStatementState;
  onChangeState: (next: PositioningStatementState) => void;
}

type CheckRating = 'Strong' | 'Needs Improvement' | 'Weak';

interface DimensionEvaluation {
  dimension: string;
  rating: CheckRating;
  explanation: string;
  needsEvidenceFlag?: boolean;
}

const STOPWORDS = new Set([
  'with', 'that', 'this', 'from', 'they', 'them', 'their', 'have', 'will',
  'your', 'more', 'most', 'very', 'only', 'into', 'than', 'then', 'when',
  'where', 'what', 'which', 'because', 'unlike', 'provides', 'through',
  'using', 'based', 'offer', 'offers', 'solution', 'service', 'product',
  'customers', 'users', 'students', 'people', 'better', 'good', 'high',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

const UNVERIFIED_CLAIM_WORDS = [
  'guaranteed',
  'guarantee',
  '100%',
  'proven',
  'cheapest',
  'fastest',
  'exclusively',
  'exclusive',
  'patent',
  'patented',
  'certified',
  'number one',
  '#1',
  'always',
  'never fails',
];

export function PositioningStatementBuilder({
  venture,
  completedAlternatives,
  battlefieldState,
  state,
  onChangeState,
}: PositioningStatementBuilderProps) {
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const selectedAlternative = useMemo(
    () => completedAlternatives.find((a) => a.id === state.mainAlternativeId) ?? null,
    [completedAlternatives, state.mainAlternativeId]
  );

  const isComplete = isPositioningComponentsComplete(state, completedAlternatives);

  const updateComponent = (
    patch: Partial<
      Pick<
        PositioningStatementState,
        | 'targetCustomer'
        | 'category'
        | 'primaryBenefit'
        | 'mainAlternativeId'
        | 'reasonToBelieve'
      >
    >
  ) => {
    const nextTargetCustomer = patch.targetCustomer ?? state.targetCustomer;
    const nextCategory = patch.category ?? state.category;
    const nextPrimaryBenefit = patch.primaryBenefit ?? state.primaryBenefit;
    const nextMainAlternativeId = patch.mainAlternativeId ?? state.mainAlternativeId;
    const nextReasonToBelieve = patch.reasonToBelieve ?? state.reasonToBelieve;

    const altObj = completedAlternatives.find((a) => a.id === nextMainAlternativeId);
    const nextStatementText = formatPositioningStatement(
      venture.name,
      nextTargetCustomer,
      nextCategory,
      nextPrimaryBenefit,
      altObj?.name ?? '',
      nextReasonToBelieve
    );

    setSaveFeedback(null);
    onChangeState({
      ...state,
      targetCustomer: nextTargetCustomer,
      category: nextCategory,
      primaryBenefit: nextPrimaryBenefit,
      mainAlternativeId: nextMainAlternativeId,
      reasonToBelieve: nextReasonToBelieve,
      statementText: nextStatementText,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleManualStatementEdit = (text: string) => {
    setSaveFeedback(null);
    onChangeState({
      ...state,
      statementText: text,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRegenerateStatement = () => {
    const regenerated = formatPositioningStatement(
      venture.name,
      state.targetCustomer,
      state.category,
      state.primaryBenefit,
      selectedAlternative?.name ?? '',
      state.reasonToBelieve
    );
    setSaveFeedback(null);
    onChangeState({
      ...state,
      statementText: regenerated,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveStatement = () => {
    if (!isComplete) {
      setSaveFeedback(
        'Complete all five components (including selecting a Main Alternative from your Competitor Matrix) before saving.'
      );
      return;
    }
    const now = new Date().toISOString();
    onChangeState({
      ...state,
      savedStatement: state.statementText.trim(),
      savedAt: now,
      updatedAt: now,
    });
    setSaveFeedback('Positioning statement saved. AI Strategy Challenge is now unlocked.');
  };

  // STEP 3: Deterministic 5-Dimension Positioning Evaluation
  const evaluations = useMemo<DimensionEvaluation[]>(() => {
    const tc = state.targetCustomer.trim();
    const ben = state.primaryBenefit.trim();
    const rtb = state.reasonToBelieve.trim();

    // 1. Target Customer Clarity
    let tcEval: DimensionEvaluation;
    const vagueCustomerTerms = ['everyone', 'anyone', 'all people', 'all users', 'general public'];
    if (!tc || tc.length < 6 || vagueCustomerTerms.some((v) => tc.toLowerCase() === v)) {
      tcEval = {
        dimension: 'Target Customer Clarity',
        rating: 'Weak',
        explanation: `Specify a concrete customer group rather than a broad label (Venture Profile lists "${venture.targetCustomer}" in ${venture.geography}).`,
      };
    } else if (
      tc.length < 22 &&
      !tc.toLowerCase().includes(venture.geography.toLowerCase().split('/')[0].trim())
    ) {
      tcEval = {
        dimension: 'Target Customer Clarity',
        rating: 'Needs Improvement',
        explanation: `Identifies "${tc}", but could be sharper by including geography (${venture.geography}) or the specific situation when the problem occurs.`,
      };
    } else {
      tcEval = {
        dimension: 'Target Customer Clarity',
        rating: 'Strong',
        explanation: `Clearly defines who the venture serves and aligns with your Venture Profile segment.`,
      };
    }

    // 2. Primary Benefit Clarity
    let benEval: DimensionEvaluation;
    const problemKeywords = extractKeywords(`${venture.problem} ${venture.offer}`);
    const benKeywords = extractKeywords(ben);
    const problemOverlap = benKeywords.filter((k) => problemKeywords.includes(k)).length;

    if (!ben || ben.length < 10) {
      benEval = {
        dimension: 'Primary Benefit Clarity',
        rating: 'Weak',
        explanation: `State a specific customer outcome that directly addresses "${venture.problem}".`,
      };
    } else if (ben.length < 24 || problemOverlap === 0) {
      benEval = {
        dimension: 'Primary Benefit Clarity',
        rating: 'Needs Improvement',
        explanation: `Make the benefit more concrete and tie it explicitly to solving "${venture.problem}" through "${venture.offer}".`,
      };
    } else {
      benEval = {
        dimension: 'Primary Benefit Clarity',
        rating: 'Strong',
        explanation: `States a clear outcome connected directly to your venture's core problem and offer.`,
      };
    }

    // 3. Differentiation
    let diffEval: DimensionEvaluation;
    const vScore = battlefieldState.ventureScore;
    const altScore = selectedAlternative
      ? battlefieldState.alternativeScores[selectedAlternative.id]
      : undefined;
    const mapDist =
      vScore.x !== null &&
      vScore.y !== null &&
      altScore &&
      altScore.x !== null &&
      altScore.y !== null
        ? Math.hypot(vScore.x - altScore.x, vScore.y - altScore.y)
        : null;

    if (!selectedAlternative || !ben || !rtb) {
      diffEval = {
        dimension: 'Differentiation',
        rating: 'Weak',
        explanation:
          'Select one Main Alternative from your Competitor Matrix and explain both the Primary Benefit and Reason to Believe that set you apart.',
      };
    } else if (mapDist !== null && mapDist < 2.0) {
      diffEval = {
        dimension: 'Differentiation',
        rating: 'Needs Improvement',
        explanation: `Your venture is only ${mapDist.toFixed(1)} units away from ${selectedAlternative.name} on the Positioning Map. Sharpen how you address their weakness ("${selectedAlternative.mainWeakness}").`,
      };
    } else {
      const weaknessWords = extractKeywords(selectedAlternative.mainWeakness);
      const contrastWords = extractKeywords(`${ben} ${rtb}`);
      const addressesWeakness = contrastWords.some((w) => weaknessWords.includes(w));

      if (!addressesWeakness) {
        diffEval = {
          dimension: 'Differentiation',
          rating: 'Needs Improvement',
          explanation: `You selected ${selectedAlternative.name}, whose documented weakness is "${selectedAlternative.mainWeakness}". Connect your benefit or differentiator more directly to that gap.`,
        };
      } else {
        diffEval = {
          dimension: 'Differentiation',
          rating: 'Strong',
          explanation: `Clearly contrasts against ${selectedAlternative.name} and addresses its documented weakness with separation on your Positioning Map.`,
        };
      }
    }

    // 4. Evidence / Reason to Believe (IMPORTANT EVIDENCE RULE)
    let rtbEval: DimensionEvaluation;
    const appFactsText = [
      venture.offer,
      venture.problem,
      ...completedAlternatives.map(
        (a) => `${a.mainOffer} ${a.mainStrength} ${a.mainWeakness} ${a.evidenceSource}`
      ),
    ].join(' ');
    const appFactKeywords = new Set(extractKeywords(appFactsText));
    const rtbKeywords = extractKeywords(rtb);
    const groundedKeywords = rtbKeywords.filter((w) => appFactKeywords.has(w));
    const rtbLower = rtb.toLowerCase();
    const hasUnverifiedClaim = UNVERIFIED_CLAIM_WORDS.some(
      (word) => rtbLower.includes(word) && !appFactsText.toLowerCase().includes(word)
    );
    const altEvidenceQuality = selectedAlternative?.evidenceQuality ?? '';

    if (!rtb) {
      rtbEval = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Weak',
        needsEvidenceFlag: true,
        explanation: `NEEDS EVIDENCE — Enter a Reason to Believe grounded in your venture offer ("${venture.offer}") and researched competitor evidence.`,
      };
    } else if (hasUnverifiedClaim || groundedKeywords.length === 0) {
      rtbEval = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Weak',
        needsEvidenceFlag: true,
        explanation: `NEEDS EVIDENCE — This claim is currently an assumption because it introduces assertions not supported by your Venture Profile ("${venture.offer}") or your Competitor Matrix entries.`,
      };
    } else if (altEvidenceQuality === 'Weak' || !selectedAlternative) {
      rtbEval = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Needs Improvement',
        needsEvidenceFlag: true,
        explanation: `NEEDS EVIDENCE — Your Reason to Believe connects to "${venture.offer}", but your research evidence for ${selectedAlternative?.name ?? 'the selected alternative'} is marked Weak. Treat part of this claim as an assumption until stronger evidence is added.`,
      };
    } else if (rtb.length < 20 || groundedKeywords.length < 2 || altEvidenceQuality === 'Moderate') {
      rtbEval = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Needs Improvement',
        needsEvidenceFlag: altEvidenceQuality === 'Moderate',
        explanation:
          altEvidenceQuality === 'Moderate'
            ? `Partially grounded in "${venture.offer}", but supporting evidence for ${selectedAlternative?.name} is Moderate (indirect or incomplete). Add stronger direct proof or treat unverified details as assumptions.`
            : `Expand your Reason to Believe with specific capabilities from "${venture.offer}" rather than general statements.`,
      };
    } else {
      rtbEval = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Strong',
        needsEvidenceFlag: false,
        explanation: `Grounded in your documented venture offer ("${venture.offer}") and supported by Strong competitor research evidence.`,
      };
    }

    // 5. Consistency with the Positioning Map
    let mapEval: DimensionEvaluation;
    const { axes } = battlefieldState;
    if (
      !selectedAlternative ||
      vScore.x === null ||
      vScore.y === null ||
      !altScore ||
      altScore.x === null ||
      altScore.y === null
    ) {
      mapEval = {
        dimension: 'Consistency with the Positioning Map',
        rating: 'Needs Improvement',
        explanation:
          'Select a Main Alternative from your Competitor Matrix to verify alignment with your Market Battlefield scores.',
      };
    } else {
      const leadsX = vScore.x > altScore.x;
      const leadsY = vScore.y > altScore.y;
      const leadsBoth = leadsX && leadsY;
      const trailsOrTiesBoth = vScore.x <= altScore.x && vScore.y <= altScore.y;

      const axisWords = extractKeywords(
        `${axes.xName} ${axes.xLeftLabel} ${axes.xRightLabel} ${axes.yName} ${axes.yBottomLabel} ${axes.yTopLabel}`
      );
      const statementWords = extractKeywords(`${state.category} ${ben} ${rtb}`);
      const reflectsAxes = statementWords.some((w) => axisWords.includes(w));

      if (trailsOrTiesBoth) {
        mapEval = {
          dimension: 'Consistency with the Positioning Map',
          rating: 'Weak',
          explanation: `Inconsistent with Market Battlefield: ${venture.name} (${vScore.x}, ${vScore.y}) does not score higher than ${selectedAlternative.name} (${altScore.x}, ${altScore.y}) on either ${axes.xName} or ${axes.yName}.`,
        };
      } else if (!reflectsAxes || (!leadsBoth && mapDist !== null && mapDist < 1.5)) {
        const leadingAxes: string[] = [];
        if (leadsX) leadingAxes.push(`${axes.xName} (${vScore.x} vs ${altScore.x})`);
        if (leadsY) leadingAxes.push(`${axes.yName} (${vScore.y} vs ${altScore.y})`);
        mapEval = {
          dimension: 'Consistency with the Positioning Map',
          rating: 'Needs Improvement',
          explanation: `Your map shows ${venture.name} leads ${selectedAlternative.name} on ${leadingAxes.join(' and ')}. Mention that advantage explicitly in your Primary Benefit or Reason to Believe.`,
        };
      } else {
        mapEval = {
          dimension: 'Consistency with the Positioning Map',
          rating: 'Strong',
          explanation: `Consistent with your Positioning Map scores on ${axes.xName} and ${axes.yName} relative to ${selectedAlternative.name}.`,
        };
      }
    }

    return [tcEval, benEval, diffEval, rtbEval, mapEval];
  }, [venture, completedAlternatives, battlefieldState, state, selectedAlternative]);

  const needsEvidenceBanner = evaluations.some((e) => e.needsEvidenceFlag);

  const hasUnsavedChanges =
    state.savedStatement !== null && state.savedStatement !== state.statementText.trim();

  return (
    <div className="space-y-6">
      {/* Purpose Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            Positioning Statement
          </h2>
          {state.savedStatement ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500">Draft</span>
          )}
        </div>

        <p className="text-sm text-slate-800 font-medium">
          “A positioning statement defines how the venture should be understood by its target
          customer relative to competing alternatives.”
        </p>

        <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono">
          For [Target Customer], our venture is a [Category / Type of Solution] that provides
          [Primary Benefit], unlike [Main Alternative], because [Reason to Believe].
        </div>
      </section>

      {/* STEP 1 — BUILD THE STATEMENT */}
      <section
        aria-labelledby="ps-step1-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="text-xs font-medium text-blue-700">Step 1</div>
          <h3 id="ps-step1-heading" className="text-base font-semibold text-slate-900">
            Build the Statement from Your Research
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Only existing facts from your Venture Profile and Competitor Matrix are pre-filled or
            selectable.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Target Customer */}
            <div>
              <label
                htmlFor="ps-target-customer"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                1. TARGET CUSTOMER
              </label>
              <input
                id="ps-target-customer"
                type="text"
                value={state.targetCustomer}
                onChange={(e) => updateComponent({ targetCustomer: e.target.value })}
                placeholder="Enter target customer"
                className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Venture Profile: {venture.targetCustomer} · {venture.geography}
              </p>
            </div>

            {/* 2. Category / Type of Solution */}
            <div>
              <label
                htmlFor="ps-category"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                2. CATEGORY / TYPE OF SOLUTION
              </label>
              <input
                id="ps-category"
                type="text"
                value={state.category}
                onChange={(e) => updateComponent({ category: e.target.value })}
                placeholder="Describe what kind of solution the venture is"
                className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Venture Offer reference: {venture.offer}
              </p>
            </div>

            {/* 3. Primary Benefit */}
            <div>
              <label
                htmlFor="ps-primary-benefit"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                3. PRIMARY BENEFIT
              </label>
              <textarea
                id="ps-primary-benefit"
                rows={3}
                value={state.primaryBenefit}
                onChange={(e) => updateComponent({ primaryBenefit: e.target.value })}
                placeholder="State the most important customer benefit"
                className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Problem addressed: {venture.problem}
              </p>
            </div>

            {/* 4. Main Alternative */}
            <div>
              <label
                htmlFor="ps-main-alternative"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                4. MAIN ALTERNATIVE
              </label>
              <select
                id="ps-main-alternative"
                value={state.mainAlternativeId}
                onChange={(e) => updateComponent({ mainAlternativeId: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="">Select one alternative from Competitor Matrix</option>
                {completedAlternatives.map((alt) => (
                  <option key={alt.id} value={alt.id}>
                    {alt.name} ({alt.type})
                  </option>
                ))}
              </select>

              {selectedAlternative ? (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-0.5">
                  <div>
                    <span className="font-semibold text-slate-800">Weakness:</span>{' '}
                    {selectedAlternative.mainWeakness}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Evidence Quality:</span>{' '}
                    {selectedAlternative.evidenceQuality}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
                  Choose strictly from the {completedAlternatives.length} alternatives in your
                  Competitor Matrix.
                </p>
              )}
            </div>

            {/* 5. Reason to Believe */}
            <div className="md:col-span-2">
              <label
                htmlFor="ps-reason-to-believe"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                5. REASON TO BELIEVE
              </label>
              <textarea
                id="ps-reason-to-believe"
                rows={3}
                value={state.reasonToBelieve}
                onChange={(e) => updateComponent({ reasonToBelieve: e.target.value })}
                placeholder="Explain why customers should believe the claimed benefit based on actual venture features, evidence, or capabilities"
                className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Must rely on documented offer/capabilities ({venture.offer}) and verified
                competitor research—never unsubstantiated claims.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 2 & STEP 4 — GENERATED POSITIONING STATEMENT CARD (EDITABLE + SAVE) */}
      <section
        aria-labelledby="ps-step2-heading"
        className="bg-blue-50/50 border-2 border-blue-600/50 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 bg-white/80 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-blue-700">Step 2 &amp; Step 4</div>
            <h3 id="ps-step2-heading" className="text-base font-semibold text-slate-900">
              Your Positioning Statement
            </h3>
          </div>

          <button
            type="button"
            onClick={handleRegenerateStatement}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sync from 5 Fields</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="ps-final-statement"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Editable Complete Positioning Statement (updates automatically when you revise any
              of the 5 components above)
            </label>
            <textarea
              id="ps-final-statement"
              rows={3}
              value={state.statementText}
              onChange={(e) => handleManualStatementEdit(e.target.value)}
              className="w-full px-4 py-3 text-sm sm:text-base font-medium text-slate-900 bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 leading-relaxed resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-600">
              {saveFeedback ? (
                <span className="font-medium text-blue-800">{saveFeedback}</span>
              ) : state.savedStatement ? (
                <span>
                  {hasUnsavedChanges
                    ? 'You have revised your draft — click Save Positioning Statement to update.'
                    : `Saved in browser (${new Date(state.savedAt ?? '').toLocaleString()}).`}
                </span>
              ) : (
                <span>Complete all five fields and save to unlock AI Strategy Challenge.</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveStatement}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto ${
                isComplete
                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Positioning Statement</span>
            </button>
          </div>
        </div>
      </section>

      {/* STEP 3 — CHECK THE POSITIONING */}
      <section
        aria-labelledby="ps-step3-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-blue-700">Step 3</div>
            <h3 id="ps-step3-heading" className="text-base font-semibold text-slate-900">
              Check the Positioning
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Diagnostic check against your Venture Profile, Competitor Matrix, and Positioning
              Map. Revise any of the five components above to strengthen weak areas.
            </p>
          </div>

          {needsEvidenceBanner && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 whitespace-nowrap shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>NEEDS EVIDENCE</span>
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-200">
          {evaluations.map((item) => {
            const ratingColor =
              item.rating === 'Strong'
                ? 'text-emerald-700'
                : item.rating === 'Needs Improvement'
                  ? 'text-amber-700'
                  : 'text-red-700';

            return (
              <div
                key={item.dimension}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.dimension}
                    </span>
                    {item.needsEvidenceFlag && (
                      <span className="text-xs font-bold text-amber-800">
                        · NEEDS EVIDENCE
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                <span
                  className={`text-xs font-semibold whitespace-nowrap shrink-0 sm:pt-0.5 ${ratingColor}`}
                >
                  {item.rating}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
