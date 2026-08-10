import Link from "next/link";

const links = [
  { label: "My Room", href: "/app" },
  { label: "Latest Desk", href: "/app/desk/week-001" },
  { label: "Archive", href: "/app/archive" },
  { label: "My Feed", href: "/app/feed" },
  { label: "Profile", href: "/app/profile" },
];

export default function PlayerNav() {
  return <nav className="player-nav" aria-label="Player Room navigation">{links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</nav>;
}
