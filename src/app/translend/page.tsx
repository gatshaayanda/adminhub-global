export default function TranslendFoundationPage() {
  return (
    <main className="min-h-screen bg-[#FBF9F6] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0C6C7D]">
          Translend TMS · Truck Division
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Foundation ready
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The Translend application foundation is being established separately from
          the inherited AdminHub business modules. Firebase and authentication
          boundaries are in place for the next controlled implementation phase.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Current scope</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>✓ Next.js application boundary</li>
            <li>✓ Firebase client/server separation</li>
            <li>✓ Authentication verification boundary</li>
            <li>✓ Organization/role/capability contract</li>
            <li>✓ Living project documentation</li>
            <li>○ Business modules intentionally not started</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
