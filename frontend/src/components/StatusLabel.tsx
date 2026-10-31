import { Label } from "@patternfly/react-core";
import { CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, QuestionCircleIcon } from "@patternfly/react-icons";
import type { SyncStatus } from "../api";

const MAP = {
  synced: { color: "green", text: "Synced", icon: <CheckCircleIcon /> },
  out_of_sync: { color: "orange", text: "Out of sync", icon: <ExclamationTriangleIcon /> },
  error: { color: "red", text: "Error", icon: <ExclamationCircleIcon /> },
  unknown: { color: "grey", text: "Unknown", icon: <QuestionCircleIcon /> },
} as const;

export default function StatusLabel({ status }: { status: SyncStatus }) {
  const { color, text, icon } = MAP[status];
  return (
    <Label color={color} icon={icon}>
      {text}
    </Label>
  );
}
