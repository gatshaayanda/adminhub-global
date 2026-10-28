import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminDb } from "@/utils/firebaseAdmin";
import { FOUNDER_SESSION_COOKIE, verifyFounderSession } from "../../../../lib/boardsignal/founderSession.mjs";
const allowed = new Set(["ggl_tournaments", "ggl_updates"]);
async function isAdmin() { const jar = await cookies(); return verifyFounderSession(jar.get(FOUNDER_SESSION_COOKIE)?.value, process.env.ADMIN_PASSWORD); }
function clean(value: unknown) {
 if (!value || typeof value !== "object" || Array.isArray(value)) return null;
 const result: Record<string,string|number|boolean> = {};
 for (const [key,item] of Object.entries(value as Record<string,unknown>)) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) continue;
  if (typeof item === "string") result[key]=item.trim().slice(0,5000);
  else if (typeof item === "number" && Number.isFinite(item)) result[key]=item;
  else if (typeof item === "boolean") result[key]=item;
 }
 return result;
}
export async function GET(request:Request) {
 if(new URL(request.url).searchParams.get("admin")==="1" && !(await isAdmin())) return NextResponse.json({error:"Admin sign-in required."},{status:401});
 try { const db=getAdminDb(); const [t,u]=await Promise.all([db.collection("ggl_tournaments").get(),db.collection("ggl_updates").get()]); return NextResponse.json({tournaments:t.docs.map(d=>({id:d.id,...d.data()})),updates:u.docs.map(d=>({id:d.id,...d.data()}))},{headers:{"Cache-Control":"no-store"}}); }
 catch(error) { console.error("GGL content read failed",error); return NextResponse.json({tournaments:[],updates:[],storageConfigured:false},{headers:{"Cache-Control":"no-store"}}); }
}
export async function POST(request:Request) {
 if(!(await isAdmin())) return NextResponse.json({error:"Admin sign-in required."},{status:401});
 try { const body=await request.json(), name=String(body.collection??""), id=String(body.id??""), record=clean(body.record);
 if(!allowed.has(name)||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!record) return NextResponse.json({error:"Invalid content record."},{status:400});
 const ref=getAdminDb().collection(name).doc(id), old=await ref.get(); await ref.set({...record,createdAt:old.exists?old.data()?.createdAt??new Date().toISOString():new Date().toISOString(),updatedAt:new Date().toISOString()},{merge:true}); return NextResponse.json({success:true,id});
 } catch(error) { console.error("GGL content save failed",error); return NextResponse.json({error:"Could not save content. Check Firebase Admin configuration."},{status:500}); }
}
export async function DELETE(request:Request) {
 if(!(await isAdmin())) return NextResponse.json({error:"Admin sign-in required."},{status:401});
 try { const body=await request.json(), name=String(body.collection??""), id=String(body.id??""); if(!allowed.has(name)||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return NextResponse.json({error:"Invalid content record."},{status:400}); await getAdminDb().collection(name).doc(id).delete(); return NextResponse.json({success:true}); }
 catch(error) { console.error("GGL content delete failed",error); return NextResponse.json({error:"Could not delete content."},{status:500}); }
}