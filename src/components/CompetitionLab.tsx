import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  ALTERNATIVE_TYPES,
  EVIDENCE_QUALITY_OPTIONS,
  EVIDENCE_SOURCE_TYPES,
  createBlankAlternative,
  isAlternativeCompleted,
  isAlternativeStarted,
  isBattlefieldComplete,
  isPositioningComponentsComplete,
} from '../data/ventures';
import {
  AIStrategyChallengeState,
  AlternativeType,
  CompetitionLabState,
  CompetitorAlternative,
  EvidenceQuality,
  EvidenceSourceType,
  MarketBattlefieldState,
  PositioningStatementState,
  Venture,
} from '../types/venture';
import { MarketBattlefield } from './MarketBattlefield';
import { PositioningStatementBuilder } from './PositioningStatementBuilder';
import { AIStrategyChallenge } from './AIStrategyChallenge';

interface CompetitionLabProps {
  venture: Venture;
  labState: CompetitionLabState;
  battlefieldState: MarketBattlefieldState;
  positioningState: PositioningStatementState;
  challengeState: AIStrategyChallengeState;
  onChangeLabState: (next: CompetitionLabState) => void;
  onChangeBattlefieldState: (next: MarketBattlefieldState) => void;
  onChangePositioningState: (next: PositioningStatementState) => void;
  onChangeChallengeState: (next: AIStrategyChallengeState) => void;
  onBackToVentureBank: () => void;
  onConfirmSwitchVenture: () => void;
}

const MAX_ALTERNATIVES = 6;
const MIN_ALTERNATIVES = 3;

