import {
  AIStrategyChallengeState,
  AlternativeType,
  CompetitionLabState,
  CompetitorAlternative,
  EvidenceQuality,
  EvidenceSourceType,
  MarketBattlefieldState,
  PositioningStatementState,
  StudioStage,
  Venture,
} from '../types/venture';

export const STUDIO_STAGES: StudioStage[] = [
  {
    id: 'competition-positioning',
    step: 1,
    title: 'Competition & Positioning',
    mission: 'Understand the competitive battlefield and build a defendable market position.',
    active: true,
    statusLabel: 'Active',
  },
  {
    id: 'revenue-pricing',
    step: 2,
    title: 'Revenue & Pricing',
    mission: 'Design unit economics, pricing tiers, and break-even scenarios.',
    active: false,
    statusLabel: 'Coming Next',
  },
  {
    id: 'market-size-demand',
    step: 3,
    title: 'Market Size & Demand',
    mission: 'Quantify TAM, SAM, and SOM with grounded customer evidence.',
    active: false,
    statusLabel: 'Coming Next',
  },
  {
    id: 'go-to-market',
    step: 4,
    title: 'Go-to-Market',
    mission: 'Plan first-customer channels and 30-day acquisition experiments.',
    active: false,
    statusLabel: 'Coming Next',
  },
];

export const VENTURE_BANK: Venture[] = [
  {
    id: 'healthy-tiffin-subscription',
    index: 1,
    name: 'Healthy Tiffin Subscription',
    targetCustomer: 'College students and young professionals',
    problem: 'Affordable and healthier daily meals',
    geography: 'Dehradun / Selaqui',
    offer: 'Subscription-based healthy meals',
  },
  {
    id: 'student-laundry-pickup',
    index: 2,
    name: 'Student Laundry Pickup',
    targetCustomer: 'Hostel students',
    problem: 'Laundry inconvenience and lack of time',
    geography: 'University campuses',
    offer: 'Pickup, wash, iron and delivery service',
  },
  {
    id: 'campus-event-marketplace',
    index: 3,
    name: 'Campus Event Marketplace',
    targetCustomer: 'Students, clubs and campus societies',
    problem: 'Difficulty discovering, promoting and managing campus events',
    geography: 'Dehradun university campuses',
    offer: 'Event discovery, registration and organizer tools',
  },
  {
    id: 'local-logistics-aggregator',
    index: 4,
    name: 'Local Logistics Aggregator',
    targetCustomer: 'Small retailers and local businesses',
    problem: 'Reliable and affordable local deliveries',
    geography: 'Dehradun',
    offer: 'On-demand local delivery network',
  },
  {
    id: 'budget-formalwear-rental',
    index: 5,
    name: 'Budget Formalwear Rental',
    targetCustomer: 'College students and fresh graduates',
    problem: 'High cost of formal clothing for interviews and events',
    geography: 'Dehradun',
    offer: 'Affordable rental of suits, blazers and formalwear',
  },
  {
    id: 'home-services-platform',
    index: 6,
    name: 'Home Services Platform',
    targetCustomer: 'Urban households',
    problem: 'Difficulty finding reliable local service providers',
    geography: 'Dehradun',
    offer: 'Verified plumbers, electricians, cleaners and technicians',
  },
  {
    id: 'regional-snack-d2c-brand',
    index: 7,
    name: 'Regional Snack D2C Brand',
    targetCustomer: 'Young consumers',
    problem: 'Limited access to authentic regional snacks in modern packaging',
    geography: 'North India',
    offer: 'Packaged regional snacks sold directly to consumers',
  },
  {
    id: 'student-financial-planner',
    index: 8,
    name: 'Student Financial Planner',
    targetCustomer: 'College students',
    problem: 'Poor budgeting and personal money management',
    geography: 'India',
    offer: 'Simple budgeting, saving and financial-planning tools',
  },
  {
    id: 'weekend-tourism-planner',
    index: 9,
    name: 'Weekend Tourism Planner',
    targetCustomer: 'Students and young professionals',
    problem: 'Difficulty planning affordable short trips',
    geography: 'Uttarakhand',
    offer: 'Curated weekend itineraries, budgets and local recommendations',
  },
  {
    id: 'ai-interview-coach',
    index: 10,
    name: 'AI Interview Coach',
    targetCustomer: 'Final-year students and job seekers',
    problem: 'Lack of affordable interview practice and structured feedback',
    geography: 'India',
    offer: 'AI-assisted interview practice and feedback',
  },
];

export const ALTERNATIVE_TYPES: AlternativeType[] = [
  'Direct Competitor',
  'Indirect Competitor',
  'Substitute',
  'Do Nothing',
];

export const EVIDENCE_SOURCE_TYPES: EvidenceSourceType[] = [
  'Website URL',
  'Product page',
  'Menu / price page',
  'App listing',
  'Review source',
  'Observation note',
  'Other relevant evidence',
];

