const AuthDivider = ({ text }: { text: string }) => (
  <div className="flex w-full items-center gap-3">
    <div className="bg-hairline h-px flex-1" />
    <p className="text-caption-1 text-muted-soft whitespace-nowrap">{text}</p>
    <div className="bg-hairline h-px flex-1" />
  </div>
);

export default AuthDivider;
