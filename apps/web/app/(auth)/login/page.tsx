import { AuthPanel } from "@/app/_components/auth";
import { SocialAuth } from "@/app/_components/auth/SocialAuth";
import { MoveListPreview } from "@/app/_components/ui/MoveListPreview";

const MOVE_LIST = [
  { black: "e5", no: 1, white: "e4" },
  { black: "Nc6", no: 2, white: "Nf3" },
  { black: "a6", no: 3, white: "Bb5" },
  { black: "Nf6", no: 4, white: "Ba4" },
  { black: "Be7", no: 5, white: "O-O" },
  { black: "b5", no: 6, white: "Re1" },
  { black: "d6", no: 7, white: "Bb3" },
];

const LoginPage = () => {
  return (
    <div className="flex w-full">
      <div className="flex flex-1 items-center justify-center px-6 py-16 md:px-14">
        <section className="w-full max-w-[384px]">
          <header className="mb-7 flex flex-col gap-2">
            <h1 className="text-title-2 text-ink font-semibold">로그인 · 회원가입</h1>
            <p className="text-body-3 text-muted">
              Google 계정으로 계속하세요. 처음이라면 닉네임 설정 후 가입이 완료됩니다.
            </p>
          </header>
          <SocialAuth />
        </section>
      </div>

      <AuthPanel
        body={<MoveListPreview highlightLast rows={MOVE_LIST} />}
        eyebrow="진행 중인 대국"
        footer="로그인하면 기보가 그대로 복원됩니다. 보드는 여전히 없습니다."
        title={
          <>
            14수째.
            <br />
            백, Normal.
          </>
        }
      />
    </div>
  );
};

export default LoginPage;
