const GameLoadError = () => (
  <div className="bg-surface-dark flex w-full flex-1 flex-col">
    <div className="border-hairline-dark h-16 border-b" />
    <p className="text-error p-8 text-[14px] font-semibold" role="alert">
      대국 정보를 불러오지 못했습니다.
    </p>
  </div>
);

export default GameLoadError;
