import './MemoryInbox.css';

function when(value?: string | null) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function relationLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

export function MemoryInbox({
  learner,
  dashboard,
  busy,
  onBack,
  onExport,
  onArchive,
  onRestore,
}: {
  learner: LearnerManifest;
  dashboard: Dashboard;
  busy: boolean;
  onBack: () => void;
  onExport: () => void;
  onArchive: (memoryId: string) => Promise<void>;
  onRestore: (memoryId: string) => Promise<void>;
}) {
  const active = dashboard.memoryInbox.filter((item) => item.active);
  const archived = dashboard.memoryInbox.filter((item) => !item.active);
  const nodeById = new Map(dashboard.memoryGraph.nodes.map((node) => [node.nodeId, node]));
  const visibleEdges = dashboard.memoryGraph.edges.slice(0, 16);
  const groupedNodes = dashboard.memoryGraph.nodes.reduce<Record<string, MemoryGraphNode[]>>((groups, node) => {
    (groups[node.kind] ||= []).push(node);
    return groups;
  }, {});

  return (
    <section className="memory-inbox-page">
      <div className="memory-inbox-header">
        <button className="back-button" onClick={onBack}>←</button>
        <div className="memory-inbox-title">
          <span className="eyebrow">PRIVATE LEARNER MEMORY</span>
          <h1>{learner.preferredName}&apos;s Memory Inbox</h1>
          <p>Review what MindCarry remembers, see how the local learning graph connects it, and download the complete encrypted record.</p>
        </div>
        <button className="primary" onClick={onExport}>⇩ Download complete memory</button>
      </div>

      <div className="memory-summary-grid">
        <article><span>Active memories</span><strong>{active.length}</strong><small>Used only when relevant to a lesson.</small></article>
        <article><span>Learning-map nodes</span><strong>{dashboard.memoryGraph.nodes.length}</strong><small>Skills, interests, sessions and evidence.</small></article>
        <article><span>Explained connections</span><strong>{dashboard.memoryGraph.edges.length}</strong><small>Each connection includes provenance.</small></article>
        <article><span>Portable package</span><strong>.childmind</strong><small>Graph and inbox remain inside encrypted local memory.</small></article>
      </div>

      <div className="memory-inbox-layout">
        <div className="memory-inbox-column">
          <div className="memory-section-heading">
            <div><span className="eyebrow">INBOX</span><h2>Evidence MindCarry can use</h2></div>
            <span className="memory-count">{active.length} active</span>
          </div>

          {active.length ? (
            <div className="memory-card-list">
              {active.map((item) => (
                <article className="memory-inbox-card" key={item.memoryId}>
                  <div className="memory-card-topline">
                    <span className={`memory-kind memory-kind-${item.type}`}>{item.type}</span>
                    <span>{Math.round(item.confidence * 100)}% confidence</span>
                  </div>
                  <p>{item.content}</p>
                  <div className="memory-evidence-row">
                    <span>{item.evidenceCount} evidence point{item.evidenceCount === 1 ? '' : 's'}</span>
                    <span>{item.graphEdgeCount} graph connection{item.graphEdgeCount === 1 ? '' : 's'}</span>
                    <span>Confirmed {when(item.lastConfirmed)}</span>
                  </div>
                  {item.sourceObjective && (
                    <div className="memory-source">
                      <strong>Source lesson</strong>
                      <span>{item.sourceObjective}</span>
                      {item.sourceSummary && <small>{item.sourceSummary}</small>}
                    </div>
                  )}
                  <button className="memory-archive-button" disabled={busy} onClick={() => void onArchive(item.memoryId)}>
                    Archive from future lessons
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-inline">Complete a lesson to create the first evidence-based memory.</div>
          )}

          {archived.length > 0 && (
            <details className="archived-memory-panel">
              <summary>{archived.length} archived memor{archived.length === 1 ? 'y' : 'ies'}</summary>
              <div className="memory-card-list compact">
                {archived.map((item) => (
                  <article className="memory-inbox-card archived" key={item.memoryId}>
                    <div className="memory-card-topline"><span className="memory-kind">{item.type}</span><span>Archived</span></div>
                    <p>{item.content}</p>
                    <button className="secondary" disabled={busy} onClick={() => void onRestore(item.memoryId)}>Restore to future lessons</button>
                  </article>
                ))}
              </div>
            </details>
          )}
        </div>

        <aside className="memory-map-column">
          <div className="memory-section-heading">
            <div><span className="eyebrow">LOCAL LEARNING MAP</span><h2>How the memory connects</h2></div>
            <span className="memory-version">Graph v{dashboard.memoryGraph.version}</span>
          </div>

          <div className="memory-node-groups">
            {Object.entries(groupedNodes).map(([kind, nodes]) => (
              <div className="memory-node-group" key={kind}>
                <strong>{kind}</strong>
                <div>{nodes.slice(0, 8).map((node) => <span key={node.nodeId} title={node.label}>{node.label}</span>)}</div>
              </div>
            ))}
          </div>

          <div className="memory-edge-list">
            {visibleEdges.map((edge) => (
              <div className="memory-edge" key={edge.edgeId}>
                <strong>{nodeById.get(edge.sourceNodeId)?.label || 'Memory'}</strong>
                <span>{relationLabel(edge.relation)}</span>
                <strong>{nodeById.get(edge.targetNodeId)?.label || 'Learning evidence'}</strong>
                <small className={`provenance provenance-${edge.provenance.toLowerCase()}`}>{edge.provenance}</small>
              </div>
            ))}
          </div>

          <div className="context-preview">
            <span className="eyebrow">AI CONTEXT PREVIEW</span>
            <h3>What a compatible tutor receives</h3>
            <p>MindCarry selects a small, relevant packet before the lesson. It does not send the complete learner database.</p>
            <pre>{dashboard.contextPacket.summaryText || 'No prior learning context is available yet.'}</pre>
          </div>
        </aside>
      </div>

      <div className="memory-local-note">
        <strong>Local and model-independent</strong>
        <span>The inbox, evidence ledger and graph are stored inside the encrypted learner database. Search indexes can be rebuilt; the canonical memory does not depend on one AI provider or embedding model.</span>
      </div>
    </section>
  );
}