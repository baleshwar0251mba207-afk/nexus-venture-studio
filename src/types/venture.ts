export type StageId =
  | 'competition-positioning'
  | 'revenue-pricing'
  | 'market-size-demand'
  | 'go-to-market';

export interface StudioStage {
  id: StageId;
  step: number;
  title: string;
  mission: string;
  active: boolean;
  statusLabel: 'Active' | 'Coming Next';
}

export interface Venture {
  id: string;
  index: number;
  name: string;
  targetCustomer: string;
  problem: string;
  geography: string;
  offer: string;
}

export type AlternativeType =
  | 'Direct Competitor'
  | 'Indirect Competitor'
  | 'Substitute'
  | 'Do Nothing';

export type EvidenceSourceType =
  | 'Website URL'
  | 'Product page'
  | 'Menu / price page'
  | 'App listing'
  | 'Review source'
  | 'Observation note'
  | 'Other relevant evidence';

export type EvidenceQuality = 'Strong' | 'Moderate' | 'Weak';

export interface CompetitorAlternative {
  id: string;
  name: string;
  type: AlternativeType | '';
  priceCost: string;
  priceNotApplicable: boolean;
  mainOffer: string;
  mainStrength: string;
  mainWeakness: string;
  evidenceType: EvidenceSourceType | '';
  evidenceSource: string;
  evidenceQuality: EvidenceQuality | '';
}

export interface CompetitionLabState {
  alternatives: CompetitorAlternative[];
  updatedAt: string;
}

export interface PositioningAxes {
  xName: string;
  xLeftLabel: string;
  xRightLabel: string;
  yName: string;
  yBottomLabel: string;
  yTopLabel: string;
}

export interface AxisScore {
  x: number | null;
  y: number | null;
}

export interface MarketBattlefieldState {
  axes: PositioningAxes;
  ventureScore: AxisScore;
  alternativeScores: Record<string, AxisScore>;
  updatedAt: string;
}

export interface PositioningStatementState {
  targetCustomer: string;
  category: string;
  primaryBenefit: string;
  mainAlternativeId: string;
  reasonToBelieve: string;
  statementText: string;
  savedStatement: string | null;
  savedAt: string | null;
  updatedAt: string;
}

export interface ChallengeQuestion {
  focusArea: string;
  question: string;
}

export interface ChallengeFeedback {
  supported: string;
  assumption: string;
  nextEvidenceNeeded: string;
}

export interface FinalStrategyReview {
  strongestPart: string;
  biggestAssumption: string;
  nextValidationPriority: string;
}

export interface AIStrategyChallengeState {
  status: 'idle' | 'in-progress' | 'complete';
  currentIndex: number;
  questions: ChallengeQuestion[];
  responses: string[];
  feedbacks: (ChallengeFeedback | null)[];
  finalReview: FinalStrategyReview | null;
  updatedAt: string;
}
