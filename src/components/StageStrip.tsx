import { Lock, CheckCircle2 } from 'lucide-react';
import { STUDIO_STAGES } from '../data/ventures';
import { StageId, StudioStage } from '../types/venture';

interface StageStripProps {
  selectedStageId: StageId;
  onSelectStage: (stage: StudioStage) => void;
}

export function StageStrip({ selectedStageId, onSelectStage }: StageStripProps) {
  const activeStage = STUDIO_STAGES.find((s) => s.active) ?? STUDIO_STAGES[0];
  const viewedLockedStage = STUDIO_STAGES.find((s) => s.id === selectedStageId && !s.active);

  return (
    <section id="journey-stages" className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {activeStage.title}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              <span className="font-semibold text-slate-900">Mission:</span> {activeStage.mission}
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Venture Studio Journey Stages"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
        >
          {STUDIO_STAGES.map((stage) => {
            const isActive = stage.active;
            const isInspected = selectedStageId === stage.id;

            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={isInspected}
                onClick={() => onSelectStage(stage)}
                className={`text-left px-3.5 py-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                  isActive && isInspected
                    ? 'bg-blue-50/70 border-blue-600'
                    : isInspected
                      ? 'bg-slate-100/80 border-slate-300'
                      : isActive
                        ? 'bg-white border-slate-200 hover:border-blue-400'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className={`font-mono text-xs tabular-nums shrink-0 ${
                      isActive ? 'text-blue-700 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {stage.step}.
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isActive ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {stage.title}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Coming Next</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {viewedLockedStage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs sm:text-sm text-slate-700">
              <span className="font-semibold text-slate-900">
                {viewedLockedStage.step}. {viewedLockedStage.title}
              </span>
              <span className="mx-2 text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-600">
                Coming Next — Scheduled for a future entrepreneurship session.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectStage(activeStage)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Return to Stage 1
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
