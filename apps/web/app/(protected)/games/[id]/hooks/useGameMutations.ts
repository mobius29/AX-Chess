import type { ResignResponse, SubmitMoveResponse } from "@ax-chess/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiRequestError } from "@/app/_lib/api/apiClient";
import { activeGameQueryKey, gameQueryKey, resignGame, retryAiMove, submitMove } from "@/app/_lib/api/games";

type UseGameMutationsOptions = {
  onMoveSuccess: () => void;
  onResignSuccess: () => void;
  setErrorMessage: (message: string | null) => void;
};

const useGameMutations = (
  gameId: string,
  { onMoveSuccess, onResignSuccess, setErrorMessage }: UseGameMutationsOptions,
) => {
  const queryClient = useQueryClient();

  const moveMutation = useMutation<SubmitMoveResponse, ApiRequestError, string>({
    mutationFn: (move) => submitMove(gameId, move),
    onSuccess: (data) => {
      queryClient.setQueryData(gameQueryKey(gameId), data);
      onMoveSuccess();
      setErrorMessage(null);
      if (data.status === "finished") queryClient.invalidateQueries({ queryKey: activeGameQueryKey });
    },
    onError: (error) => {
      setErrorMessage(error.message);
      queryClient.invalidateQueries({ queryKey: gameQueryKey(gameId) });
    },
  });

  const retryMutation = useMutation<SubmitMoveResponse, ApiRequestError, void>({
    mutationFn: () => retryAiMove(gameId),
    onSuccess: (data) => {
      queryClient.setQueryData(gameQueryKey(gameId), data);
      moveMutation.reset();
      setErrorMessage(null);
      if (data.status === "finished") queryClient.invalidateQueries({ queryKey: activeGameQueryKey });
    },
    onError: (error) => setErrorMessage(error.message),
  });

  const resignMutation = useMutation<ResignResponse, ApiRequestError, void>({
    mutationFn: () => resignGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameQueryKey(gameId) });
      queryClient.invalidateQueries({ queryKey: activeGameQueryKey });
      onResignSuccess();
    },
    onError: (error) => setErrorMessage(error.message),
  });

  return { moveMutation, resignMutation, retryMutation };
};

export default useGameMutations;
