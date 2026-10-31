import { FormEvent, useState } from "react";
import { Alert, Button, Content, Form, FormGroup, TextInput, Title } from "@patternfly/react-core";
import { CodeBranchIcon, SyncAltIcon, TachometerAltIcon } from "@patternfly/react-icons";
import { useAuth } from "../auth";
import Logo from "../components/Logo";
import { ThemeToggle } from "../theme";

const FEATURES = [
  { icon: <CodeBranchIcon />, text: "Config-as-code repos, tracked against your live platform" },
  { icon: <TachometerAltIcon />, text: "See at a glance what is synced and what has drifted" },
  { icon: <SyncAltIcon />, text: "Sync changes from Git to AAP/AWX with confidence" },
];

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aic-login">
      <aside className="aic-login__brand">
        <Logo size={48} />
        <Title headingLevel="h1" size="3xl" style={{ color: "inherit", margin: "48px 0 16px" }}>
          Continuous delivery for your automation platform
        </Title>
        <ul className="aic-login__features">
          {FEATURES.map((f) => (
            <li key={f.text}>
              <span>{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>
      </aside>

      <main className="aic-login__main">
        <div className="aic-login__theme">
          <ThemeToggle />
        </div>
        <div className="aic-login__card">
          <div className="aic-login__mobile-logo">
            <Logo size={40} />
          </div>
          <Title headingLevel="h2" size="2xl">
            Log in
          </Title>
          <Content component="p" style={{ margin: "4px 0 24px" }}>
            Use your Ansible Infra CD account to continue.
          </Content>
          {error && <Alert variant="danger" isInline isPlain title={error} style={{ marginBottom: 16 }} />}
          <Form onSubmit={submit}>
            <FormGroup label="Username" isRequired fieldId="username">
              <TextInput id="username" value={username} onChange={(_, v) => setUsername(v)} isRequired autoFocus autoComplete="username" />
            </FormGroup>
            <FormGroup label="Password" isRequired fieldId="password">
              <TextInput id="password" type="password" value={password} onChange={(_, v) => setPassword(v)} isRequired autoComplete="current-password" />
            </FormGroup>
            <Button type="submit" size="lg" isBlock isLoading={busy} isDisabled={busy}>
              Log in
            </Button>
          </Form>
        </div>
      </main>
    </div>
  );
}
