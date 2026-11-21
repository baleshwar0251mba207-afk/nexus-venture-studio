import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { areAxesDefined, isBattlefieldComplete } from '../data/ventures';
import {
  CompetitorAlternative,
  MarketBattlefieldState,
  PositioningAxes,
  Venture,
} from '../types/venture';

interface MarketBattlefieldProps {
  venture: Venture;
  completedAlternatives: CompetitorAlternative[];
  incompleteCount: number;
  state: MarketBattlefieldState;
  onChangeState: (next: MarketBattlefieldState) => void;
}

interface PlottedPoint {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  isVenture: boolean;
}

const AXIS_EXAMPLES = [
  'Price / Cost: Low Price → High Price',
  'Customization / Personalization: Low Customization → High Customization',
  'Convenience: Low Convenience → High Convenience',
  'Specialization: Generic → Specialized',
  'Service Level: Basic Service → High Service',
  'Technology: Low Technology → High Technology',
];

const SCORE_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function MarketBattlefield({
  venture,
  completedAlternatives,
  incompleteCount,
  state,
  onChangeState,
}: MarketBattlefieldProps) {
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  const { axes, ventureScore, alternativeScores } = state;
  const axesReady = areAxesDefined(axes);
  const mapComplete = isBattlefieldComplete(state, completedAlternatives);

  const updateAxes = (patch: Partial<PositioningAxes>) => {
    onChangeState({
      ...state,
      axes: { ...axes, ...patch },
      updatedAt: new Date().toISOString(),
    });
  };

  const setVentureAxisScore = (axis: 'x' | 'y', value: number | null) => {
    onChangeState({
      ...state,
      ventureScore: {
        ...ventureScore,
        [axis]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const setAlternativeAxisScore = (altId: string, axis: 'x' | 'y', value: number | null) => {
    const current = alternativeScores[altId] ?? { x: null, y: null };
    onChangeState({
      ...state,
      alternativeScores: {
        ...alternativeScores,
        [altId]: {
          ...current,
          [axis]: value,
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleResetAxes = () => {
    onChangeState({
      axes: {
        xName: '',
        xLeftLabel: '',
        xRightLabel: '',
        yName: '',
        yBottomLabel: '',
        yTopLabel: '',
      },
      ventureScore: { x: null, y: null },
      alternativeScores: {},
      updatedAt: new Date().toISOString(),
    });
  };

  const plottedPoints = useMemo<PlottedPoint[]>(() => {
    if (!axesReady) return [];
    const pts: PlottedPoint[] = [];

    completedAlternatives.forEach((alt) => {
      const s = alternativeScores[alt.id];
      if (s && s.x !== null && s.y !== null) {
        pts.push({
          id: alt.id,
          name: alt.name,
          type: alt.type || 'Alternative',
          x: s.x,
          y: s.y,
          isVenture: false,
        });
      }
    });

    if (ventureScore.x !== null && ventureScore.y !== null) {
      pts.push({
        id: venture.id,
        name: venture.name,
        type: 'Selected Venture',
        x: ventureScore.x,
        y: ventureScore.y,
        isVenture: true,
      });
    }

    return pts;
  }, [axesReady, completedAlternatives, alternativeScores, ventureScore, venture.id, venture.name]);

  const hoveredPoint = useMemo(
    () => plottedPoints.find((p) => p.id === hoveredPointId) ?? null,
    [plottedPoints, hoveredPointId]
  );

  // Step 4: Interpret the Map (strictly derived from user scores)
  const interpretation = useMemo(() => {
    if (!mapComplete) return null;

    const vPt = plottedPoints.find((p) => p.isVenture);
    const altPts = plottedPoints.filter((p) => !p.isVenture);
    if (!vPt || altPts.length === 0) return null;

    // 1. Closest alternative(s)
    const withDist = altPts
      .map((alt) => ({
        alt,
        dist: distanceBetween(vPt, alt),
      }))
      .sort((a, b) => a.dist - b.dist);

    const minDist = withDist[0].dist;
    const closestList = withDist.filter((item) => Math.abs(item.dist - minDist) < 0.01);

    // 2. Clustered competitors (within Euclidean distance <= 2.5)
    const clusterSet = new Set<string>();
    const clusterPairs: string[] = [];
    for (let i = 0; i < altPts.length; i++) {
      for (let j = i + 1; j < altPts.length; j++) {
        const d = distanceBetween(altPts[i], altPts[j]);
        if (d <= 2.5) {
          clusterSet.add(altPts[i].name);
          clusterSet.add(altPts[j].name);
          clusterPairs.push(`${altPts[i].name} & ${altPts[j].name}`);
        }
      }
    }

    // 3. Differentiation check
    let differentiationSummary = '';
    if (minDist >= 3.0) {
      differentiationSummary = `Appears differentiated on ${axes.xName} and ${axes.yName} (${minDist.toFixed(1)} units from the nearest alternative).`;
    } else if (minDist >= 1.5) {
      differentiationSummary = `Moderately separated (${minDist.toFixed(1)} units from the nearest alternative).`;
    } else {
      differentiationSummary = `Closely overlaps with ${closestList.map((c) => c.alt.name).join(', ')} (${minDist.toFixed(1)} units apart).`;
    }

    // 4. Less-crowded quadrants (counting alternatives per quadrant)
    const quadrants = [
      {
        label: `High ${axes.yName} (${axes.yTopLabel}) & High ${axes.xName} (${axes.xRightLabel})`,
        count: altPts.filter((p) => p.x >= 5.5 && p.y >= 5.5).length,
      },
      {
        label: `High ${axes.yName} (${axes.yTopLabel}) & Low ${axes.xName} (${axes.xLeftLabel})`,
        count: altPts.filter((p) => p.x < 5.5 && p.y >= 5.5).length,
      },
      {
        label: `Low ${axes.yName} (${axes.yBottomLabel}) & High ${axes.xName} (${axes.xRightLabel})`,
        count: altPts.filter((p) => p.x >= 5.5 && p.y < 5.5).length,
      },
      {
        label: `Low ${axes.yName} (${axes.yBottomLabel}) & Low ${axes.xName} (${axes.xLeftLabel})`,
        count: altPts.filter((p) => p.x < 5.5 && p.y < 5.5).length,
      },
    ];

    const minQuadCount = Math.min(...quadrants.map((q) => q.count));
    const leastCrowded = quadrants.filter((q) => q.count === minQuadCount);

    return {
      closestList,
      minDist,
      clusterNames: Array.from(clusterSet),
      clusterPairs,
      differentiationSummary,
      leastCrowded,
      minQuadCount,
    };
  }, [mapComplete, plottedPoints, axes]);

  // SVG layout bounds
  const svgW = 680;
  const svgH = 440;
  const padLeft = 86;
  const padRight = 36;
  const padTop = 36;
  const padBottom = 64;
  const plotW = svgW - padLeft - padRight;
  const plotH = svgH - padTop - padBottom;

  const toSvgX = (score: number) => padLeft + ((score - 1) / 9) * plotW;
  const toSvgY = (score: number) => padTop + plotH - ((score - 1) / 9) * plotH;

  return (
    <div className="space-y-6">
      {/* Purpose Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            Market Battlefield — Positioning Map
          </h2>
          {mapComplete ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Map Complete</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500">
              In progress
            </span>
          )}
        </div>
        <p className="text-sm text-slate-800 font-medium">
          “A positioning map compares how customers may perceive competing alternatives on two
          dimensions that matter to the customer.”
        </p>
        <p className="text-xs text-slate-600">
          Objective: Decide how <strong className="font-semibold text-slate-900">{venture.name}</strong> is
          positioned relative to the {completedAlternatives.length} completed alternatives from your
          Competition Lab.
        </p>
        {incompleteCount > 0 && (
          <p className="text-xs text-amber-700 pt-1">
            Note: {incompleteCount} alternative slot{incompleteCount > 1 ? 's' : ''} in
            Competition Lab {incompleteCount > 1 ? 'are' : 'is'} still incomplete and excluded
            from scoring until completed.
          </p>
        )}
      </section>

      {/* STEP 1 — CHOOSE THE POSITIONING AXES */}
      <section
        aria-labelledby="step1-axes-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-blue-700">Step 1</div>
            <h3 id="step1-axes-heading" className="text-base font-semibold text-slate-900">
              Choose the Positioning Axes
            </h3>
          </div>

          <button
            type="button"
            onClick={handleResetAxes}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Axes &amp; Scores</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>
              Good positioning axes should matter to customers and meaningfully differentiate
              alternatives.
            </span>
          </div>

          {/* User Input Grid for X and Y Axes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* X-Axis */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/40">
              <div className="text-xs font-semibold text-slate-900">
                Horizontal Axis (X-Axis)
              </div>
              <div>
                <label
                  htmlFor="mb-x-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  X-axis dimension name
                </label>
                <input
                  id="mb-x-name"
                  type="text"
                  value={axes.xName}
                  onChange={(e) => updateAxes({ xName: e.target.value })}
                  placeholder="Enter dimension name"
                  className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="mb-x-left"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Left-side label (1)
                  </label>
                  <input
                    id="mb-x-left"
                    type="text"
                    value={axes.xLeftLabel}
                    onChange={(e) => updateAxes({ xLeftLabel: e.target.value })}
                    placeholder="Enter low-end anchor"
                    className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mb-x-right"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Right-side label (10)
                  </label>
                  <input
                    id="mb-x-right"
                    type="text"
                    value={axes.xRightLabel}
                    onChange={(e) => updateAxes({ xRightLabel: e.target.value })}
                    placeholder="Enter high-end anchor"
                    className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Y-Axis */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/40">
              <div className="text-xs font-semibold text-slate-900">
                Vertical Axis (Y-Axis)
              </div>
              <div>
                <label
                  htmlFor="mb-y-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Y-axis dimension name
                </label>
                <input
                  id="mb-y-name"
                  type="text"
                  value={axes.yName}
                  onChange={(e) => updateAxes({ yName: e.target.value })}
                  placeholder="Enter dimension name"
                  className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="mb-y-bottom"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Bottom label (1)
                  </label>
                  <input
                    id="mb-y-bottom"
                    type="text"
                    value={axes.yBottomLabel}
                    onChange={(e) => updateAxes({ yBottomLabel: e.target.value })}
                    placeholder="Enter low-end anchor"
                    className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mb-y-top"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Top label (10)
                  </label>
                  <input
                    id="mb-y-top"
                    type="text"
                    value={axes.yTopLabel}
                    onChange={(e) => updateAxes({ yTopLabel: e.target.value })}
                    placeholder="Enter high-end anchor"
                    className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Reference Examples & Illustration */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-200">
            <div className="lg:col-span-6 space-y-2">
              <h4 className="text-xs font-semibold text-slate-800">
                Example Dimensions for Inspiration
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
                {AXIS_EXAMPLES.map((ex) => (
                  <li key={ex}>• {ex}</li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-slate-900">
                Illustration Only — Healthy Tiffin Subscription Example
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <div className="font-medium text-slate-800">X-axis = Price / Cost</div>
                  <div>1 = Very Low Price</div>
                  <div>5 = Medium Price</div>
                  <div>10 = Very High Price</div>
                </div>
                <div>
                  <div className="font-medium text-slate-800">
                    Y-axis = Customization / Personalization
                  </div>
                  <div>1 = Standardized offer with almost no customer choice</div>
                  <div>5 = Some customer choice or flexibility</div>
                  <div>10 = Highly customized or personalized offer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 2 — SCORE MY VENTURE AND EACH ALTERNATIVE */}
      <section
        aria-labelledby="step2-scoring-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="text-xs font-medium text-blue-700">Step 2</div>
          <h3 id="step2-scoring-heading" className="text-base font-semibold text-slate-900">
            Score Your Venture and Each Alternative (1 to 10)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign manual scores from 1 to 10 based on your research and judgement.
          </p>
        </div>

        {!axesReady ? (
          <div className="p-6 text-sm text-slate-600">
            Complete all 6 axis fields in Step 1 (dimension names and both anchor labels for each
            axis) before scoring your venture and alternatives.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {/* Selected Venture Row */}
            <div className="p-6 bg-blue-50/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-blue-700">Selected Venture</span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    {venture.name}
                  </h4>
                </div>
                <span className="font-mono text-xs tabular-nums text-slate-600">
                  {axes.xName}: {ventureScore.x ?? '—'} · {axes.yName}: {ventureScore.y ?? '—'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ScoreSelector
                  axisLabel={axes.xName}
                  lowAnchor={axes.xLeftLabel}
                  highAnchor={axes.xRightLabel}
                  value={ventureScore.x}
                  onSelect={(val) => setVentureAxisScore('x', val)}
                />
                <ScoreSelector
                  axisLabel={axes.yName}
                  lowAnchor={axes.yBottomLabel}
                  highAnchor={axes.yTopLabel}
                  value={ventureScore.y}
                  onSelect={(val) => setVentureAxisScore('y', val)}
                />
              </div>
            </div>

            {/* Completed Alternatives Rows */}
            {completedAlternatives.map((alt) => {
              const score = alternativeScores[alt.id] ?? { x: null, y: null };
              return (
                <div key={alt.id} className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-slate-500">
                        {alt.type}
                      </span>
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                        {alt.name}
                      </h4>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-slate-600">
                      {axes.xName}: {score.x ?? '—'} · {axes.yName}: {score.y ?? '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <ScoreSelector
                      axisLabel={axes.xName}
                      lowAnchor={axes.xLeftLabel}
                      highAnchor={axes.xRightLabel}
                      value={score.x}
                      onSelect={(val) => setAlternativeAxisScore(alt.id, 'x', val)}
                    />
                    <ScoreSelector
                      axisLabel={axes.yName}
                      lowAnchor={axes.yBottomLabel}
                      highAnchor={axes.yTopLabel}
                      value={score.y}
                      onSelect={(val) => setAlternativeAxisScore(alt.id, 'y', val)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* STEP 3 — CREATE THE POSITIONING MAP */}
      <section
        aria-labelledby="step3-map-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-blue-700">Step 3</div>
            <h3 id="step3-map-heading" className="text-base font-semibold text-slate-900">
              {axesReady ? `${axes.xName} vs. ${axes.yName} Positioning Map` : '2×2 Positioning Map'}
            </h3>
          </div>
          {axesReady && !mapComplete && (
            <span className="text-xs font-medium text-amber-700">
              Assign both scores for your venture and all {completedAlternatives.length} completed
              alternatives to complete the map
            </span>
          )}
        </div>

        {!axesReady ? (
          <div className="p-6 text-sm text-slate-600">
            Define your two positioning axes in Step 1 and score your alternatives in Step 2 to
            render the 2×2 positioning map.
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-8 bg-slate-50/70 border border-slate-200 rounded-xl p-4">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                role="img"
                aria-label={`Positioning map comparing ${axes.xName} and ${axes.yName}`}
                className="w-full h-auto select-none"
              >
                {/* Plot Canvas */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={plotW}
                  height={plotH}
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />

                {/* Grid Lines */}
                {[2, 4, 6, 8, 10].map((tick) => (
                  <g key={`grid-${tick}`}>
                    <line
                      x1={toSvgX(tick)}
                      y1={padTop}
                      x2={toSvgX(tick)}
                      y2={padTop + plotH}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <line
                      x1={padLeft}
                      y1={toSvgY(tick)}
                      x2={padLeft + plotW}
                      y2={toSvgY(tick)}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                  </g>
                ))}

                {/* 2x2 Quadrant Midpoint Lines (5.5) */}
                <line
                  x1={toSvgX(5.5)}
                  y1={padTop}
                  x2={toSvgX(5.5)}
                  y2={padTop + plotH}
                  stroke="#94A3B8"
                  strokeDasharray="5 4"
                  strokeWidth="1.25"
                />
                <line
                  x1={padLeft}
                  y1={toSvgY(5.5)}
                  x2={padLeft + plotW}
                  y2={toSvgY(5.5)}
                  stroke="#94A3B8"
                  strokeDasharray="5 4"
                  strokeWidth="1.25"
                />

                {/* Numeric Ticks */}
                {[1, 3, 5, 7, 10].map((tick) => (
                  <g key={`tick-${tick}`}>
                    <text
                      x={toSvgX(tick)}
                      y={padTop + plotH + 16}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {tick}
                    </text>
                    <text
                      x={padLeft - 10}
                      y={toSvgY(tick) + 3}
                      textAnchor="end"
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {tick}
                    </text>
                  </g>
                ))}

                {/* X-Axis Anchors & Dimension Name */}
                <text
                  x={padLeft}
                  y={padTop + plotH + 34}
                  textAnchor="start"
                  fill="#475569"
                  fontSize="11"
                  fontWeight="500"
                >
                  {axes.xLeftLabel}
                </text>
                <text
                  x={padLeft + plotW}
                  y={padTop + plotH + 34}
                  textAnchor="end"
                  fill="#475569"
                  fontSize="11"
                  fontWeight="500"
                >
                  {axes.xRightLabel}
                </text>
                <text
                  x={padLeft + plotW / 2}
                  y={svgH - 8}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="12"
                  fontWeight="700"
                >
                  {axes.xName}
                </text>

                {/* Y-Axis Anchors & Dimension Name */}
                <text
                  x={padLeft - 8}
                  y={padTop - 10}
                  textAnchor="start"
                  fill="#475569"
                  fontSize="11"
                  fontWeight="500"
                >
                  ▲ {axes.yTopLabel}
                </text>
                <text
                  x={padLeft - 8}
                  y={padTop + plotH + 16}
                  textAnchor="end"
                  fill="#475569"
                  fontSize="10"
                  fontWeight="500"
                >
                  {axes.yBottomLabel}
                </text>
                <text
                  x={18}
                  y={padTop + plotH / 2}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="12"
                  fontWeight="700"
                  transform={`rotate(-90 18 ${padTop + plotH / 2})`}
                >
                  {axes.yName}
                </text>

                {/* Plotted Alternative Markers */}
                {plottedPoints
                  .filter((p) => !p.isVenture)
                  .map((pt) => {
                    const cx = toSvgX(pt.x);
                    const cy = toSvgY(pt.y);
                    const isHovered = hoveredPointId === pt.id;
                    const labelAbove = cy > padTop + 26;

                    return (
                      <g
                        key={pt.id}
                        tabIndex={0}
                        onMouseEnter={() => setHoveredPointId(pt.id)}
                        onMouseLeave={() => setHoveredPointId(null)}
                        onFocus={() => setHoveredPointId(pt.id)}
                        onBlur={() => setHoveredPointId(null)}
                        className="cursor-pointer outline-none"
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 9 : 7}
                          fill="#0F172A"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x={cx}
                          y={labelAbove ? cy - 12 : cy + 19}
                          textAnchor="middle"
                          fill="#0F172A"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {pt.name.length > 22 ? `${pt.name.slice(0, 20)}…` : pt.name}
                        </text>
                      </g>
                    );
                  })}

                {/* Plotted Venture Marker (Larger & Visually Distinct) */}
                {plottedPoints
                  .filter((p) => p.isVenture)
                  .map((pt) => {
                    const cx = toSvgX(pt.x);
                    const cy = toSvgY(pt.y);
                    const isHovered = hoveredPointId === pt.id;
                    const labelAbove = cy > padTop + 32;

                    return (
                      <g
                        key={pt.id}
                        tabIndex={0}
                        onMouseEnter={() => setHoveredPointId(pt.id)}
                        onMouseLeave={() => setHoveredPointId(null)}
                        onFocus={() => setHoveredPointId(pt.id)}
                        onBlur={() => setHoveredPointId(null)}
                        className="cursor-pointer outline-none"
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 18 : 15}
                          fill="#2563EB"
                          opacity="0.16"
                        />
                        <polygon
                          points={`${cx},${cy - 11} ${cx + 11},${cy} ${cx},${cy + 11} ${cx - 11},${cy}`}
                          fill="#1D4ED8"
                          stroke="#FFFFFF"
                          strokeWidth="2.2"
                        />
                        <text
                          x={cx}
                          y={labelAbove ? cy - 17 : cy + 24}
                          textAnchor="middle"
                          fill="#1D4ED8"
                          fontSize="12"
                          fontWeight="700"
                        >
                          {pt.name.length > 24 ? `${pt.name.slice(0, 22)}…` : pt.name}
                        </text>
                      </g>
                    );
                  })}
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 px-1 text-xs text-slate-600">
                <div className="flex items-center gap-5">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rotate-45 bg-blue-700 inline-block" />
                    <span className="font-semibold text-slate-900">
                      {venture.name} (Selected Venture)
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-900 inline-block" />
                    <span>Researched Alternatives</span>
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-500">
                  {plottedPoints.length} plotted
                </span>
              </div>
            </div>

            {/* Hover Inspector Card */}
            <div className="xl:col-span-4 space-y-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-3">
                <div className="text-xs font-semibold text-slate-900">
                  Point Inspector
                </div>
                {hoveredPoint ? (
                  <dl className="space-y-2.5 text-xs sm:text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Alternative / Venture Name</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">
                        {hoveredPoint.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Type</dt>
                      <dd className="text-slate-800 mt-0.5">{hoveredPoint.type}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <dt className="text-xs text-slate-500 truncate">{axes.xName}</dt>
                        <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                          {hoveredPoint.x} / 10
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500 truncate">{axes.yName}</dt>
                        <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                          {hoveredPoint.y} / 10
                        </dd>
                      </div>
                    </div>
                  </dl>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hover over or focus any marker on the positioning map to inspect its type
                    and scores on <span className="font-medium text-slate-700">{axes.xName}</span>{' '}
                    and <span className="font-medium text-slate-700">{axes.yName}</span>.
                  </p>
                )}
              </div>

              {plottedPoints.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-800">
                    Plotted Coordinates
                  </div>
                  <ul className="divide-y divide-slate-200 text-xs">
                    {plottedPoints.map((pt) => (
                      <li
                        key={`list-${pt.id}`}
                        onMouseEnter={() => setHoveredPointId(pt.id)}
                        onMouseLeave={() => setHoveredPointId(null)}
                        className={`px-4 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                          hoveredPointId === pt.id ? 'bg-blue-50/50' : 'bg-white'
                        }`}
                      >
                        <span
                          className={`truncate ${
                            pt.isVenture
                              ? 'font-semibold text-blue-700'
                              : 'font-medium text-slate-800'
                          }`}
                        >
                          {pt.name}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600 shrink-0">
                          ({pt.x}, {pt.y})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* STEP 4 — INTERPRET THE MAP */}
      <section
        aria-labelledby="step4-interpret-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="text-xs font-medium text-blue-700">Step 4</div>
          <h3 id="step4-interpret-heading" className="text-base font-semibold text-slate-900">
            Interpret the Map
          </h3>
        </div>

        {!interpretation ? (
          <div className="p-6 text-sm text-slate-600">
            Complete scoring for <strong className="font-medium text-slate-900">{venture.name}</strong>{' '}
            and all {completedAlternatives.length} completed alternatives in Step 2 to calculate the
            battlefield interpretation.
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl">
                <dt className="text-xs font-medium text-slate-500">
                  Closest alternative to your venture
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                  {interpretation.closestList.map((c) => c.alt.name).join(', ')}
                </dd>
                <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                  Distance: {interpretation.minDist.toFixed(2)} units
                </p>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <dt className="text-xs font-medium text-slate-500">
                  Competitors that appear clustered together
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                  {interpretation.clusterPairs.length > 0
                    ? interpretation.clusterNames.join(', ')
                    : 'No tight clusters detected'}
                </dd>
                <p className="text-xs text-slate-600 mt-1">
                  {interpretation.clusterPairs.length > 0
                    ? `Close pairs: ${interpretation.clusterPairs.join(' · ')}`
                    : 'Alternatives are spaced more than 2.5 units apart on these axes.'}
                </p>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <dt className="text-xs font-medium text-slate-500">
                  Whether your venture appears differentiated
                </dt>
                <dd className="mt-1.5 text-sm text-slate-900 leading-relaxed">
                  {interpretation.differentiationSummary}
                </dd>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <dt className="text-xs font-medium text-slate-500">
                  Apparently less-crowded area of the map
                </dt>
                <dd className="mt-1.5 text-sm text-slate-900 leading-relaxed">
                  {interpretation.leastCrowded.map((q) => q.label).join(' · ')}
                </dd>
                <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                  {interpretation.minQuadCount} alternative
                  {interpretation.minQuadCount === 1 ? '' : 's'} in{' '}
                  {interpretation.leastCrowded.length > 1 ? 'these quadrants' : 'this quadrant'}
                </p>
              </div>
            </dl>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                “An empty position may represent an opportunity, or it may indicate weak customer
                demand. Validate before making a strategic decision.”
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface ScoreSelectorProps {
  axisLabel: string;
  lowAnchor: string;
  highAnchor: string;
  value: number | null;
  onSelect: (val: number | null) => void;
}

function ScoreSelector({
  axisLabel,
  lowAnchor,
  highAnchor,
  value,
  onSelect,
}: ScoreSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800 truncate">{axisLabel}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs tabular-nums text-slate-700 font-semibold">
            {value !== null ? `${value} / 10` : 'Not scored'}
          </span>
          {value !== null && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        role="group"
        aria-label={`${axisLabel} score`}
        className="grid grid-cols-10 gap-1"
      >
        {SCORE_SCALE.map((num) => {
          const active = value === num;
          return (
            <button
              key={num}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(num)}
              className={`py-1.5 text-xs font-mono tabular-nums font-medium rounded-md border transition-colors cursor-pointer ${
                active
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="truncate">1 = {lowAnchor}</span>
        <span className="truncate text-right">10 = {highAnchor}</span>
      </div>
    </div>
  );
}
