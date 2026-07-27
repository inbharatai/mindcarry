export {};

declare global {
  interface Window {
    mindcarry: {
      app: { status: () => Promise<AppStatus> };
      settings: {
        setGeminiKey: (apiKey: string) => Promise<ProviderStatus>;
        removeGeminiKey: () => Promise<{ ok: boolean }>;
        testProvider: () => Promise<ProviderStatus>;
      };
      learners: {
        list: () => Promise<LearnerManifest[]>;
        create: (payload: CreateLearnerPayload) => Promise<LearnerManifest>;
        unlock: (learnerId: string, passphrase: string) => Promise<Dashboard>;
        dashboard: (learnerId: string) => Promise<Dashboard>;
        lock: (learnerId: string) => Promise<{ ok: boolean }>;
        export: (learnerId: string) => Promise<{ canceled: boolean; filePath?: string }>;
        import: () => Promise<{ canceled: boolean; manifest?: LearnerManifest }>;
      };
      lessons: {
        start: (learnerId: string) => Promise<LessonStart>;
        answer: (payload: LessonAnswerPayload) => Promise<LessonReply>;
      };
    };
  }

  interface AppStatus {
    version: string;
    platform: string;
    provider: 'demo' | 'gemini';
    hasGeminiKey: boolean;
    secureStorageAvailable: boolean;
    dataRoot: string;
  }

  interface ProviderStatus {
    ok: boolean;
    provider: string;
    model?: string;
    message: string;
  }

  interface LearnerManifest {
    schemaVersion: number;
    learnerId: string;
    preferredName: string;
    age: number;
    language: string;
    createdAt: string;
    updatedAt: string;
  }

  interface CreateLearnerPayload {
    preferredName: string;
    age: number;
    language: string;
    interests: string[];
    parentGoal: string;
    passphrase: string;
    consent: {
      microphoneAllowed: boolean;
      cameraAllowed: boolean;
      localBehaviourAnalysisAllowed: boolean;
      transcriptStorageAllowed: boolean;
      rawAudioStorageAllowed: boolean;
      rawVideoStorageAllowed: boolean;
    };
  }

  interface Dashboard {
    profile: Record<string, unknown> & {
      learner_id: string;
      preferred_name: string;
      age: number;
      preferred_language: string;
      interests: string[];
      parent_goal: string;
    };
    consent: Record<string, number | string>;
    skills: Array<Record<string, unknown> & { skill_id: string; name: string; mastery: number; status: string }>;
    recentSessions: Array<Record<string, unknown> & { session_id: string; started_at: string; summary?: string }>;
    memories: Array<Record<string, unknown> & { memory_id: string; type: string; content: string; confidence: number }>;
  }

  interface LessonQuestion {
    id: string;
    skill: string;
    prompt: string;
    answer: number;
    visual: string;
  }

  interface LessonStart {
    sessionId: string;
    question: LessonQuestion;
    greeting: string;
  }

  interface LessonAnswerPayload {
    sessionId: string;
    answer: string;
    reasoning?: string;
    responseMs: number;
    usedHint: boolean;
    movementLevel?: number;
  }

  interface LessonReply {
    completed: boolean;
    assessment: {
      correct: boolean;
      independent: boolean;
      misconception?: string | null;
    };
    explanation: string;
    question?: LessonQuestion;
    visual?: string | null;
    mastery?: number;
    dashboard?: Dashboard;
  }
}
