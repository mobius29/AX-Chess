import GameScreen from "./GameScreen";

const GamePage = async (props: PageProps<"/games/[id]">) => {
  const { id } = await props.params;
  return <GameScreen gameId={id} />;
};

export default GamePage;
