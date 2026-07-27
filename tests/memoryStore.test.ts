import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CatalogStore } = require('../electron/services/catalogStore.cjs');
const { MemoryStore } = require('../electron/services/learnerMemoryStore.cjs');
const { VaultManager } = require('../electron/services/vaultManager.cjs');
const temporaryRoots: string[] = [];

function createStore(root: string, keyByte: number) {
  const vault = new VaultManager(path.join(root, 'MindCarryVault'));
  vault.ensure();
  const deviceKey = Buffer.alloc(32, keyByte);
  const catalog = new CatalogStore({
    filePath: vault.catalogPath,
    getDeviceKey: () => Buffer.from(deviceKey),
    atomicWrite: (filePath: string, data: Buffer) => vault.atomicWrite(filePath, data),
  });
  return { vault, store: new MemoryStore(vault, catalog) };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('encrypted learner memory', () => {
  it('creates, graphs, archives, persists, exports and imports a learner', async () => {
    const firstRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mindcarry-store-a-'));
    const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mindcarry-store-b-'));
    temporaryRoots.push(firstRoot, secondRoot);

    const first = createStore(firstRoot, 3);
    await first.store.initialise();
    const manifest = await first.store.createLearner({
      preferredName: 'Aarav',
      age: 7,
      language: 'English',
      interests: ['dinosaurs'],
      parentGoal: 'Build confidence in maths.',
      passphrase: 'a-strong-parent-passphrase',
      consent: {
        microphoneAllowed: true,
        cameraAllowed: false,
        localBehaviourAnalysisAllowed: false,
        transcriptStorageAllowed: true,
        rawAudioStorageAllowed: false,
        rawVideoStorageAllowed: false,
      },
    });

    expect(first.store.listLearners()[0]?.preferredName).toBe('Aarav');
    const learnerPaths = first.vault.learnerPaths(manifest.learnerId);
    const publicManifest = JSON.parse(fs.readFileSync(learnerPaths.manifest, 'utf8'));
    expect(publicManifest.preferredName).toBeUndefined();
    expect(publicManifest.age).toBeUndefined();
    expect(fs.readFileSync(learnerPaths.database, 'utf8')).not.toContain('Aarav');

    await first.store.open(manifest.learnerId, 'a-strong-parent-passphrase');
    const initialDashboard = first.store.dashboard(manifest.learnerId);
    expect(initialDashboard.memoryGraph.nodes.some((node: { kind: string }) => node.kind === 'learner')).toBe(true);
    expect(initialDashboard.memoryGraph.nodes.some((node: { kind: string }) => node.kind === 'interest')).toBe(true);

    const { sessionId } = await first.store.startSession(manifest.learnerId);
    await first.store.recordAttempt(manifest.learnerId, {
      sessionId,
      questionId: 'add-7-5',
      prompt: 'What is 7 plus 5?',
      answerText: '12',
      correct: true,
      independent: true,
      usedHint: false,
      responseMs: 2500,
      misconception: null,
      intervention: 'transfer',
      reasoningObservation: 'Solved independently.',
      provider: 'deterministic',
    });
    const completed = await first.store.completeSession(manifest.learnerId, sessionId, {
      mastery: 82,
      summary: 'Aarav completed the transfer question independently.',
      nextRecommendation: 'Review counting on.',
      memories: [{ type: 'skill', content: 'Completed a transfer question independently.', confidence: 0.75 }],
    });

    expect(completed.memories).toHaveLength(1);
    expect(completed.memoryInbox).toHaveLength(1);
    expect(completed.memoryGraph.nodes.some((node: { kind: string }) => node.kind === 'memory')).toBe(true);
    expect(completed.memoryGraph.edges.some((edge: { relation: string }) => edge.relation === 'SHOWED_SKILL_EVIDENCE')).toBe(true);
    expect(completed.contextPacket.summaryText).toContain('Completed a transfer question independently.');

    const memoryId = completed.memoryInbox[0].memoryId;
    const archived = await first.store.archiveMemory(manifest.learnerId, memoryId);
    expect(archived.memoryInbox[0].active).toBe(false);
    expect(archived.contextPacket.relevantMemories).toHaveLength(0);
    const restoredDashboard = await first.store.restoreMemory(manifest.learnerId, memoryId);
    expect(restoredDashboard.memoryInbox[0].active).toBe(true);

    first.store.close(manifest.learnerId);
    await first.store.open(manifest.learnerId, 'a-strong-parent-passphrase');
    const reopened = first.store.dashboard(manifest.learnerId);
    expect(reopened.recentSessions).toHaveLength(1);
    expect(reopened.memoryGraph.nodes.some((node: { kind: string }) => node.kind === 'memory')).toBe(true);
    first.store.close(manifest.learnerId);

    const exported = path.join(firstRoot, 'Aarav.childmind');
    first.store.exportPackage(manifest.learnerId, exported);

    const second = createStore(secondRoot, 9);
    await second.store.initialise();
    const imported = await second.store.importPackage(exported);
    expect(imported.preferredName).toBe('Imported learner');
    await second.store.open(imported.learnerId, 'a-strong-parent-passphrase');
    const restored = second.store.dashboard(imported.learnerId);
    expect(restored.profile.preferred_name).toBe('Aarav');
    expect(restored.recentSessions).toHaveLength(1);
    expect(restored.memoryInbox).toHaveLength(1);
    expect(restored.memoryGraph.edges.length).toBeGreaterThan(0);
    expect(restored.contextPacket.summaryText).toContain('Completed a transfer question independently.');
    second.store.closeAll();
  }, 30_000);
});