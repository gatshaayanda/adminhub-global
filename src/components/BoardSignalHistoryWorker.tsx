"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import { buildLiveDeskRequestPath } from "@/lib/boardsignal/firstReviewGeneration.mjs";
import { historicalRequestAnchor, type HistoricalBackfillWork } from "@/lib/boardsignal/historyBackfill";
import { latestCompletedReviewPeriods } from "@/lib/boardsignal/reviewPeriods";
import type { BoardSignalDesk, DeskApiResponse, DeskEngineResult } from "@/lib/boardsignal/types";
import { auth } from "@/utils/firebaseConfig";

type ClaimResponse={ok:boolean;username?:string;work?:HistoricalBackfillWork;error?:string};type StateResponse={ok?:boolean;error?:string};
export default function BoardSignalHistoryWorker(){
 const [user,setUser]=useState<User|null>(null);const[ownerToken,setOwnerToken]=useState("");const[username,setUsername]=useState("");const[work,setWork]=useState<HistoricalBackfillWork|undefined>();
 const timerRef=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const busyRef=useRef(false);const mountedRef=useRef(true);const workRef=useRef<HistoricalBackfillWork|undefined>(undefined);const wakeQueuedRef=useRef(false);
 const announceSettledPeriod=useCallback(()=>window.dispatchEvent(new CustomEvent("boardsignal:history-updated")),[]);
 const postState=useCallback(async(activeUser:User,activeWork:HistoricalBackfillWork,action:"noActivity"|"retryable"|"published",error?:string)=>{const token=await activeUser.getIdToken();const response=await fetch("/api/boardsignal/history-backfill",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({action,leaseId:activeWork.leaseId,periodStart:activeWork.periodStart,error})});const body=await response.json() as StateResponse;if(!response.ok||!body.ok)throw new Error(body.error??"Recent Review history could not be updated.");},[]);
 const advance=useCallback(async(activeUser:User)=>{if(!mountedRef.current||(typeof navigator!=="undefined"&&!navigator.onLine))return;if(busyRef.current||workRef.current){wakeQueuedRef.current=true;return;}busyRef.current=true;let settledThisWake=false;try{
   // One wake may settle several quiet historical slots, but it emits at most one Player Room refresh.
   for(let slot=0;slot<4&&mountedRef.current&&!workRef.current;slot+=1){
    const token=await activeUser.getIdToken();if(!mountedRef.current)return;setOwnerToken(token);
    const response=await fetch("/api/boardsignal/history-backfill",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});const body=await response.json() as ClaimResponse;if(!response.ok||!body.ok||!mountedRef.current)break;setUsername(body.username??"");if(!body.work||!body.username)break;
    const claimed=body.work;const requestAnchor=historicalRequestAnchor(claimed.requestCadenceAnchor,claimed.periodStart);let preview:Response;let deskBody:DeskApiResponse;
    try{preview=await fetch(buildLiveDeskRequestPath(body.username,requestAnchor),{cache:"no-store"});deskBody=await preview.json() as DeskApiResponse;}catch(error){await postState(activeUser,claimed,"retryable",error instanceof Error?error.message:"Historical Review request failed.").catch(()=>undefined);break;}
    if(!preview.ok||!deskBody.ok){if(!deskBody.ok&&(deskBody.code==="NO_ACTIVITY"||deskBody.error.startsWith("No games were played"))){await postState(activeUser,claimed,"noActivity").catch(()=>undefined);settledThisWake=true;continue;}await postState(activeUser,claimed,"retryable",!deskBody.ok?deskBody.error:"Historical Review request failed.").catch(()=>undefined);break;}
    const latestCompleted=latestCompletedReviewPeriods(claimed.requestCadenceAnchor).at(-1);if(latestCompleted?.periodStart===claimed.periodStart){await postState(activeUser,claimed,"retryable","Ordinary live Review generation has priority for the latest completed game-bearing period.").catch(()=>undefined);break;}
    workRef.current=claimed;setWork(claimed);break;
   }
  }finally{busyRef.current=false;if(settledThisWake&&mountedRef.current)announceSettledPeriod();if(wakeQueuedRef.current&&!workRef.current&&mountedRef.current){wakeQueuedRef.current=false;timerRef.current=setTimeout(()=>void advance(activeUser),0);}}
 },[announceSettledPeriod,postState]);
 useEffect(()=>{mountedRef.current=true;const unsubscribe=onAuthStateChanged(auth,activeUser=>{setUser(activeUser);if(timerRef.current)clearTimeout(timerRef.current);if(activeUser)void advance(activeUser);else{workRef.current=undefined;wakeQueuedRef.current=false;setWork(undefined);setUsername("");setOwnerToken("");busyRef.current=false;}});return()=>{mountedRef.current=false;unsubscribe();};},[advance]);
 useEffect(()=>{const wake=()=>{if(user)void advance(user);};const handleVisibility=()=>{if(document.visibilityState==="visible")wake();};window.addEventListener("online",wake);window.addEventListener("boardsignal:review-published",wake);document.addEventListener("visibilitychange",handleVisibility);return()=>{window.removeEventListener("online",wake);window.removeEventListener("boardsignal:review-published",wake);document.removeEventListener("visibilitychange",handleVisibility);};},[advance,user]);
 useEffect(()=>()=>{if(timerRef.current)clearTimeout(timerRef.current);},[]);
 const saveFactual=useCallback(async(desk:BoardSignalDesk)=>{if(!user||!work)return;const token=await user.getIdToken();const response=await fetch("/api/boardsignal/player-room",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({action:"saveFactualReview",desk,reviewLifecycle:"historical_backfill",historyLeaseId:work.leaseId})});const body=await response.json() as StateResponse;if(!response.ok||!body.ok)throw new Error(body.error??"Recent Review history could not be saved yet.");},[user,work]);
 const publishHistorical=useCallback(async(desk:BoardSignalDesk,engineResults:Record<string,DeskEngineResult>)=>{if(!user||!work)return;const activeWork=work;const token=await user.getIdToken();const response=await fetch("/api/boardsignal/player-room",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({action:"publishDesk",desk,engineResults,reviewLifecycle:"historical_backfill",historyLeaseId:activeWork.leaseId})});const body=await response.json() as StateResponse;if(!response.ok||!body.ok)throw new Error(body.error??"Recent Review history could not be saved yet.");await postState(user,activeWork,"published");if(!mountedRef.current)return;workRef.current=undefined;setWork(undefined);announceSettledPeriod();wakeQueuedRef.current=false;timerRef.current=setTimeout(()=>void advance(user),900);},[advance,announceSettledPeriod,postState,user,work]);
 if(!user||!work||!username||!ownerToken)return null;const requestAnchor=historicalRequestAnchor(work.requestCadenceAnchor,work.periodStart);return <div hidden aria-hidden="true"><UniversalPlayerDesk key={`${work.periodStart}:${work.leaseId}`} requestedUsername={username} ownerToken={ownerToken} cadenceAnchor={requestAnchor} onFactualReviewReady={saveFactual} onDeskPublished={publishHistorical} embedded/></div>;
}
