import { Link, useParams } from "react-router-dom";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import {
  Alert, Breadcrumb, BreadcrumbItem, Bullseye, Card, CardBody, DescriptionList, DescriptionListDescription,
  DescriptionListGroup, DescriptionListTerm, Label, PageSection, Spinner, Title,
} from "@patternfly/react-core";
import { Repository, timeAgo } from "../api";
import { useApi } from "../components/useApi";
import StatusLabel from "../components/StatusLabel";
import { useTheme } from "../theme";
import { sampleEdges, sampleNodes, STATUS_STYLE } from "../sampleGraph";

export default function RepoDetail() {
  const { id } = useParams();
  const { theme } = useTheme();
  const { data: repo, error, loading } = useApi<Repository>(`/repositories/${id}/`);

  if (loading) return <Bullseye><Spinner aria-label="Loading" /></Bullseye>;
  if (error || !repo) return <PageSection><Alert variant="danger" isInline title={error || "Not found"} /></PageSection>;

  return (
    <>
      <PageSection>
        <Breadcrumb>
          <BreadcrumbItem><Link to="/configs">Configs</Link></BreadcrumbItem>
          <BreadcrumbItem isActive>{repo.name}</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" style={{ marginTop: 8 }}>{repo.name} <StatusLabel status={repo.sync_status} /></Title>
      </PageSection>
      <PageSection>
        <Card>
          <CardBody>
            <DescriptionList isHorizontal isCompact columnModifier={{ default: "2Col" }}>
              <DescriptionListGroup><DescriptionListTerm>Git URL</DescriptionListTerm><DescriptionListDescription>{repo.git_url}</DescriptionListDescription></DescriptionListGroup>
              <DescriptionListGroup><DescriptionListTerm>Branch</DescriptionListTerm><DescriptionListDescription>{repo.branch}</DescriptionListDescription></DescriptionListGroup>
              <DescriptionListGroup><DescriptionListTerm>Target</DescriptionListTerm><DescriptionListDescription>{repo.target_name}</DescriptionListDescription></DescriptionListGroup>
              <DescriptionListGroup><DescriptionListTerm>Last sync</DescriptionListTerm><DescriptionListDescription>{timeAgo(repo.last_synced_at)}</DescriptionListDescription></DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </PageSection>
      <PageSection>
        <Card>
          <CardBody>
            <Alert variant="info" isInline isPlain title="Placeholder data" style={{ marginBottom: 12 }}>
              This dependency flowchart shows fake sample data. It will be generated from the repository&apos;s configuration.
            </Alert>
            <div style={{ marginBottom: 8 }}>
              {(Object.keys(STATUS_STYLE) as (keyof typeof STATUS_STYLE)[]).map((s) => (
                <Label key={s} style={{ marginRight: 8, borderColor: STATUS_STYLE[s].border }} variant="outline">{s}</Label>
              ))}
            </div>
            <div style={{ height: 520 }}>
              <ReactFlow colorMode={theme} nodes={sampleNodes} edges={sampleEdges} fitView nodesDraggable={false} nodesConnectable={false}>
                <Background />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
}
