import { Caption } from "@/app/_components/ui/Typography";

const GameLoadError = () => (
  <section className="mx-auto w-full max-w-[640px] flex-1 px-5 py-12 md:px-10">
    <Caption role="alert" tone="error">
      대국 정보를 불러오지 못했습니다.
    </Caption>
  </section>
);

export default GameLoadError;
