import { BrandLink } from "@/app/_components/ui/Link";

const COLUMNS = [
  { links: ["맹기 대국", "복기 분석", "난이도"], title: "제품" },
  { links: ["기보법 가이드", "자주 묻는 질문"], title: "리소스" },
  { links: ["이용약관", "개인정보 처리방침"], title: "정책" },
];

const Footer = () => (
  <footer className="bg-surface-dark w-full">
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-5 py-16 md:px-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className="flex flex-1 flex-col gap-3">
          <BrandLink href="/" tone="light" />
          <p className="text-body-3 text-on-dark-soft max-w-[142px]">보드 없이 두는 맹기 체스.</p>
        </div>

        {COLUMNS.map(({ links, title }) => (
          <div className="flex flex-1 flex-col gap-2.5" key={title}>
            <p className="text-caption-3 text-on-dark">{title}</p>
            {links.map((link) => (
              <p className="text-body-3 text-on-dark-soft" key={link}>
                {link}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-hairline-dark h-px w-full" />
      <p className="text-body-3 text-notation-muted">© 2026 AX Chess</p>
    </div>
  </footer>
);

export default Footer;