export function CompetitionLab({
  venture,
  labState,
  battlefieldState,
  positioningState,
  challengeState,
  onChangeLabState,
  onChangeBattlefieldState,
  onChangePositioningState,
  onChangeChallengeState,
  onBackToVentureBank,
  onConfirmSwitchVenture,
}: CompetitionLabProps) {
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [activeSubTab, setActiveSubTab] = useLocalStorage<
    'research' | 'market-battlefield' | 'positioning-statement' | 'ai-challenge'
  >('nexus_lab_subtab_v1', 'research');

  const alternatives = labState.alternatives;

  const updateAlternative = (
    id: string,
    patch: Partial<CompetitorAlternative>
  ) => {
    onChangeLabState({
      alternatives: alternatives.map((alt) =>
        alt.id === id ? { ...alt, ...patch } : alt
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddAlternative = () => {
    if (alternatives.length >= MAX_ALTERNATIVES) return;
    onChangeLabState({
      alternatives: [
        ...alternatives,
        createBlankAlternative(alternatives.length + 1),
      ],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveAlternative = (id: string) => {
    if (alternatives.length <= MIN_ALTERNATIVES) return;
    onChangeLabState({
      alternatives: alternatives.filter((alt) => alt.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleClearAlternative = (id: string) => {
    onChangeLabState({
      alternatives: alternatives.map((alt, idx) =>
        alt.id === id ? createBlankAlternative(idx + 1) : alt
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const metrics = useMemo(() => {
    const started = alternatives.filter(isAlternativeStarted);
    const completed = alternatives.filter(isAlternativeCompleted);

    const directCount = started.filter((a) => a.type === 'Direct Competitor').length;
    const indirectCount = started.filter((a) => a.type === 'Indirect Competitor').length;
    const substituteCount = started.filter((a) => a.type === 'Substitute').length;
    const doNothingCount = started.filter((a) => a.type === 'Do Nothing').length;

    let overallQuality: EvidenceQuality | 'Evidence required' = 'Evidence required';
    let qualityBreakdown = '';

    if (completed.length > 0) {
      const strongCount = completed.filter((a) => a.evidenceQuality === 'Strong').length;
      const moderateCount = completed.filter((a) => a.evidenceQuality === 'Moderate').length;
      const weakCount = completed.filter((a) => a.evidenceQuality === 'Weak').length;

      const scoreSum = strongCount * 3 + moderateCount * 2 + weakCount * 1;
      const avg = scoreSum / completed.length;

      if (avg >= 2.5) {
        overallQuality = 'Strong';
      } else if (avg >= 1.5) {
        overallQuality = 'Moderate';
      } else {
        overallQuality = 'Weak';
      }

      const parts: string[] = [];
      if (strongCount > 0) parts.push(`${strongCount} Strong`);
      if (moderateCount > 0) parts.push(`${moderateCount} Moderate`);
      if (weakCount > 0) parts.push(`${weakCount} Weak`);
      qualityBreakdown = parts.join(' · ');
    }

    return {
      started,
      completed,
      researchedCount: started.length,
      completedCount: completed.length,
      directCount,
      indirectCount,
      substituteCount,
      doNothingCount,
      overallQuality,
      qualityBreakdown,
    };
  }, [alternatives]);

  const positioningMapUnlocked = metrics.completedCount >= 3;
  const positioningStatementUnlocked =
    positioningMapUnlocked && isBattlefieldComplete(battlefieldState, metrics.completed);
  const aiChallengeUnlocked =
    positioningStatementUnlocked &&
    Boolean(positioningState.savedStatement) &&
    isPositioningComponentsComplete(positioningState, metrics.completed);
  const warRoomUnlocked =
    aiChallengeUnlocked &&
    challengeState.status === 'complete' &&
    Boolean(challengeState.finalReview);

  const effectiveSubTab =
    activeSubTab === 'ai-challenge' && aiChallengeUnlocked
      ? 'ai-challenge'
      : activeSubTab === 'positioning-statement' && positioningStatementUnlocked
        ? 'positioning-statement'
        : activeSubTab === 'market-battlefield' && positioningMapUnlocked
          ? 'market-battlefield'
          : 'research';

  const incompleteStartedCount = metrics.started.length - metrics.completed.length;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Selected Venture Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBackToVentureBank}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>← Back to Venture Bank</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSwitchWarning(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Switch Venture</span>
          </button>
        </div>

        <div className="text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900">{venture.name}</span>
          <span aria-hidden="true">·</span>
          <span>{venture.targetCustomer}</span>
          <span aria-hidden="true">·</span>
          <span>{venture.geography}</span>
        </div>
      </div>

      {/* Switch Venture Warning Dialog */}
      {showSwitchWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="switch-venture-warning-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="switch-venture-warning-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Switch Venture?
                </h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Changing venture may make the existing competitor research irrelevant.
                  Continue?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSwitchWarning(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSwitchWarning(false);
                  onConfirmSwitchVenture();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progression Gates */}
      <section aria-labelledby="progression-heading" className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 id="progression-heading" className="text-sm font-semibold text-slate-900">
              Competition Lab Progression
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete at least 3 alternatives with evidence to unlock the Positioning Map stage.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-700 font-medium whitespace-nowrap">
            {metrics.completedCount} / 3 completed required
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
          <div
            className={`px-4 py-3 rounded-lg border flex flex-col justify-between gap-2 ${
              positioningMapUnlocked
                ? 'bg-blue-50/60 border-blue-600'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                <div className="flex items-center gap-2">
                  {positioningMapUnlocked ? (
                    <Unlock className="w-4 h-4 text-blue-700 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span>Market Battlefield (Positioning Map)</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {positioningMapUnlocked
                  ? 'Unlocked — 3+ completed alternatives verified.'
                  : 'Complete competitor research first.'}
              </p>
            </div>
            {positioningMapUnlocked && effectiveSubTab !== 'market-battlefield' && (
              <button
                type="button"
                onClick={() => setActiveSubTab('market-battlefield')}
                className="self-start px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                Open Market Battlefield →
              </button>
            )}
          </div>

          <div
            className={`px-4 py-3 rounded-lg border flex flex-col justify-between gap-2 ${
              positioningStatementUnlocked
                ? 'bg-blue-50/60 border-blue-600'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {positioningStatementUnlocked ? (
                  <Unlock className="w-4 h-4 text-blue-700 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span>Positioning Statement</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {positioningStatementUnlocked
                  ? 'Unlocked — Positioning map complete.'
                  : 'Complete positioning map first.'}
              </p>
            </div>
            {positioningStatementUnlocked && effectiveSubTab !== 'positioning-statement' && (
              <button
                type="button"
                onClick={() => setActiveSubTab('positioning-statement')}
                className="self-start px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                Open Positioning Statement →
              </button>
            )}
          </div>

          <div
            className={`px-4 py-3 rounded-lg border flex flex-col justify-between gap-2 ${
              aiChallengeUnlocked
                ? 'bg-blue-50/60 border-blue-600'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {aiChallengeUnlocked ? (
                  <Unlock className="w-4 h-4 text-blue-700 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span>AI Strategy Challenge</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {aiChallengeUnlocked
                  ? 'Unlocked — Positioning statement saved.'
                  : 'Complete positioning statement first.'}
              </p>
            </div>
            {aiChallengeUnlocked && effectiveSubTab !== 'ai-challenge' && (
              <button
                type="button"
                onClick={() => setActiveSubTab('ai-challenge')}
                className="self-start px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                Open AI Strategy Challenge →
              </button>
            )}
          </div>

          <div
            className={`px-4 py-3 rounded-lg border md:col-span-3 ${
              warRoomUnlocked
                ? 'bg-emerald-50/60 border-emerald-600'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {warRoomUnlocked ? (
                <Unlock className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span>Competition War Room</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {warRoomUnlocked
                ? 'Unlocked — Strategy challenge complete. Ready for the Competition War Room session.'
                : 'Complete AI Strategy Challenge first.'}
            </p>
          </div>
        </div>

        {/* Sub-stage Navigation Bar */}
        <div
          role="tablist"
          aria-label="Competition Lab Stages"
          className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={effectiveSubTab === 'research'}
            onClick={() => setActiveSubTab('research')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              effectiveSubTab === 'research'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            1. Competitor Research &amp; Matrix
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={effectiveSubTab === 'market-battlefield'}
            disabled={!positioningMapUnlocked}
            onClick={() => positioningMapUnlocked && setActiveSubTab('market-battlefield')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              !positioningMapUnlocked
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : effectiveSubTab === 'market-battlefield'
                  ? 'bg-blue-700 text-white border-blue-700 cursor-pointer'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            {!positioningMapUnlocked && <Lock className="w-3.5 h-3.5" />}
            <span>2. Market Battlefield</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={effectiveSubTab === 'positioning-statement'}
            disabled={!positioningStatementUnlocked}
            onClick={() =>
              positioningStatementUnlocked && setActiveSubTab('positioning-statement')
            }
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              !positioningStatementUnlocked
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : effectiveSubTab === 'positioning-statement'
                  ? 'bg-blue-700 text-white border-blue-700 cursor-pointer'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            {!positioningStatementUnlocked && <Lock className="w-3.5 h-3.5" />}
            <span>3. Positioning Statement</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={effectiveSubTab === 'ai-challenge'}
            disabled={!aiChallengeUnlocked}
            onClick={() => aiChallengeUnlocked && setActiveSubTab('ai-challenge')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              !aiChallengeUnlocked
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : effectiveSubTab === 'ai-challenge'
                  ? 'bg-blue-700 text-white border-blue-700 cursor-pointer'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            {!aiChallengeUnlocked && <Lock className="w-3.5 h-3.5" />}
            <span>4. AI Strategy Challenge</span>
          </button>
        </div>
      </section>

      {effectiveSubTab === 'ai-challenge' ? (
        <AIStrategyChallenge
          venture={venture}
          completedAlternatives={metrics.completed}
          battlefieldState={battlefieldState}
          positioningState={positioningState}
          state={challengeState}
          onChangeState={onChangeChallengeState}
        />
      ) : effectiveSubTab === 'positioning-statement' ? (
        <div className="space-y-6">
          <PositioningStatementBuilder
            venture={venture}
            completedAlternatives={metrics.completed}
            battlefieldState={battlefieldState}
            state={positioningState}
            onChangeState={onChangePositioningState}
          />
          {aiChallengeUnlocked && (
            <div className="bg-white border border-blue-600/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  AI Strategy Challenge Unlocked
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your positioning statement is saved. Continue to test whether your
                  position is logically defensible and supported by evidence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('ai-challenge')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Continue to AI Strategy Challenge →
              </button>
            </div>
          )}
        </div>
      ) : effectiveSubTab === 'market-battlefield' ? (
        <div className="space-y-6">
          <MarketBattlefield
            venture={venture}
            completedAlternatives={metrics.completed}
            incompleteCount={incompleteStartedCount}
            state={battlefieldState}
            onChangeState={onChangeBattlefieldState}
          />
          {positioningStatementUnlocked && (
            <div className="bg-white border border-blue-600/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Positioning Statement Unlocked
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your positioning map is complete. Continue to craft and verify your Positioning
                  Statement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('positioning-statement')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Continue to Positioning Statement →
              </button>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Competitor Research Workspace */}
      <section
        aria-labelledby="research-workspace-heading"
        className="space-y-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="research-workspace-heading"
              className="text-base sm:text-lg font-semibold text-slate-900"
            >
              Competitor Research Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Research real market alternatives and enter your own evidence. Start with 3
              alternatives (maximum 6). Saved automatically in your browser.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddAlternative}
            disabled={alternatives.length >= MAX_ALTERNATIVES}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto ${
              alternatives.length >= MAX_ALTERNATIVES
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-700 text-white hover:bg-blue-800 cursor-pointer'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              Add Alternative ({alternatives.length}/{MAX_ALTERNATIVES})
            </span>
          </button>
        </div>

        {/* Evidence Quality Reference Guide */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5">
          <div className="text-xs font-semibold text-slate-900 mb-2">
            Evidence Quality Guide
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
            {EVIDENCE_QUALITY_OPTIONS.map((opt) => (
              <div key={opt.value}>
                <span className="font-semibold text-slate-900">{opt.value}</span>
                <span> = {opt.explanation}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alternative Cards */}
        <div className="space-y-4">
          {alternatives.map((alt, idx) => {
            const completed = isAlternativeCompleted(alt);
            const isDoNothing = alt.type === 'Do Nothing';

            return (
              <article
                key={alt.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold tabular-nums text-slate-500">
                      Alternative {idx + 1}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    {completed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700">
                        Evidence required
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleClearAlternative(alt.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear</span>
                    </button>

                    {alternatives.length > MIN_ALTERNATIVES && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAlternative(alt.id)}
                        aria-label={`Remove Alternative ${idx + 1}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 bg-white border border-slate-200 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Name */}
                  <div>
                    <label
                      htmlFor={`${alt.id}-name`}
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      1. Competitor / Alternative Name
                    </label>
                    <input
                      id={`${alt.id}-name`}
                      type="text"
                      value={alt.name}
                      onChange={(e) =>
                        updateAlternative(alt.id, { name: e.target.value })
                      }
                      placeholder="Enter competitor or alternative name"
                      className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>

                  {/* 2. Type */}
                  <div>
                    <label
                      htmlFor={`${alt.id}-type`}
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      2. Type
                    </label>
                    <select
                      id={`${alt.id}-type`}
                      value={alt.type}
                      onChange={(e) =>
                        updateAlternative(alt.id, {
                          type: e.target.value as AlternativeType | '',
                        })
                      }
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    >
                      <option value="">Select type</option>
                      {ALTERNATIVE_TYPES.map((typeOption) => (
                        <option key={typeOption} value={typeOption}>
                          {typeOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Approximate Price / Cost */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label
                        htmlFor={`${alt.id}-price`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        3. Approximate Price / Cost
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateAlternative(alt.id, {
                            priceNotApplicable: !alt.priceNotApplicable,
                            priceCost: !alt.priceNotApplicable
                              ? 'Not applicable'
                              : '',
                          })
                        }
                        className={`text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          alt.priceNotApplicable
                            ? 'text-blue-700 underline'
                            : isDoNothing
                              ? 'text-blue-700 hover:underline'
                              : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {alt.priceNotApplicable ? 'Not applicable (active)' : 'Mark Not applicable'}
                      </button>
                    </div>
                    <input
                      id={`${alt.id}-price`}
                      type="text"
                      disabled={alt.priceNotApplicable}
                      value={alt.priceNotApplicable ? 'Not applicable' : alt.priceCost}
                      onChange={(e) =>
                        updateAlternative(alt.id, {
                          priceCost: e.target.value,
                          priceNotApplicable: false,
                        })
                      }
                      placeholder="Enter observed price or cost"
                      className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 ${
                        alt.priceNotApplicable
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                          : 'bg-white text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>

                  {/* 4. Main Offer */}
                  <div>
                    <label
                      htmlFor={`${alt.id}-offer`}
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      4. Main Offer
                    </label>
                    <textarea
                      id={`${alt.id}-offer`}
                      rows={2}
                      value={alt.mainOffer}
                      onChange={(e) =>
                        updateAlternative(alt.id, { mainOffer: e.target.value })
                      }
                      placeholder="Enter main product or service offered"
                      className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
                    />
                  </div>

                  {/* 5. Main Strength */}
                  <div>
                    <label
                      htmlFor={`${alt.id}-strength`}
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      5. Main Strength
                    </label>
                    <textarea
                      id={`${alt.id}-strength`}
                      rows={2}
                      value={alt.mainStrength}
                      onChange={(e) =>
                        updateAlternative(alt.id, { mainStrength: e.target.value })
                      }
                      placeholder="Enter observed customer advantage"
                      className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
                    />
                  </div>

                  {/* 6. Main Weakness */}
                  <div>
                    <label
                      htmlFor={`${alt.id}-weakness`}
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      6. Main Weakness
                    </label>
                    <textarea
                      id={`${alt.id}-weakness`}
                      rows={2}
                      value={alt.mainWeakness}
                      onChange={(e) =>
                        updateAlternative(alt.id, { mainWeakness: e.target.value })
                      }
                      placeholder="Enter observed gap or limitation"
                      className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
                    />
                  </div>

                  {/* 7. Evidence / Source */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor={`${alt.id}-evidence-source`}
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      7. Evidence / Source
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <select
                        aria-label={`Alternative ${idx + 1} evidence source category`}
                        value={alt.evidenceType}
                        onChange={(e) =>
                          updateAlternative(alt.id, {
                            evidenceType: e.target.value as EvidenceSourceType | '',
                          })
                        }
                        className="px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      >
                        <option value="">Source type (optional)</option>
                        {EVIDENCE_SOURCE_TYPES.map((sourceType) => (
                          <option key={sourceType} value={sourceType}>
                            {sourceType}
                          </option>
                        ))}
                      </select>

                      <input
                        id={`${alt.id}-evidence-source`}
                        type="text"
                        value={alt.evidenceSource}
                        onChange={(e) =>
                          updateAlternative(alt.id, { evidenceSource: e.target.value })
                        }
                        placeholder="Enter URL, listing reference, or observation note"
                        className="sm:col-span-2 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* 8. Evidence Quality */}
                  <div>
                    <span className="block text-xs font-medium text-slate-700 mb-1">
                      8. Evidence Quality
                    </span>
                    <div
                      role="radiogroup"
                      aria-label={`Alternative ${idx + 1} Evidence Quality`}
                      className="grid grid-cols-3 gap-2"
                    >
                      {EVIDENCE_QUALITY_OPTIONS.map((option) => {
                        const selected = alt.evidenceQuality === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() =>
                              updateAlternative(alt.id, {
                                evidenceQuality: option.value,
                              })
                            }
                            title={option.explanation}
                            className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                              selected
                                ? 'bg-blue-700 text-white border-blue-700'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {option.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Competitor Matrix */}
      <section
        aria-labelledby="competitor-matrix-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 id="competitor-matrix-heading" className="text-base sm:text-lg font-semibold text-slate-900">
            Competitor Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Built exclusively from your entered research above. Missing fields display “Evidence required”.
          </p>
        </div>

        {/* 6 Summary Metrics Above the Matrix */}
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/70">
          <div className="px-4 py-3.5">
            <dt className="text-xs text-slate-500">Alternatives researched</dt>
            <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {metrics.researchedCount}
            </dd>
          </div>
          <div className="px-4 py-3.5">
            <dt className="text-xs text-slate-500">Direct competitors</dt>
            <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {metrics.directCount}
            </dd>
          </div>
          <div className="px-4 py-3.5">
            <dt className="text-xs text-slate-500">Indirect competitors</dt>
            <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {metrics.indirectCount}
            </dd>
          </div>
          <div className="px-4 py-3.5">
            <dt className="text-xs text-slate-500">Substitutes</dt>
            <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {metrics.substituteCount}
            </dd>
          </div>
          <div className="px-4 py-3.5">
            <dt className="text-xs text-slate-500">Do-Nothing alternatives</dt>
            <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {metrics.doNothingCount}
            </dd>
          </div>
          <div className="px-4 py-3.5">
            <dt className="text-xs text-slate-500">Overall evidence quality</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {metrics.overallQuality}
            </dd>
            {metrics.qualityBreakdown && (
              <div className="text-[11px] text-slate-500 mt-0.5">
                {metrics.qualityBreakdown}
              </div>
            )}
          </div>
        </dl>

        {metrics.started.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-900">No entries in the Competitor Matrix yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Enter your research in the Competitor Research Workspace above to populate this matrix.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Alternative</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Price / Cost</th>
                  <th className="py-3 px-4">Main Offer</th>
                  <th className="py-3 px-4">Main Strength</th>
                  <th className="py-3 px-4">Main Weakness</th>
                  <th className="py-3 px-4">Evidence / Source</th>
                  <th className="py-3 px-4 whitespace-nowrap">Evidence Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {metrics.started.map((alt) => {
                  const renderField = (val: string) =>
                    val.trim() ? (
                      <span className="text-slate-800">{val.trim()}</span>
                    ) : (
                      <span className="text-amber-700 font-medium">Evidence required</span>
                    );

                  const priceDisplay = alt.priceNotApplicable ? (
                    <span className="text-slate-600">Not applicable</span>
                  ) : alt.priceCost.trim() ? (
                    <span className="text-slate-800 font-mono tabular-nums text-xs">
                      {alt.priceCost.trim()}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">Evidence required</span>
                  );

                  return (
                    <tr key={alt.id} className="align-top hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {renderField(alt.name)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {alt.type ? (
                          <span className="text-slate-700">{alt.type}</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Evidence required</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{priceDisplay}</td>
                      <td className="py-3.5 px-4 min-w-[160px]">{renderField(alt.mainOffer)}</td>
                      <td className="py-3.5 px-4 min-w-[160px]">{renderField(alt.mainStrength)}</td>
                      <td className="py-3.5 px-4 min-w-[160px]">{renderField(alt.mainWeakness)}</td>
                      <td className="py-3.5 px-4 min-w-[180px]">
                        {alt.evidenceSource.trim() ? (
                          <div className="space-y-0.5">
                            {alt.evidenceType && (
                              <div className="text-[11px] font-medium text-slate-500">
                                {alt.evidenceType}
                              </div>
                            )}
                            <div className="text-slate-800 break-words">
                              {alt.evidenceSource.trim()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-700 font-medium">Evidence required</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {alt.evidenceQuality ? (
                          <span
                            className={`font-semibold ${
                              alt.evidenceQuality === 'Strong'
                                ? 'text-emerald-700'
                                : alt.evidenceQuality === 'Moderate'
                                  ? 'text-blue-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {alt.evidenceQuality}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">Evidence required</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {positioningMapUnlocked && (
        <div className="bg-white border border-blue-600/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Market Battlefield Unlocked
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              You have completed {metrics.completedCount} alternatives. Continue to Market
              Battlefield to choose your positioning axes and map your alternatives.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('market-battlefield')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Continue to Market Battlefield →
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
