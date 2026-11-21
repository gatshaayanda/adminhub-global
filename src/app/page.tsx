import Link from "next/link";
import HomeProofCarousel from "@/components/HomeProofCarousel";

const products=[
  {name:"i13",title:"Business Operating System",detail:"A connected business experience: public storefront, customer requests and accounts, and the owner's Briefcase.",features:["Storefront","Customer workspace","Owner Briefcase"],href:"https://iteration13.vercel.app/",kind:"briefcase"},
  {name:"i14",title:"Backpack OS",detail:"A personal operating system for organising Backpacks, channels, people, updates and private spaces.",features:["Personal Backpacks","Channels & circles","Private workspace"],href:"https://iteration14.vercel.app/",kind:"backpack"}
];

function SystemIcon({kind}:{kind:string}){
  if(kind==="briefcase") return <svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="caseMetal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4d8"/><stop offset=".48" stopColor="#e8a85f"/><stop offset="1" stopColor="#a85a27"/></linearGradient><linearGradient id="caseBody" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#dce7f7"/></linearGradient></defs><path d="M39 29v-9c0-5 4-9 9-9h24c5 0 9 4 9 9v9" fill="none" stroke="url(#caseMetal)" strokeWidth="7" strokeLinecap="round"/><rect x="10" y="27" width="100" height="64" rx="13" fill="url(#caseBody)" stroke="#a8bad3" strokeWidth="2"/><path d="M10 49h100v13H10z" fill="#d5e2f3"/><path d="M48 47h24v13H48z" rx="4" fill="#e6a75f"/><path d="M55 51h10" stroke="#75401f" strokeWidth="2.5" strokeLinecap="round"/><path d="M10 64h100" stroke="#a8bad3" strokeWidth="1.5"/><path d="M22 34h25" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9"/></svg>;
  return <svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="bagFabric" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dceaff"/><stop offset=".55" stopColor="#8bb3e8"/><stop offset="1" stopColor="#4d70ad"/></linearGradient><linearGradient id="bagPocket" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f8fbff"/><stop offset="1" stopColor="#c2d8f5"/></linearGradient></defs><path d="M38 31V23c0-12 9-19 22-19s22 7 22 19v8" fill="none" stroke="#d7e6fb" strokeWidth="8" strokeLinecap="round"/><path d="M25 31c0-7 6-12 13-12h44c7 0 13 5 13 12l7 51c1 8-5 14-13 14H31c-8 0-14-6-13-14z" fill="url(#bagFabric)" stroke="#d7e6fb" strokeWidth="2"/><path d="M34 55c0-6 5-10 11-10h30c6 0 11 4 11 10v25H34z" fill="url(#bagPocket)" stroke="#5578b0" strokeWidth="2"/><path d="M51 44v-5c0-5 4-8 9-8s9 3 9 8v5" fill="none" stroke="#f8fbff" strokeWidth="4" strokeLinecap="round"/><path d="M60 59v13" stroke="#6d8fbe" strokeWidth="3" strokeLinecap="round"/><circle cx="60" cy="76" r="3" fill="#6d8fbe"/><path d="M28 37l-4 31M92 37l4 31" stroke="#eaf3ff" strokeWidth="3" strokeLinecap="round" opacity=".8"/></svg>;
}

export default function HomePage(){
  return <div className="admin-home">
    <section className="ibos-stage" aria-labelledby="ibos-title">
      <div className="ibos-heading">
        <p className="admin-kicker">ADMIN HUB GLOBAL PRESENTS</p>
        <h1 id="ibos-title">iB O.S.</h1>
        <p>One place to explore interactive operating systems.</p>
        <span className="ibos-caption">OPEN A SYSTEM. MAKE IT YOURS.</span>
        <div className="ibos-edition"><span>ITERATION B</span><i aria-hidden="true"/><span>FOR BUSINESS &amp; EVERYDAY</span></div>
      </div>
      <div className="ibos-box" aria-label="The iB O.S. collection: business and everyday operating systems">
        <div className="ibos-box-top"><span className="ibos-box-brand">ADMIN HUB</span><span className="ibos-box-edition">INTERACTIVE SYSTEMS · 01—02</span></div>
        <div className="ibos-product-grid" id="ibos-products">
          {products.map((product,index)=><article className={`ibos-product ibos-product-${product.kind}`} key={product.name}>
            <div className="ibos-product-index">SYSTEM 0{index+1}</div>
            <Link className="ibos-icon-launch" href={product.href} target="_blank" rel="noreferrer" aria-label={`Enter ${product.name} — ${product.title}`}>
              <span className="ibos-icon-orbit" aria-hidden="true"/><span className="ibos-icon-art"><SystemIcon kind={product.kind}/></span><span className="ibos-icon-enter">ENTER <b aria-hidden="true">↗</b></span>
            </Link>
            <div className="ibos-product-name">{product.name}</div>
            <div className="ibos-product-title">{product.title}</div>
            <p>{product.detail}</p>
            <ul>{product.features.map(feature=><li key={feature}>{feature}</li>)}</ul>
            <Link className="ibos-open-link" href={product.href} target="_blank" rel="noreferrer"><span>Open {product.name}</span><span aria-hidden="true">↗</span></Link>
          </article>)}
        </div>
        <div className="ibos-box-bottom">
          <div className="ibos-maker-mark"><span className="ibos-maker-symbol">iB</span><span><b>BUILT BY ADMIN HUB GLOBAL</b><small>BUSINESS SYSTEMS · EVERYDAY SYSTEMS</small></span></div>
          <Link className="ibos-explore-both" href="#ibos-products"><span className="ibos-explore-spark" aria-hidden="true">✳</span><span>EXPLORE BOTH</span><span aria-hidden="true">↓</span></Link>
        </div>
      </div>
    </section>
    <section className="ibos-founder-wrap" aria-label="Founder references"><div className="ibos-founder-heading"><p className="admin-kicker">THE PERSON BEHIND THE WORK</p><h2>Built through experience. Grounded in real work.</h2></div><HomeProofCarousel/></section>
  </div>;
}
