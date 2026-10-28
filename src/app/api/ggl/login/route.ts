import { NextResponse } from "next/server";
import { createFounderSession } from "../../../../lib/boardsignal/founderSession.mjs";
const COOKIE = "ggl_organizer_session";
export async function POST(request:Request) {
 const expected = process.env.GGL_ORGANIZER_PASSWORD;
 if (!expected) return NextResponse.json({error:"GGL organiser access is not configured yet. Set GGL_ORGANIZER_PASSWORD in the Vercel project environment."},{status:503});
 let submitted = "";
 try { submitted = String((await request.json()).password ?? ""); } catch { return NextResponse.json({error:"Enter the organiser password."},{status:400}); }
 if (!submitted || submitted !== expected) return NextResponse.json({error:"That organiser password is not correct."},{status:401});
 const session = await createFounderSession(expected);
 const response = NextResponse.json({success:true});
 response.cookies.set({name:COOKIE,value:session.value,httpOnly:true,path:"/",maxAge:session.maxAge,expires:session.expires,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
 return response;
}
export async function DELETE() {
 const response=NextResponse.json({success:true});
 response.cookies.set({name:COOKIE,value:"",httpOnly:true,path:"/",maxAge:0,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
 return response;
}