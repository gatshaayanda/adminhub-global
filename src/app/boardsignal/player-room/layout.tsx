import TrustpilotInvitationBridge from "@/components/TrustpilotInvitationBridge";

const trustpilotInvitationBootstrap = `(function(w,d,s,r,n){
  w.TrustpilotObject=n;
  w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)};
  var a=d.createElement(s);a.async=1;a.src=r;a.type='text/java'+s;
  var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(a,f);
})(window,document,'script','https://invitejs.trustpilot.com/tp.min.js','tp');
tp('register','oiloKbZhU5G7rp2L');`;

export default function PlayerRoomTrustpilotLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: trustpilotInvitationBootstrap }} />
      <TrustpilotInvitationBridge />
      {children}
    </>
  );
}
