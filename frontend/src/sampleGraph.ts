// PLACEHOLDER: fake dependency graph for the repo-detail page.
// The real graph will be generated from the repo's config-as-code files
// compared against live AAP/AWX state (see PROJECT_STARTER_README.md).
import type { Edge, Node } from "@xyflow/react";

export type ObjStatus = "synced" | "drifted" | "missing" | "error";

export const STATUS_STYLE: Record<ObjStatus, { bg: string; border: string }> = {
  synced: { bg: "#e9f7df", border: "#3e8635" },
  drifted: { bg: "#fdf7e7", border: "#f0ab00" },
  missing: { bg: "#e7f1fa", border: "#06c" },
  error: { bg: "#faeae8", border: "#c9190b" },
};

const col = (i: number) => i * 230;
const row = (i: number) => i * 80;

const defs: [string, string, ObjStatus, number, number][] = [
  ["org", "Organization: Platform", "synced", 0, 1.5],
  ["team", "Team: SRE", "synced", 1, 0],
  ["cred", "Credential: git-readonly", "synced", 1, 1],
  ["inv", "Inventory: prod-hosts", "drifted", 1, 2],
  ["proj", "Project: infra-playbooks", "synced", 2, 1],
  ["jt1", "Job Template: patch-linux", "drifted", 3, 0],
  ["jt2", "Job Template: deploy-app", "missing", 3, 1.5],
  ["jt3", "Job Template: rotate-certs", "error", 3, 3],
  ["wf", "Workflow: release-pipeline", "missing", 4, 1.5],
];

export const sampleNodes: Node[] = defs.map(([id, label, status, c, r]) => ({
  id,
  position: { x: col(c), y: row(r) },
  data: { label: `${label}\n(${status})` },
  style: {
    background: STATUS_STYLE[status].bg,
    border: `2px solid ${STATUS_STYLE[status].border}`,
    borderRadius: 8,
    color: "#151515",
    width: 200,
    whiteSpace: "pre-line",
    fontSize: 12,
  },
}));

export const sampleEdges: Edge[] = [
  ["org", "team"], ["org", "cred"], ["org", "inv"], ["cred", "proj"], ["proj", "jt1"], ["inv", "jt1"],
  ["proj", "jt2"], ["inv", "jt2"], ["proj", "jt3"], ["jt2", "wf"], ["jt1", "wf"],
].map(([source, target]) => ({ id: `${source}-${target}`, source, target, animated: false }));
