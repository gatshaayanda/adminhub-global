import Link from "next/link";

const links = [
  { label: "Newsroom", href: "/admin" },
  { label: "Players", href: "/admin/players" },
  { label: "Communications", href: "/admin/communications" },
  { label: "Review pipeline", href: "/admin/desks" },
  { label: "Coverage editor", href: "/admin/coverage" },
  { label: "Exceptions", href: "/admin/exceptions" },
];

export default function AdminNav() {
  return (
    <nav
      className="player-nav admin-nav"
      aria-label="Founder Newsroom navigation"
      style={{
        background: "#0b1721",
        borderColor: "#243846",
        color: "#f2f6f8",
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