export const EVIDENCE_QUALITY_OPTIONS: {
  value: EvidenceQuality;
  explanation: string;
}[] = [
  {
    value: 'Strong',
    explanation: 'directly supported by a reliable current source',
  },
  {
    value: 'Moderate',
    explanation: 'supported, but the evidence is indirect or incomplete',
  },
  {
    value: 'Weak',
    explanation: 'assumption, informal observation or evidence that still needs validation',
  },
];

export function createBlankAlternative(index: number): CompetitorAlternative {
  return {
    id: `alt-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    type: '',
    priceCost: '',
    priceNotApplicable: false,
    mainOffer: '',
    mainStrength: '',
    mainWeakness: '',
    evidenceType: '',
    evidenceSource: '',
    evidenceQuality: '',
  };
}

export function createDefaultLabState(): CompetitionLabState {
  return {
    alternatives: [
      createBlankAlternative(1),
      createBlankAlternative(2),
      createBlankAlternative(3),
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultBattlefieldState(): MarketBattlefieldState {
  return {
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
  };
}

export function formatPositioningStatement(
  ventureName: string,
  targetCustomer: string,
  category: string,
  primaryBenefit: string,
  mainAlternativeName: string,
  reasonToBelieve: string
): string {
  const tc = targetCustomer.trim() || '[Target Customer]';
  const cat = category.trim() || '[Category / Type of Solution]';
  const ben = primaryBenefit.trim() || '[Primary Benefit]';
  const alt = mainAlternativeName.trim() || '[Main Alternative]';
  const rtb = reasonToBelieve.trim() || '[Reason to Believe]';

  return `For ${tc}, ${ventureName} is a ${cat} that provides ${ben}, unlike ${alt}, because ${rtb}.`;
}

export function createDefaultPositioningState(venture: Venture): PositioningStatementState {
  const initialStatement = formatPositioningStatement(
    venture.name,
    venture.targetCustomer,
    '',
    '',
    '',
    ''
  );
  return {
    targetCustomer: venture.targetCustomer,
    category: '',
    primaryBenefit: '',
    mainAlternativeId: '',
    reasonToBelieve: '',
    statementText: initialStatement,
    savedStatement: null,
    savedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function areAxesDefined(axes: MarketBattlefieldState['axes']): boolean {
  return Boolean(
    axes.xName.trim() &&
      axes.xLeftLabel.trim() &&
      axes.xRightLabel.trim() &&
      axes.yName.trim() &&
      axes.yBottomLabel.trim() &&
      axes.yTopLabel.trim()
  );
}

export function isAlternativeCompleted(alt: CompetitorAlternative): boolean {
  return Boolean(
    alt.name.trim() &&
      alt.type &&
      alt.mainOffer.trim() &&
      alt.mainStrength.trim() &&
      alt.mainWeakness.trim() &&
      alt.evidenceSource.trim() &&
      alt.evidenceQuality
  );
}

export function isAlternativeStarted(alt: CompetitorAlternative): boolean {
  return Boolean(
    alt.name.trim() ||
      alt.type ||
      alt.priceCost.trim() ||
      alt.priceNotApplicable ||
      alt.mainOffer.trim() ||
      alt.mainStrength.trim() ||
      alt.mainWeakness.trim() ||
      alt.evidenceType ||
      alt.evidenceSource.trim() ||
      alt.evidenceQuality
  );
}

export function isBattlefieldComplete(
  battlefieldState: MarketBattlefieldState,
  completedAlternatives: CompetitorAlternative[]
): boolean {
  if (completedAlternatives.length < 3) return false;
  if (!areAxesDefined(battlefieldState.axes)) return false;
  if (
    battlefieldState.ventureScore.x === null ||
    battlefieldState.ventureScore.y === null
  ) {
    return false;
  }
  return completedAlternatives.every((alt) => {
    const score = battlefieldState.alternativeScores[alt.id];
    return score && score.x !== null && score.y !== null;
  });
}

export function isPositioningComponentsComplete(
  state: PositioningStatementState,
  completedAlternatives: CompetitorAlternative[]
): boolean {
  const validAlt = completedAlternatives.some((a) => a.id === state.mainAlternativeId);
  return Boolean(
    state.targetCustomer.trim() &&
      state.category.trim() &&
      state.primaryBenefit.trim() &&
      validAlt &&
      state.reasonToBelieve.trim() &&
      state.statementText.trim()
  );
}

export function createDefaultChallengeState(): AIStrategyChallengeState {
  return {
    status: 'idle',
    currentIndex: 0,
    questions: [],
    responses: ['', '', ''],
    feedbacks: [null, null, null],
    finalReview: null,
    updatedAt: new Date().toISOString(),
  };
}
