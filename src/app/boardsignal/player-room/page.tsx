import type { Metadata } from "next";
import BoardSignalHistoryWorker from "@/components/BoardSignalHistoryWorker";
import BoardSignalPlayerRoom from "@/components/BoardSignalPlayerRoom";
import CurrentBoardSignalEngagement from "@/components/CurrentBoardSignalEngagement";
import PlayerRoomEngagementBridge from "@/components/PlayerRoomEngagementBridge";
import PlayerRoomReviewEngagement from "@/components/PlayerRoomReviewEngagement";
export const metadata:Metadata={title:"My BoardSignal",robots:{index:false,follow:false}};
export default function PlayerRoomPage(){return <><BoardSignalPlayerRoom/><CurrentBoardSignalEngagement/><PlayerRoomEngagementBridge/><PlayerRoomReviewEngagement/><BoardSignalHistoryWorker/></>}
