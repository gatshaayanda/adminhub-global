"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { BoardSignalCoachingLevel, BoardSignalCoachingPresentation, BoardSignalCurrentFeedback, BoardSignalCurrentReaction } from "@/lib/boardsignal/account";
import { activeCoachingPresentationCopy, nextManualCoachingVariant } from "@/lib/boardsignal/coaching";
import { loadPlayerRoomOfflineSnapshot, patchPlayerRoomOfflineCoaching } from "@/lib/boardsignal/offline/snapshots";
import { auth } from "@/utils/firebaseConfig";
import styles from "./CurrentBoardSignalEngagement.module.css";

type MutationPayload={ok?:boolean;coaching?:BoardSignalCoachingPresentation;feedback?:BoardSignalCurrentFeedback;error?:string};
type CoachingAction="next_example"|"view_game"|"ask_escalation"|"switch_variant";

function ReactionRow({level,reaction,online,busy,onReact}:{level:BoardSignalCoachingLevel;reaction?:BoardSignalCurrentReaction;online:boolean;busy:boolean;onReact:(level:BoardSignalCoachingLevel,reaction:BoardSignalCurrentReaction)=>void}){
  return <div className={`${styles.helpful} ${reaction?styles.settled:""}`} aria-label="Feedback for this coaching explanation">
    <strong>Helpful?</strong>
    <div className={styles.reactionButtons}>
      <button type="button" disabled={!online||busy} aria-label="Helpful coaching explanation" aria-pressed={reaction==="helpful"} onClick={()=>onReact(level,"helpful")}>👍</button>
      <button type="button" disabled={!online||busy} aria-label="Not helpful coaching explanation" aria-pressed={reaction==="not_helpful"} onClick={()=>onReact(level,"not_helpful")}>👎</button>
    </div>
    {reaction?<p className={styles.acknowledgement} role="status">{reaction==="helpful"?"That helped. BoardSignal saved that.":"That did not help. BoardSignal saved that."}</p>:null}
    {!online?<p className={styles.reconnectHint}>Reconnect to send feedback. Saved coaching stays read-only offline.</p>:null}
  </div>
}

function ExampleDetails({coaching,online,busy,onInteraction}:{coaching:BoardSignalCoachingPresentation;online:boolean;busy:boolean;onInteraction:(action:CoachingAction)=>void}){
  const example=coaching.selectedExample;
  if(!example)return <div className={styles.noExample}><strong>No real game example is stored yet.</strong><p>BoardSignal will not invent an opponent, move or game link just to change the explanation.</p></div>;
  const details=[example.opponent?`vs ${example.opponent}${example.opponentRating?` (${example.opponentRating})`:""}`:undefined,example.pool,example.moveNumber?`move ${example.moveNumber}`:undefined].filter(Boolean);
  return <div className={styles.exampleDetails} aria-label="Supporting game detail">
    {details.length?<small className={styles.exampleMeta}>{details.join(" · ")}</small>:null}
    {example.movePlayed?<p className={styles.moveLine}><b>You played:</b> {example.movePlayed}{example.opponentReply?<> <span>→</span> <b>Reply:</b> {example.opponentReply}</>:null}</p>:null}
    <div className={styles.actions}>{example.gameUrl?<a className="button button-quiet" href={example.gameUrl} target="_blank" rel="noreferrer" onClick={()=>onInteraction("view_game")}>VIEW GAME</a>:null}{coaching.examples.length>1?<button type="button" className="button button-quiet" disabled={!online||busy} onClick={()=>onInteraction("next_example")}>SEE ANOTHER EXAMPLE</button>:null}</div>
  </div>
}

function syncNativePresentation(target:HTMLElement,coaching:BoardSignalCoachingPresentation){
  const visible=activeCoachingPresentationCopy(coaching);
  const title=target.querySelector<HTMLElement>(":scope > h3");
  const copy=[...target.querySelectorAll<HTMLElement>(":scope > p")].find((node)=>!node.classList.contains("corner-framing"));
  if(title&&title.textContent!==visible.title)title.textContent=visible.title;
  if(copy&&copy.textContent!==visible.copy)copy.textContent=visible.copy;
}

