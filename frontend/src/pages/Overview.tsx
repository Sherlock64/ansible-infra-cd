import { Link } from "react-router-dom";
import {
  Alert, Bullseye, Card, CardBody, CardTitle, Content, DataList, DataListCell, DataListItem, DataListItemCells,
  DataListItemRow, EmptyState, EmptyStateBody, Grid, GridItem, Label, PageSection, Spinner, Title,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { Overview as OverviewData, SyncRun, timeAgo } from "../api";
import { useApi } from "../components/useApi";
import StatusLabel from "../components/StatusLabel";
import SyncChart from "../components/SyncChart";

const HEALTH = {
  healthy: { color: "green", text: "Healthy" },
  degraded: { color: "orange", text: "Degraded" },
  error: { color: "red", text: "Error" },
  unknown: { color: "grey", text: "No data" },
} as const;

const RUN_COLOR: Record<SyncRun["status"], "green" | "red" | "blue" | "grey"> = {
  success: "green", failed: "red", running: "blue", pending: "grey",
};

function Stat({ title, value, sub }: { title: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card isFullHeight>
      <CardTitle>{title}</CardTitle>
      <CardBody>
        <Title headingLevel="h3" size="3xl">{value}</Title>
        {sub && <Content component="small">{sub}</Content>}
      </CardBody>
    </Card>
  );
}

export default function Overview() {
  const { data, error, loading } = useApi<OverviewData>("/overview/");

  if (loading) return <Bullseye><Spinner aria-label="Loading" /></Bullseye>;
  if (error || !data) return <PageSection><Alert variant="danger" isInline title={`Could not load overview: ${error}`} /></PageSection>;

  const health = HEALTH[data.health];
  return (
    <>
      <PageSection>
        <Title headingLevel="h1">Overview</Title>
        <Content component="p">
          {data.target ? `Target: ${data.target.name} (${data.target.url})` : "No AAP/AWX target configured yet."}
        </Content>
      </PageSection>
      <PageSection>
        {!data.target && (
          <Alert variant="info" isInline title="No target configured" style={{ marginBottom: 16 }}>
            Add your AAP/AWX instance on the <Link to="/settings">Settings</Link> page, or run <code>make seed</code> for demo data.
          </Alert>
        )}
        <Grid hasGutter>
          <GridItem sm={6} lg={3}><Stat title="Global health" value={<Label color={health.color} isCompact={false}>{health.text}</Label>} /></GridItem>
          <GridItem sm={6} lg={3}><Stat title="Repositories" value={data.totals.repositories} sub={`${data.totals.synced} synced`} /></GridItem>
          <GridItem sm={6} lg={3}><Stat title="Out of sync" value={data.totals.out_of_sync + data.totals.error} sub={`${data.totals.error} with errors`} /></GridItem>
          <GridItem sm={6} lg={3}><Stat title="Avg sync time" value={data.avg_sync_seconds === null ? "—" : `${data.avg_sync_seconds}s`} sub="last 7 days" /></GridItem>

          <GridItem lg={8}>
            <Card isFullHeight>
              <CardTitle>Sync success rate (last 7 days)</CardTitle>
              <CardBody><SyncChart points={data.success_rate_7d} /></CardBody>
            </Card>
          </GridItem>
          <GridItem lg={4} rowSpan={2}>
            <Card isFullHeight>
              <CardTitle>Latest sync activity</CardTitle>
              <CardBody>
                {data.activity.length === 0 ? <Content component="small">No sync runs yet.</Content> : (
                  <DataList aria-label="Sync activity" isCompact>
                    {data.activity.map((run) => (
                      <DataListItem key={run.id}>
                        <DataListItemRow>
                          <DataListItemCells dataListCells={[
                            <DataListCell key="a"><strong>{run.repository_name}</strong><br /><small>{run.summary}</small></DataListCell>,
                            <DataListCell key="b" width={2}><Label color={RUN_COLOR[run.status]} isCompact>{run.status}</Label><br /><small>{timeAgo(run.started_at)}</small></DataListCell>,
                          ]} />
                        </DataListItemRow>
                      </DataListItem>
                    ))}
                  </DataList>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem lg={8}>
            <Card>
              <CardTitle>Needs attention</CardTitle>
              <CardBody>
                {data.needs_attention.length === 0 ? (
                  <EmptyState titleText="Everything is in sync" headingLevel="h4" status="success">
                    <EmptyStateBody>No repositories have drifted from the platform.</EmptyStateBody>
                  </EmptyState>
                ) : (
                  <Table aria-label="Repositories needing attention" variant="compact">
                    <Thead><Tr><Th>Repository</Th><Th>Status</Th><Th>Detail</Th><Th>Last sync</Th></Tr></Thead>
                    <Tbody>
                      {data.needs_attention.map((r) => (
                        <Tr key={r.id}>
                          <Td><Link to={`/configs/${r.id}`}>{r.name}</Link></Td>
                          <Td><StatusLabel status={r.sync_status} /></Td>
                          <Td>{r.drift_summary || "—"}</Td>
                          <Td>{timeAgo(r.last_synced_at)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem lg={12}>
            <Card>
              <CardTitle>System</CardTitle>
              <CardBody>
                {Object.entries(data.system.checks).map(([name, ok]) => (
                  <Label key={name} color={ok ? "green" : "red"} style={{ marginRight: 8 }}>{name}: {ok ? "ok" : "down"}</Label>
                ))}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
}
