import { Link } from "react-router-dom";
import { Alert, Bullseye, Content, EmptyState, EmptyStateBody, PageSection, Spinner, Title } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { Page, Repository, timeAgo } from "../api";
import { useApi } from "../components/useApi";
import StatusLabel from "../components/StatusLabel";

export default function Configs() {
  const { data, error, loading } = useApi<Page<Repository>>("/repositories/");

  return (
    <>
      <PageSection>
        <Title headingLevel="h1">Configs</Title>
        <Content component="p">Config-as-code repositories and their sync status against the platform.</Content>
      </PageSection>
      <PageSection>
        {loading && <Bullseye><Spinner aria-label="Loading" /></Bullseye>}
        {error && <Alert variant="danger" isInline title={error} />}
        {data && data.results.length === 0 && (
          <EmptyState titleText="No repositories yet" headingLevel="h4">
            <EmptyStateBody>Repositories you add will be listed here. Run <code>make seed</code> to load demo data.</EmptyStateBody>
          </EmptyState>
        )}
        {data && data.results.length > 0 && (
          <Table aria-label="Repositories">
            <Thead><Tr><Th>Name</Th><Th>Status</Th><Th>Branch</Th><Th>Last commit</Th><Th>Last sync</Th><Th>Detail</Th></Tr></Thead>
            <Tbody>
              {data.results.map((r) => (
                <Tr key={r.id}>
                  <Td dataLabel="Name"><Link to={`/configs/${r.id}`}>{r.name}</Link></Td>
                  <Td dataLabel="Status"><StatusLabel status={r.sync_status} /></Td>
                  <Td dataLabel="Branch">{r.branch}</Td>
                  <Td dataLabel="Last commit"><code>{r.last_commit.slice(0, 7) || "—"}</code></Td>
                  <Td dataLabel="Last sync">{timeAgo(r.last_synced_at)}</Td>
                  <Td dataLabel="Detail">{r.drift_summary || "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  );
}
