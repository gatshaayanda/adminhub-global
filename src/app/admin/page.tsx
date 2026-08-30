import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import FounderCommandCenterDecisionBrief from "@/components/FounderCommandCenterDecisionBrief";
import FounderOperationsConsole from "@/components/FounderOperationsConsole";
import FounderNewsroomSummary from "@/components/FounderNewsroomSummary";
import FounderTrafficAnalytics from "@/components/FounderTrafficAnalytics";
import styles from "@/components/FounderCommandCenter.module.css";
import matureStyles from "@/components/FounderCommandCenterMature.module.css";

export default function AdminHomePage() {
  return (
    <main className={`admin-dashboard admin-dashboard-newsroom ${styles.page} ${matureStyles.shell}`}>
      <AdminNav />
      <section className="founder-newsroom-v2">
        <FounderCommandCenterDecisionBrief />
        <FounderOperationsConsole />

        <section id="founder-workspace-newsroom" className={styles.secondaryWorkspace} aria-label="Founder Newsroom workspace">
          <div className={styles.secondaryWorkspaceHeader}>
            <span>Newsroom workspace</span>
            <p>Editorial and delivery detail stays separate until you need it.</p>
          </div>
          <FounderNewsroomSummary />
        </section>

        <section id="founder-workspace-traffic" className={styles.secondaryWorkspace} aria-label="Founder Traffic workspace">
          <div className={styles.secondaryWorkspaceHeader}>
            <span>Traffic and acquisition</span>
            <p>Visitor and acquisition detail stays separate from BoardSignal operational truth.</p>
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
