// Ansible Infra CD logo: a git-style node graph wrapped in a circular "sync"
// arrow, on a rounded red tile, with an optional wordmark.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Ansible Infra CD" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="11" fill="#ee0000" />
      {/* sync ring (two arrows) */}
      <path d="M38 24a14 14 0 0 0-24.2-9.6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 24a14 14 0 0 0 24.2 9.6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M12.2 8.4v7.4h7.4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35.8 39.6v-7.4h-7.4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* config graph */}
      <path d="M24 19v10M24 24h6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="18" r="3" fill="#fff" />
      <circle cx="24" cy="30" r="3" fill="#fff" />
      <circle cx="31" cy="24" r="3" fill="#fff" />
    </svg>
  );
}

export default function Logo({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3, lineHeight: 1 }}>
      <LogoMark size={size} />
      {wordmark && (
        <span style={{ display: "inline-flex", flexDirection: "column", fontFamily: "var(--pf-t--global--font--family--heading, inherit)" }}>
          <span style={{ fontSize: size * 0.5, fontWeight: 700, letterSpacing: "0.01em" }}>Ansible</span>
          <span style={{ fontSize: size * 0.36, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.8 }}>Infra CD</span>
        </span>
      )}
    </span>
  );
}
