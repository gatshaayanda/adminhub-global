import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "BoardSignal Pipeline — V1 is live. The desk keeps moving.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image(){return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#f4efe4",color:"#171714",padding:"70px 78px",fontFamily:"Arial, sans-serif"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:24,fontWeight:800,letterSpacing:3}}><span>BOARD SIGNAL PIPELINE</span><span>FOUNDING RELEASE</span></div><div style={{display:"flex",flexDirection:"column",gap:22}}><div style={{fontSize:86,fontWeight:800,lineHeight:.94,letterSpacing:-5}}>BoardSignal V1 is live.<br/>The desk keeps moving.</div><div style={{fontSize:29,lineHeight:1.35,maxWidth:900}}>What shipped. What&apos;s next. Where player input can shape the product.</div></div><div style={{display:"flex",alignItems:"center",gap:18,fontSize:22,fontWeight:800}}><span>PLANNED</span><span>→</span><span>BUILDING</span><span>→</span><span>RELEASED</span></div></div>,size)}
