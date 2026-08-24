import ReviewScreen from "./ReviewScreen";

const ReviewPage = async (props: PageProps<"/games/[id]/review">) => {
  const { id } = await props.params;
  return <ReviewScreen gameId={id} />;
};

export default ReviewPage;
