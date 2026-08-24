const FEATURES = [
  {
    body: "기물 배치, 좌표 그리드, 이동 가능 칸 표시 없음. 서버는 FEN도 유효수 목록도 내려보내지 않습니다.",
    glyph: "□",
    title: "대국 중 보드 없음",
  },
  {
    body: "상대는 항상 서버 안의 Stockfish입니다. 가입 직후 바로 한 판, 응수는 P95 2초 이내.",
    glyph: "◇",
    title: "기다리는 시간 없음",
  },
  {
    body: "복기 화면에서 수순을 되짚어보며 어느 수에서 머릿속 보드가 틀어졌는지 확인합니다.",
    glyph: "○",
    title: "끝나면 판이 열린다",
  },
];

const IdentityBand = () => (
  <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-5 py-16 md:px-10 md:py-24" id="identity">
    <div className="flex flex-col gap-4">
      <p className="text-caption-3 text-muted">제품 정체성</p>
      <h2 className="text-title-2 text-ink font-semibold">빼낸 것이 제품이다.</h2>
      <p className="text-body-2 text-body">
        보드를 지우면 체스의 난이도가 올라가는 게 아니라, 다른 게임이 됩니다. AX Chess는 그 다른 게임 하나만 만듭니다.
      </p>
    </div>

    <div className="grid w-full gap-6 md:grid-cols-3">
      {FEATURES.map(({ body, glyph, title }) => (
        <div className="bg-surface-card flex flex-col gap-4 rounded-lg p-8" key={title}>
          <span
            aria-hidden="true"
            className="bg-surface-cream-strong text-ink flex size-[34px] items-center justify-center rounded-md text-[17px]"
          >
            {glyph}
          </span>
          <p className="text-title-5 text-ink">{title}</p>
          <p className="text-body-3 text-body">{body}</p>
        </div>
      ))}
    </div>
  </section>
);

export default IdentityBand;
