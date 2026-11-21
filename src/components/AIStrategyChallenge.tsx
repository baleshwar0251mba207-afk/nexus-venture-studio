import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  AIStrategyChallengeState,
  ChallengeFeedback,
  ChallengeQuestion,
  CompetitorAlternative,
  FinalStrategyReview,
  MarketBattlefieldState,
  PositioningStatementState,
  Venture,
} from '../types/venture';

interface AIStrategyChallengeProps {
  venture: Venture;
  completedAlternatives: CompetitorAlternative[];
  battlefieldState: MarketBattlefieldState;
  positioningState: PositioningStatementState;
  state: AIStrategyChallengeState;
  onChangeState: (next: AIStrategyChallengeState) => void;
}

export function AIStrategyChallenge({
  venture,
  completedAlternatives,
  battlefieldState,
  positioningState,
  state,
  onChangeState,
}: AIStrategyChallengeProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const strategyContext = useMemo(() => {
    const selectedAlt = completedAlternatives.find(
      (a) => a.id === positioningState.mainAlternativeId
    );
    return {
      ventureProfile: {
        name: venture.name,
        targetCustomer: venture.targetCustomer,
        problem: venture.problem,
        geography: venture.geography,
        offer: venture.offer,
      },
      competitorResearchAndMatrix: completedAlternatives.map((alt) => ({
        name: alt.name,
        type: alt.type,
        priceCost: alt.priceNotApplicable ? 'Not applicable' : alt.priceCost || 'Evidence required',
        mainOffer: alt.mainOffer,
        mainStrength: alt.mainStrength,
        mainWeakness: alt.mainWeakness,
        evidenceType: alt.evidenceType || 'Not specified',
        evidenceSource: alt.evidenceSource,
        evidenceQuality: alt.evidenceQuality,
      })),
      positioningMap: {
        axes: battlefieldState.axes,
        ventureScore: battlefieldState.ventureScore,
        alternativeScores: completedAlternatives.map((alt) => ({
          name: alt.name,
          type: alt.type,
          score: battlefieldState.alternativeScores[alt.id] ?? { x: null, y: null },
        })),
      },
      positioningStatement: {
        targetCustomer: positioningState.targetCustomer,
        category: positioningState.category,
        primaryBenefit: positioningState.primaryBenefit,
        mainAlternative: selectedAlt?.name ?? '',
        reasonToBelieve: positioningState.reasonToBelieve,
        savedStatement: positioningState.savedStatement ?? positioningState.statementText,
      },
    };
  }, [venture, completedAlternatives, battlefieldState, positioningState]);

  const handleStartChallenge = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/strategy-challenge/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: strategyContext }),
      });
      const data = (await res.json()) as {
        questions?: ChallengeQuestion[];
        error?: string;
      };

      if (!res.ok || !data.questions || data.questions.length !== 3) {
        throw new Error(data.error || 'Failed to generate strategy challenge questions.');
      }

      onChangeState({
        status: 'in-progress',
        currentIndex: 0,
        questions: data.questions,
        responses: ['', '', ''],
        feedbacks: [null, null, null],
        finalReview: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to start the AI Strategy Challenge.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResponse = (index: number, value: string) => {
    const nextResponses = [...state.responses];
    nextResponses[index] = value;
    onChangeState({
      ...state,
      responses: nextResponses,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSubmitDefence = async () => {
    const idx = state.currentIndex;
    const currentQuestion = state.questions[idx];
    const currentDefence = (state.responses[idx] ?? '').trim();
    if (!currentQuestion || !currentDefence) return;

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/strategy-challenge/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: strategyContext,
          question: currentQuestion.question,
          defence: currentDefence,
        }),
      });
      const data = (await res.json()) as {
        feedback?: ChallengeFeedback;
        error?: string;
      };

      if (!res.ok || !data.feedback) {
        throw new Error(data.error || 'Failed to evaluate your defence.');
      }

      const nextFeedbacks = [...state.feedbacks];
      nextFeedbacks[idx] = data.feedback;

      onChangeState({
        ...state,
        feedbacks: nextFeedbacks,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to evaluate your defence.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNextChallenge = async () => {
    if (state.currentIndex < 2) {
      setErrorMsg(null);
      onChangeState({
        ...state,
        currentIndex: state.currentIndex + 1,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    // Completed Challenge 3 of 3 -> Generate Final Strategy Review
    setErrorMsg(null);
    setLoading(true);
    try {
      const completedChallenges = state.questions.map((q, idx) => ({
        challengeNumber: idx + 1,
        focusArea: q.focusArea,
        question: q.question,
        founderDefence: state.responses[idx] ?? '',
        feedback: state.feedbacks[idx],
      }));

      const res = await fetch('/api/strategy-challenge/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: strategyContext,
          challenges: completedChallenges,
        }),
      });

      const data = (await res.json()) as {
        review?: FinalStrategyReview;
        error?: string;
      };

      if (!res.ok || !data.review) {
        throw new Error(data.error || 'Failed to generate Final Strategy Review.');
      }

      onChangeState({
        ...state,
        status: 'complete',
        finalReview: data.review,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to complete Final Strategy Review.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetChallenge = () => {
    setErrorMsg(null);
    onChangeState({
      status: 'idle',
      currentIndex: 0,
      questions: [],
      responses: ['', '', ''],
      feedbacks: [null, null, null],
      finalReview: null,
      updatedAt: new Date().toISOString(),
    });
  };

  const currentQuestion = state.questions[state.currentIndex];
  const currentResponse = state.responses[state.currentIndex] ?? '';
  const currentFeedback = state.feedbacks[state.currentIndex] ?? null;

  return (
    <div className="space-y-6">
      {/* Purpose Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            AI Strategy Challenge
          </h2>
          {state.status === 'complete' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Strategy Challenge Complete</span>
            </span>
          ) : state.status === 'in-progress' ? (
            <span className="font-mono text-xs tabular-nums font-semibold text-blue-700">
              Challenge {state.currentIndex + 1} of 3
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500">Ready</span>
          )}
        </div>

        <p className="text-sm text-slate-800 font-medium">
          “The AI Strategy Challenge tests whether your competitive position is logically
          defensible and supported by evidence.”
        </p>
        <p className="text-xs text-slate-600">
          Gemini acts strictly as a strategy challenger reviewing only your entered Venture
          Profile, Competitor Research, Competitor Matrix, Positioning Map, and saved
          Positioning Statement—it will not invent market facts or answer for you.
        </p>
      </section>

      {/* Error Message */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs sm:text-sm text-red-900"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1 — REVIEW EXISTING INFORMATION & START */}
      {state.status === 'idle' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="text-xs font-medium text-blue-700">Step 1 &amp; Step 2</div>
            <h3 className="text-base font-semibold text-slate-900">
              Review Existing Information &amp; Begin Challenge
            </h3>
          </div>

          <div className="p-6 space-y-5">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <dt className="text-xs text-slate-500">Venture Profile</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {venture.name}
                </dd>
                <div className="text-xs text-slate-600 mt-0.5 truncate">
                  {venture.geography}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <dt className="text-xs text-slate-500">Competitor Matrix</dt>
                <dd className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {completedAlternatives.length} alternatives
                </dd>
                <div className="text-xs text-slate-600 mt-0.5">
                  With documented evidence
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <dt className="text-xs text-slate-500">Positioning Map</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900 truncate">
                  {battlefieldState.axes.xName} × {battlefieldState.axes.yName}
                </dd>
                <div className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                  Venture score: ({battlefieldState.ventureScore.x},{' '}
                  {battlefieldState.ventureScore.y})
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <dt className="text-xs text-slate-500">Positioning Statement</dt>
                <dd className="mt-1 text-xs text-slate-800 line-clamp-3">
                  {positioningState.savedStatement ?? positioningState.statementText}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-600">
                Gemini will generate 3 specific challenge questions based strictly on your
                entered work above.
              </p>

              <button
                type="button"
                disabled={loading}
                onClick={handleStartChallenge}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reviewing Strategy...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Challenge My Strategy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEPS 2, 3, 4, 5 — ONE CHALLENGE QUESTION AT A TIME */}
      {state.status === 'in-progress' && currentQuestion && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold tabular-nums text-blue-700">
                Challenge {state.currentIndex + 1} of 3
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-xs font-medium text-slate-600">
                {currentQuestion.focusArea}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetChallenge}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Challenge</span>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Challenge Question */}
            <div className="p-5 bg-slate-900 text-white rounded-xl space-y-2">
              <div className="text-xs font-medium text-slate-300">
                Strategy Challenge Question
              </div>
              <p className="text-base sm:text-lg font-semibold leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            {/* Step 3: User Defence Input */}
            <div className="space-y-2.5">
              <label
                htmlFor="challenge-defence-input"
                className="block text-xs font-semibold text-slate-800"
              >
                Your Defence (grounded in your research and strategic reasoning)
              </label>
              <textarea
                id="challenge-defence-input"
                rows={4}
                value={currentResponse}
                disabled={loading || currentFeedback !== null}
                onChange={(e) =>
                  handleUpdateResponse(state.currentIndex, e.target.value)
                }
                placeholder="Type your defence to this challenge..."
                className={`w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y ${
                  currentFeedback !== null
                    ? 'bg-slate-50 text-slate-700'
                    : 'bg-white text-slate-900 placeholder:text-slate-400'
                }`}
              />

              {currentFeedback === null && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={loading || !currentResponse.trim()}
                    onClick={handleSubmitDefence}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      loading || !currentResponse.trim()
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-700 text-white hover:bg-blue-800 cursor-pointer'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating Defence...</span>
                      </>
                    ) : (
                      <span>Submit My Defence</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Step 4: Gemini Feedback (SUPPORTED / ASSUMPTION / NEXT EVIDENCE NEEDED) */}
            {currentFeedback && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="text-xs font-semibold text-slate-500">
                  Gemini Challenger Feedback
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
                    <div className="text-xs font-bold text-emerald-800">SUPPORTED</div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      {currentFeedback.supported}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                    <div className="text-xs font-bold text-amber-800">ASSUMPTION</div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      {currentFeedback.assumption}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="text-xs font-bold text-blue-800">
                      NEXT EVIDENCE NEEDED
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      {currentFeedback.nextEvidenceNeeded}
                    </p>
                  </div>
                </div>

                {/* Step 5: Next Challenge / Complete */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleNextChallenge}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Final Review...</span>
                      </>
                    ) : state.currentIndex < 2 ? (
                      <span>Next Challenge →</span>
                    ) : (
                      <span>Complete Strategy Challenge →</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* STEP 6 — FINAL STRATEGY REVIEW */}
      {state.status === 'complete' && state.finalReview && (
        <div className="space-y-6">
          <section className="bg-white border border-emerald-600/40 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-emerald-50/60 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Strategy Challenge Complete
                </h3>
              </div>

              <button
                type="button"
                onClick={handleResetChallenge}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Strategy Challenge</span>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-emerald-800">
                  STRONGEST PART OF MY STRATEGY
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {state.finalReview.strongestPart}
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-800">
                  BIGGEST ASSUMPTION
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {state.finalReview.biggestAssumption}
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-blue-800">
                  NEXT VALIDATION PRIORITY
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {state.finalReview.nextValidationPriority}
                </p>
              </div>
            </div>
          </section>

          {/* Saved Transcript of the 3 Challenges */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Completed Challenge Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All questions, your defences, and challenger feedback are saved in your browser.
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {state.questions.map((q, idx) => {
                const fb = state.feedbacks[idx];
                return (
                  <div key={idx} className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-blue-700">
                        Challenge {idx + 1} of 3
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{q.focusArea}</span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">{q.question}</p>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800">
                      <span className="font-semibold text-slate-900">Your Defence: </span>
                      {state.responses[idx]}
                    </div>

                    {fb && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                          <div className="font-bold text-emerald-800 mb-1">SUPPORTED</div>
                          <div className="text-slate-700">{fb.supported}</div>
                        </div>
                        <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg">
                          <div className="font-bold text-amber-800 mb-1">ASSUMPTION</div>
                          <div className="text-slate-700">{fb.assumption}</div>
                        </div>
                        <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                          <div className="font-bold text-blue-800 mb-1">
                            NEXT EVIDENCE NEEDED
                          </div>
                          <div className="text-slate-700">{fb.nextEvidenceNeeded}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
