export {};

declare global {
  interface Window {
    mindcarry: {
      app: {
        status: () => Promise<AppStatus>;
        openDataFolder: () => Promise<{ ok: boolean }>;
      };
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
        cancel: (sessionId: string) => Promise<{ ok: boolean }>;
      };
    };
  }

  interface VaultStatus {
    ready: boolean;
    root: string;
    learners: string;
    exports: string;
    backups: string;
  }

  interface AppStatus {
    version: string;
    platform: string;
    provider: 'demo' | 'gemini';
    model: string;
    hasGeminiKey: boolean;
    secureStorageAvailable: boolean;
    vault: VaultStatus;
  }

  interface ProviderStatus {
    ok: boolean;
    provider: string;
    model?: string;
    message: string;
  }

  interface LearnerManifest {
    learnerId: string;
    preferredName: string;
    age: number | null;
    language: string | null;
    createdAt: string;
    updatedAt: string;
    metadataState: 'verified' | 'locked';
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

  interface LearnerProfile extends Record<string, unknown> {
    learner_id: string;
    preferred_name: string;
    age: number;
    preferred_language: string;
    interests: string[];
    parent_goal: string;
    created_at: string;
    updated_at: string;
  }

  interface ConsentRecord extends Record<string, number | string> {
    microphone_allowed: number;
    camera_allowed: number;
    local_behaviour_analysis_allowed: number;
    transcript_storage_allowed: number;
    raw_audio_storage_allowed: number;
    raw_video_storage_allowed: number;
  }

  interface SkillRecord extends Record<string, unknown> {
    skill_id: string;
    name: string;
    mastery: number;
    status: string;
  }

  interface SessionRecord extends Record<string, unknown> {
    session_id: string;
    objective: string;
    started_at: string;
    summary?: string;
  }

  interface MemoryRecord extends Record<string, unknown> {
    memory_id: string;
    type: string;
    content: string;
    confidence: number;
    evidence_count?: number;
  }

  interface Dashboard {
    profile: LearnerProfile;
    consent: ConsentRecord;
    skills: SkillRecord[];
    recentSessions: SessionRecord[];
    memories: MemoryRecord[];
  }

  interface LessonQuestion {
    id: string;
    skill: string;
    prompt: string;
    answer: number;
    representation: 'concrete' | 'pictorial' | 'transfer';
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
