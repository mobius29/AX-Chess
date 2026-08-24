"use client";

import type { ReviewResponse } from "@ax-chess/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppNav } from "@/app/_components/layout/AppNav";
import { Badge } from "@/app/_components/ui/Badge";
import { Link } from "@/app/_components/ui/Link";
import { Stat } from "@/app/_components/ui/Stat";
import { Title } from "@/app/_components/ui/Typography";
import type { ApiRequestError } from "@/app/_lib/api/apiClient";
import { getReview, reviewQueryKey } from "@/app/_lib/api/games";
import { COLOR_LABEL, ENDED_REASON_LABEL, RESULT_LABEL } from "@/app/_lib/labels";

import ReviewAnalyzing from "./components/ReviewAnalyzing";
import ReviewBoardColumn from "./components/ReviewBoardColumn";
import ReviewEvalChart from "./components/ReviewEvalChart";
import ReviewLoadError from "./components/ReviewLoadError";
import ReviewMoveList from "./components/ReviewMoveList";

const ReviewScreen = ({ gameId }: { gameId: string }) => {
  const [currentPly, setCurrentPly] = useState(0);

  const { data: review, error } = useQuery<ReviewResponse, ApiRequestError>({
    queryFn: () => getReview(gameId),
    queryKey: reviewQueryKey(gameId),
  });

  const totalPlies = review?.plies.length ?? 0;

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setCurrentPly((ply) => Math.max(0, ply - 1));
      if (event.key === "ArrowRight") setCurrentPly((ply) => Math.min(totalPlies, ply + 1));
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [totalPlies]);

  if (error) {
    return (
      <>
        <AppNav />
        <ReviewLoadError message={error.message} />
      </>
    );
  }
  if (!review) {
    return (
      <>
        <AppNav />
        <ReviewAnalyzing />
      </>
    );
  }

  const currentMove = currentPly === 0 ? null : (review.plies[currentPly - 1] ?? null);
  const fen = currentMove?.fen ?? review.initialFen;
  const blunderCount = review.plies.filter((ply) => ply.classification === "blunder").length;

  return (
    <>
      <AppNav />
      <section className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-5 py-14 md:px-10">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Badge variant={review.result === "win" ? "win" : review.result === "loss" ? "loss" : "default"}>
                {RESULT_LABEL[review.result]}
              </Badge>
              <Badge variant="default">{ENDED_REASON_LABEL[review.endedReason]}</Badge>
              <Badge variant="default">{COLOR_LABEL[review.color]}</Badge>
            </div>
            <Title level={2} tone="ink">
              대국 복기
            </Title>
          </div>
          <Link href="/records" size="sm" variant="secondary">
            기록으로
          </Link>
        </div>

        <div className="bg-surface-card flex gap-6 rounded-lg p-6">
          <Stat label="총 수" value={`${totalPlies}수`} />
          <Stat label="블런더" value={String(blunderCount)} />
        </div>

        <div className="flex flex-col gap-10 md:flex-row">
          <ReviewBoardColumn
            currentMove={currentMove}
            currentPly={currentPly}
            fen={fen}
            onChange={setCurrentPly}
            orientation={review.color}
            totalPlies={totalPlies}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ReviewEvalChart currentPly={currentPly} onSelect={setCurrentPly} plies={review.plies} />
            <ReviewMoveList currentPly={currentPly} onSelect={setCurrentPly} plies={review.plies} />
          </div>
        </div>
      </section>
    </>
  );
};

export default ReviewScreen;
