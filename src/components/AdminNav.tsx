import Link from "next/link";

const links = [
  { label: "Command Center", href: "/admin" },
  { label: "Player operations", href: "/admin/players" },
  { label: "Communications", href: "/admin/communications" },
  { label: "Reviews", href: "/admin/desks" },
  { label: "Coverage", href: "/admin/coverage" },
  { label: "System issues", href: "/admin/exceptions" },
];

export default function AdminNav() {
  return (
    <nav
      className="player-nav admin-nav"
      aria-label="Founder operations navigation"
      style={{
        background: "#151b21",
        borderColor: "#303942",
        color: "#eef2f5",
        boxShadow: "none",
      }}
    >
      {links.map((link) => (
        <Link href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
