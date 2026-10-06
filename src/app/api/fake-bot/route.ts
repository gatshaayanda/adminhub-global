import { NextResponse } from "next/server";

type BotResponse = { reply:string; suggestions?:string[] };

const products = [
  ["BOEMO","Food & Hospitality","Mobile kitchen ordering"],
  ["Translend","Transport & Logistics","Transport & workflow management"],
  ["Namane Tyres","Automotive & Tyre Services","Customer booking & work progress"],
  ["Atlas Service Centre","Automotive & Workshops","Vehicle service & workshop system"],
  ["TutorMe","Education & Tutoring","Education & tutoring application"],
  ["Avram Kids","Events & Equipment Hire","Event equipment booking & operations"],
  ["PurePress","Business & Operations","Business application"],
];

const reply=(text:string,suggestions?:string[]):BotResponse=>({reply:text.trim(),suggestions});
const normalize=(v:unknown)=>String(v??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();

function productReply(text:string){
  const matches=products.filter(([name,industry,type])=>text.includes(normalize(name))||text.includes(normalize(industry))||text.includes(normalize(type)));
  if(matches.length) return reply(
    "The closest published Admin Hub work is:\n\n"+matches.map(p=>`• ${p[0]} — ${p[1]} — ${p[2]}`).join("\n")+"\n\nOpen the Apps section to preview the work, then use the enquiry flow if you want something similar.",
    ["Explore apps","Start an enquiry"]
  );
  return reply(
    "Tell me the industry or workflow you care about — for example food ordering, transport, automotive service, education, events/equipment hire, or general business operations — and I’ll point you to the closest published work.",
    ["Explore apps","Start an enquiry"]
  );
}

function detect(text:string):BotResponse{
  if(!text) return reply("Hi — I’m Ask Admin Hub. I can help you explore published products, find work relevant to your industry, explore games, or collect a project enquiry.",["Explore apps","Explore games","Start an enquiry"]);
  if(/\b(hello|hi|hey|morning|afternoon|evening|dumela)\b/.test(text)) return reply("Hi — I’m Ask Admin Hub. What would you like to explore?",["Explore apps","Explore games","Find work like mine","Start an enquiry"]);
  if(/\b(explore apps|apps|products|portfolio|work)\b/.test(text)) return reply("Admin Hub’s published client work is organized by industry so you can jump to the products closest to your business: Food & Hospitality; Transport & Logistics; Automotive & Workshops; Education & Tutoring; Events & Equipment Hire; and Business & Operations.",["Find work like mine","Start an enquiry"]);
  if(/\b(game|games|playable|interactive)\b/.test(text)) return reply("The Games section is for Admin Hub’s reusable interactive work: Wardrobe, Shooters Trigger, President’s Shoes and Hall. Open a game preview to see the experience rather than just reading about it.",["Explore games","Start an enquiry"]);
  if(/\b(find|relevant|similar|industry|sector|business like|something like)\b/.test(text)) return productReply(text);
  if(/\b(contact|inquiry|enquiry|project|build|quote|hire|discuss|idea)\b/.test(text)) return reply("Absolutely. I can collect the useful details without making you fill out a long form all at once: your name, company/project, what you’d like to discuss, how you prefer to be contacted, the contact detail to use, and any reference you want Admin Hub to consider.",["Start an enquiry","Explore apps"]);
  if(/\b(who|what is admin hub|what does admin hub)\b/.test(text)) return reply("Admin Hub builds software and interactive experiences around real use: business applications, ordering systems, operational workflows and browser games. The published work is the evidence — you can open it and decide whether the approach fits what you need.",["Explore apps","Explore games","Start an enquiry"]);
  return reply("I can help you explore the published work, find a product relevant to your industry, explain what a product does, or collect a project enquiry for Admin Hub to review.",["Explore apps","Find work like mine","Start an enquiry"]);
}

export async function POST(req:Request){
  let raw=""; try{const body=await req.json(); raw=String(body?.message??"")}catch{}
  return NextResponse.json(detect(normalize(raw)));
}