export default function CurrentBoardSignalEngagement(){
  const[coaching,setCoaching]=useState<BoardSignalCoachingPresentation>();
  const[target,setTarget]=useState<HTMLElement|null>(null);
  const[online,setOnline]=useState(()=>typeof navigator==="undefined"?true:navigator.onLine);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");

  const loadSaved=useCallback(async()=>{const uid=auth.currentUser?.uid;if(!uid)return;const saved=await loadPlayerRoomOfflineSnapshot(uid).catch(()=>undefined);if(saved?.coaching)setCoaching(saved.coaching)},[]);
  useEffect(()=>onAuthStateChanged(auth,(user)=>{if(!user)setCoaching(undefined);else void loadSaved()}),[loadSaved]);
  useEffect(()=>{if(typeof window==="undefined")return;const locate=()=>setTarget(document.querySelector<HTMLElement>(".g3-before-next-game"));const onState=(event:Event)=>{const next=(event as CustomEvent<BoardSignalCoachingPresentation>).detail;if(next?.schemaVersion===2)setCoaching(next);locate()};const onSaved=()=>{void loadSaved();locate()};const onOnline=()=>setOnline(true),onOffline=()=>setOnline(false);const observer=new MutationObserver(locate);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener("boardsignal:coaching-state",onState);window.addEventListener("boardsignal:offline-saved",onSaved);window.addEventListener("boardsignal:context",locate);window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);window.requestAnimationFrame(locate);return()=>{observer.disconnect();window.removeEventListener("boardsignal:coaching-state",onState);window.removeEventListener("boardsignal:offline-saved",onSaved);window.removeEventListener("boardsignal:context",locate);window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline)}},[loadSaved]);
  useEffect(()=>{if(!target||!coaching)return;const apply=()=>syncNativePresentation(target,coaching);apply();const observer=new MutationObserver(apply);observer.observe(target,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect()},[coaching,target]);

  const mutate=useCallback(async(body:Record<string,unknown>)=>{if(!coaching||!online||busy)return;const user=auth.currentUser;if(!user)return;setBusy(true);setError("");try{const token=await user.getIdToken();const response=await fetch("/api/boardsignal/current-feedback",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({coachingSignalKey:coaching.coachingSignalKey,...body})});const payload=await response.json().catch(()=>({})) as MutationPayload;if(!response.ok||!payload.ok||!payload.coaching)throw new Error(payload.error??"BoardSignal could not save that coaching response.");setCoaching(payload.coaching);await patchPlayerRoomOfflineCoaching(user.uid,payload.coaching,payload.feedback).catch(()=>undefined);window.dispatchEvent(new CustomEvent("boardsignal:coaching-state",{detail:payload.coaching}))}catch(reason){setError(reason instanceof Error?reason.message:"BoardSignal could not save that coaching response.")}finally{setBusy(false)}},[busy,coaching,online]);
  const react=useCallback((level:BoardSignalCoachingLevel,reaction:BoardSignalCurrentReaction)=>{void mutate({level,reaction})},[mutate]);
  const interaction=useCallback((action:CoachingAction)=>{if(action==="view_game"){void mutate({action});return}if(action==="ask_escalation"){if(online)void mutate({action});window.dispatchEvent(new CustomEvent("boardsignal:ask-open",{detail:{message:"What should I actually do about this coaching signal?"}}));return}void mutate({action})},[mutate,online]);
  const switchExplanation=useCallback(()=>{if(!coaching||!online||busy)return;void mutate({action:"switch_variant",variant:nextManualCoachingVariant(coaching)})},[busy,coaching,mutate,online]);

  if(!target||!coaching)return null;
  const reaction=coaching.reactions?.[coaching.level]?.reaction;
  const content=<div className={styles.coachingControls} aria-label="Coaching controls">
    {coaching.level===3?<ExampleDetails coaching={coaching} online={online} busy={busy} onInteraction={interaction}/>:null}
    <ReactionRow level={coaching.level} reaction={reaction} online={online} busy={busy} onReact={react}/>
    <div className={styles.switcher}><button type="button" className="button button-quiet" disabled={!online||busy} onClick={switchExplanation}>TRY ANOTHER EXPLANATION</button>{!online?<span>Reconnect to switch explanations.</span>:null}</div>
    {coaching.level===3?<div className={styles.actions}><button type="button" className="button button-outline" disabled={!online||busy} onClick={()=>interaction("ask_escalation")}>ASK BOARDSIGNAL ABOUT THIS</button></div>:null}
    {error?<p className={styles.feedbackError} role="alert">{error}</p>:null}
  </div>;
  return createPortal(content,target);
}
