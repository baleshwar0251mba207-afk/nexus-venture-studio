import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { StageStrip } from './components/StageStrip';
import { VentureBank } from './components/VentureBank';
import { VentureProfile } from './components/VentureProfile';
import { CompetitionLab } from './components/CompetitionLab';
import {
  VENTURE_BANK,
  createDefaultBattlefieldState,
  createDefaultChallengeState,
  createDefaultLabState,
  createDefaultPositioningState,
} from './data/ventures';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  AIStrategyChallengeState,
  CompetitionLabState,
  MarketBattlefieldState,
  PositioningStatementState,
  StageId,
  StudioStage,
  Venture,
} from './types/venture';

const SELECTED_VENTURE_STORAGE_KEY = 'nexus_selected_venture_id';
const COMPETITION_LAB_STORAGE_KEY = 'nexus_competition_lab_v1';
const MARKET_BATTLEFIELD_STORAGE_KEY = 'nexus_market_battlefield_v1';
const POSITIONING_STATEMENT_STORAGE_KEY = 'nexus_positioning_statement_v1';
const AI_STRATEGY_CHALLENGE_STORAGE_KEY = 'nexus_ai_strategy_challenge_v1';
const ACTIVE_VIEW_STORAGE_KEY = 'nexus_active_view_v1';

export default function App() {
  const [selectedVentureId, setSelectedVentureId] = useLocalStorage<string | null>(
    SELECTED_VENTURE_STORAGE_KEY,
    null
  );
  const [labStates, setLabStates] = useLocalStorage<
    Record<string, CompetitionLabState>
  >(COMPETITION_LAB_STORAGE_KEY, {});
  const [battlefieldStates, setBattlefieldStates] = useLocalStorage<
    Record<string, MarketBattlefieldState>
  >(MARKET_BATTLEFIELD_STORAGE_KEY, {});
  const [positioningStates, setPositioningStates] = useLocalStorage<
    Record<string, PositioningStatementState>
  >(POSITIONING_STATEMENT_STORAGE_KEY, {});
  const [challengeStates, setChallengeStates] = useLocalStorage<
    Record<string, AIStrategyChallengeState>
  >(AI_STRATEGY_CHALLENGE_STORAGE_KEY, {});
  const [activeView, setActiveView] = useLocalStorage<'venture-bank' | 'competition-lab'>(
    ACTIVE_VIEW_STORAGE_KEY,
    'venture-bank'
  );
  const [selectedStageId, setSelectedStageId] = useState<StageId>('competition-positioning');

  const selectedVenture = useMemo(
    () => VENTURE_BANK.find((v) => v.id === selectedVentureId) ?? null,
    [selectedVentureId]
  );

  const activeLabState = useMemo(() => {
    if (!selectedVenture) return null;
    return labStates[selectedVenture.id] ?? createDefaultLabState();
  }, [selectedVenture, labStates]);

  const activeBattlefieldState = useMemo(() => {
    if (!selectedVenture) return null;
    return battlefieldStates[selectedVenture.id] ?? createDefaultBattlefieldState();
  }, [selectedVenture, battlefieldStates]);

  const activePositioningState = useMemo(() => {
    if (!selectedVenture) return null;
    return positioningStates[selectedVenture.id] ?? createDefaultPositioningState(selectedVenture);
  }, [selectedVenture, positioningStates]);

  const activeChallengeState = useMemo(() => {
    if (!selectedVenture) return null;
    return challengeStates[selectedVenture.id] ?? createDefaultChallengeState();
  }, [selectedVenture, challengeStates]);

  const handleSelectVenture = (venture: Venture) => {
    setSelectedVentureId(venture.id);
    setSelectedStageId('competition-positioning');
  };

  const handleClearSelection = () => {
    setSelectedVentureId(null);
    setActiveView('venture-bank');
  };

  const handleSelectStage = (stage: StudioStage) => {
    setSelectedStageId(stage.id);
  };

  const handleChangeLabState = (next: CompetitionLabState) => {
    if (!selectedVenture) return;
    setLabStates((prev) => ({
      ...prev,
      [selectedVenture.id]: next,
    }));
  };

  const handleChangeBattlefieldState = (next: MarketBattlefieldState) => {
    if (!selectedVenture) return;
    setBattlefieldStates((prev) => ({
      ...prev,
      [selectedVenture.id]: next,
    }));
  };

  const handleChangePositioningState = (next: PositioningStatementState) => {
    if (!selectedVenture) return;
    setPositioningStates((prev) => ({
      ...prev,
      [selectedVenture.id]: next,
    }));
  };

  const handleChangeChallengeState = (next: AIStrategyChallengeState) => {
    if (!selectedVenture) return;
    setChallengeStates((prev) => ({
      ...prev,
      [selectedVenture.id]: next,
    }));
  };

  const effectiveView = selectedVenture ? activeView : 'venture-bank';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header
        selectedVenture={selectedVenture}
        activeView={effectiveView}
        onBackToBank={() => setActiveView('venture-bank')}
        onClearSelection={handleClearSelection}
      />

      <StageStrip selectedStageId={selectedStageId} onSelectStage={handleSelectStage} />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {effectiveView === 'venture-bank' || !selectedVenture ? (
          <>
            {selectedVenture && (
              <VentureProfile
                venture={selectedVenture}
                onContinueToLab={() => setActiveView('competition-lab')}
              />
            )}

            <VentureBank
              selectedVentureId={selectedVenture?.id ?? null}
              onSelectVenture={handleSelectVenture}
            />
          </>
        ) : (
          activeLabState &&
          activeBattlefieldState &&
          activePositioningState &&
          activeChallengeState && (
            <CompetitionLab
              venture={selectedVenture}
              labState={activeLabState}
              battlefieldState={activeBattlefieldState}
              positioningState={activePositioningState}
              challengeState={activeChallengeState}
              onChangeLabState={handleChangeLabState}
              onChangeBattlefieldState={handleChangeBattlefieldState}
              onChangePositioningState={handleChangePositioningState}
              onChangeChallengeState={handleChangeChallengeState}
              onBackToVentureBank={() => setActiveView('venture-bank')}
              onConfirmSwitchVenture={() => {
                setSelectedVentureId(null);
                setActiveView('venture-bank');
              }}
            />
          )
        )}
      </main>
    </div>
  );
}
