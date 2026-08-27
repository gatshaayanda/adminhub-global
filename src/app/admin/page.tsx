import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import FounderOperationsConsole from "@/components/FounderOperationsConsole";
import FounderNewsroomSummary from "@/components/FounderNewsroomSummary";
import FounderTrafficAnalytics from "@/components/FounderTrafficAnalytics";
import styles from "@/components/FounderCommandCenter.module.css";

export default function AdminHomePage() {
  return (
    <main className={`admin-dashboard admin-dashboard-newsroom ${styles.page}`}>
      <AdminNav />
      <section className="founder-newsroom-v2">
        <FounderOperationsConsole />

        <section id="founder-workspace-newsroom" className={styles.secondaryWorkspace} aria-label="Founder Newsroom workspace">
          <div className={styles.secondaryWorkspaceHeader}>
            <span>06.2 // NEWSROOM WORKSPACE</span>
            <p>Editorial and delivery detail stays lazy until this workspace is opened.</p>
          </div>
          <FounderNewsroomSummary />
        </section>

        <section id="founder-workspace-traffic" className={styles.secondaryWorkspace} aria-label="Founder Traffic workspace">
          <div className={styles.secondaryWorkspaceHeader}>
            <span>06.3 // TRAFFIC WORKSPACE</span>
            <p>Traffic detail stays lazy and separate from the ordinary Command Center aggregate read.</p>
          </div>
          <FounderTrafficAnalytics />
        </section>

        <div className="newsroom-old-tools">
          <Link href="/admin/dashboard">Open legacy admin tools</Link>
        </div>
      </section>
    </main>
  );
}
