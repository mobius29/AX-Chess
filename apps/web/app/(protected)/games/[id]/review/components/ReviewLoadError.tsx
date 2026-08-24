import { Caption } from "@/app/_components/ui/Typography";

const ReviewLoadError = ({ message }: { message: string }) => (
  <section className="mx-auto w-full max-w-[640px] flex-1 px-5 py-12 md:px-10">
    <Caption role="alert" tone="error">
      {message}
    </Caption>
  </section>
);

export default ReviewLoadError;
