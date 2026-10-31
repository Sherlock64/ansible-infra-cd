import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert, Button, Card, CardBody, CardTitle, Checkbox, Content, Form, FormGroup, FormSelect, FormSelectOption,
  PageSection, TextInput, Title, ActionGroup, Label,
} from "@patternfly/react-core";
import { api, Page, Target, timeAgo } from "../api";

const EMPTY = { name: "", kind: "aap", url: "", verify_tls: true, token: "" };

export default function Settings() {
  const [target, setTarget] = useState<Target | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState<{ kind: "success" | "danger" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number>();

  useEffect(() => {
    api<Page<Target>>("/targets/").then((page) => {
      const t = page.results[0] ?? null;
      setTarget(t);
      if (t) setForm({ name: t.name, kind: t.kind, url: t.url, verify_tls: t.verify_tls, token: "" });
    });
    return () => window.clearInterval(pollRef.current);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    // An empty token field means "leave the stored token unchanged".
    const { token, ...rest } = form;
    const body = token ? form : rest;
    try {
      const saved = target
        ? await api<Target>(`/targets/${target.id}/`, { method: "PATCH", body })
        : await api<Target>("/targets/", { method: "POST", body });
      setTarget(saved);
      setForm((f) => ({ ...f, token: "" }));
      setMessage({ kind: "success", text: "Target saved." });
    } catch (e) {
      setMessage({ kind: "danger", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    if (!target) return;
    const before = target.last_ping_at;
    setMessage({ kind: "info", text: "Testing connection…" });
    await api(`/targets/${target.id}/test-connection/`, { method: "POST" });
    let tries = 0;
    window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      tries += 1;
      const t = await api<Target>(`/targets/${target.id}/`);
      if (t.last_ping_at !== before || tries > 20) {
        window.clearInterval(pollRef.current);
        setTarget(t);
        setMessage(
          t.last_ping_at === before
            ? { kind: "danger", text: "No result from the worker. Is the celery worker running?" }
            : { kind: t.last_ping_ok ? "success" : "danger", text: t.last_ping_message },
        );
      }
    }, 1000);
  }

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageSection>
        <Title headingLevel="h1">Settings</Title>
        <Content component="p">Connect the AAP or AWX instance that configuration is synced to.</Content>
      </PageSection>
      <PageSection>
        <Card style={{ maxWidth: 720 }}>
          <CardTitle>AAP / AWX target</CardTitle>
          <CardBody>
            {message && <Alert variant={message.kind} isInline title={message.text} style={{ marginBottom: 16 }} />}
            <Form onSubmit={save}>
              <FormGroup label="Name" isRequired fieldId="name">
                <TextInput id="name" value={form.name} onChange={(_, v) => set("name", v)} isRequired />
              </FormGroup>
              <FormGroup label="Type" fieldId="kind">
                <FormSelect id="kind" value={form.kind} onChange={(_, v) => set("kind", v)}>
                  <FormSelectOption value="aap" label="Ansible Automation Platform" />
                  <FormSelectOption value="awx" label="AWX" />
                </FormSelect>
              </FormGroup>
              <FormGroup label="URL" isRequired fieldId="url">
                <TextInput id="url" type="url" placeholder="https://aap.example.com" value={form.url} onChange={(_, v) => set("url", v)} isRequired />
              </FormGroup>
              <FormGroup label="API token" fieldId="token">
                <TextInput
                  id="token" type="password" autoComplete="off" value={form.token} onChange={(_, v) => set("token", v)}
                  placeholder={target?.token_set ? "Token is set (leave blank to keep)" : "Personal access token"}
                />
              </FormGroup>
              <Checkbox id="verify_tls" label="Verify TLS certificate" isChecked={form.verify_tls} onChange={(_, c) => set("verify_tls", c)} />
              <ActionGroup>
                <Button type="submit" isLoading={busy} isDisabled={busy}>{target ? "Save" : "Add target"}</Button>
                {target && <Button variant="secondary" onClick={testConnection}>Test connection</Button>}
                {target?.last_ping_at && (
                  <Label color={target.last_ping_ok ? "green" : "red"}>
                    {target.last_ping_ok ? "Reachable" : "Failed"} · {timeAgo(target.last_ping_at)}
                  </Label>
                )}
              </ActionGroup>
            </Form>
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
}
