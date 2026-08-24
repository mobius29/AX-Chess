"use client";

import type { ReviewResponse } from "@ax-chess/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppNav } from "@/app/_components/layout/AppNav";
import { Link } from "@/app/_components/ui/Link";
import { Body, Title } from "@/app/_components/ui/Typography";
import type { ApiRequestError } from "@/app/_lib/api/apiClient";
import { getReview, reviewQueryKey } from "@/app/_lib/api/games";
import { COLOR_LABEL, ENDED_REASON_LABEL, RESULT_LABEL } from "@/app/_lib/labels";

import ReviewAnalyzing from "./components/ReviewAnalyzing";
import ReviewBoard from "./components/ReviewBoard";
import ReviewControls from "./components/ReviewControls";
import ReviewEvalBadge from "./components/ReviewEvalBadge";
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

  return (
    <>
      <AppNav />
      <section className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 py-8 md:px-10">
        <Link href="/records" size="sm" variant="text">
          ← 기록으로
        </Link>

        <div className="mt-2">
          <Title level={4} tone="ink">
            복기 · {COLOR_LABEL[review.color]}
          </Title>
          <Body className="mt-1" level={3} tone="muted">
            {RESULT_LABEL[review.result]} · {ENDED_REASON_LABEL[review.endedReason]}
          </Body>
        </div>

        <ReviewBoard fen={fen} orientation={review.color} />
        <ReviewEvalBadge ply={currentMove} />
        <ReviewControls currentPly={currentPly} onChange={setCurrentPly} totalPlies={totalPlies} />
        <ReviewMoveList currentPly={currentPly} onSelect={setCurrentPly} plies={review.plies} />
      </section>
    </>
  );
};

export default ReviewScreen;
