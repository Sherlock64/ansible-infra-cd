import { useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  Bullseye,
  Dropdown,
  DropdownItem,
  DropdownList,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  MenuToggle,
  Nav,
  NavItem,
  NavList,
  Page,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { BarsIcon, CogIcon, CodeBranchIcon, TachometerAltIcon } from "@patternfly/react-icons";
import { useAuth } from "./auth";
import Logo from "./components/Logo";
import { ThemeToggle } from "./theme";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Configs from "./pages/Configs";
import RepoDetail from "./pages/RepoDetail";
import Settings from "./pages/Settings";

const NAV = [
  { to: "/", label: "Overview", icon: <TachometerAltIcon />, match: (p: string) => p === "/" },
  { to: "/configs", label: "Configs", icon: <CodeBranchIcon />, match: (p: string) => p.startsWith("/configs") },
  { to: "/settings", label: "Settings", icon: <CogIcon />, match: (p: string) => p.startsWith("/settings") },
];

export default function App() {
  const { loading, session, logout } = useAuth();
  const { pathname } = useLocation();
  const [userOpen, setUserOpen] = useState(false);

  if (loading) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading" />
      </Bullseye>
    );
  }
  if (!session.authenticated) return <Login />;

  const masthead = (
    <Masthead className="aic-dark">
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label="Global navigation">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <MastheadLogo component={(props) => <Link to="/" {...props} />}>
            <Logo size={32} />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight isStatic>
          <ToolbarContent>
            <ToolbarGroup align={{ default: "alignEnd" }}>
              <ToolbarItem>
                <ThemeToggle />
              </ToolbarItem>
              <ToolbarItem>
                <Dropdown
                  isOpen={userOpen}
                  onOpenChange={setUserOpen}
                  popperProps={{ position: "right" }}
                  toggle={(ref) => (
                    <MenuToggle ref={ref} variant="plainText" onClick={() => setUserOpen((o) => !o)} isExpanded={userOpen}>
                      {session.user?.username}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem onClick={() => logout()}>Log out</DropdownItem>
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );

  const sidebar = (
    <PageSidebar className="aic-dark">
      <PageSidebarBody>
        <Nav aria-label="Primary">
          <NavList>
            {NAV.map((item) => (
              <NavItem key={item.to} isActive={item.match(pathname)}>
                <Link to={item.to}>
                  {item.icon} {item.label}
                </Link>
              </NavItem>
            ))}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page masthead={masthead} sidebar={sidebar} isManagedSidebar>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/configs" element={<Configs />} />
        <Route path="/configs/:id" element={<RepoDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Page>
  );
}
