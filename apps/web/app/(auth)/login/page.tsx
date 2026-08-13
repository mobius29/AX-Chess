import { Button } from "@/app/_components/Button";
import { Form, FormField } from "@/app/_components/Form";
import { BrandLink, Link } from "@/app/_components/Link";
import { Body, Title } from "@/app/_components/Typography";

export default function LoginPage() {
  return (
    <section className="w-full max-w-[380px]">
      <BrandLink className="mb-12" href="/" />

      <header className="mb-8">
        <Title className="text-ink" level={3}>다시 두었던 곳부터</Title>
        <Body className="mt-3 text-muted" level={3}>진행 중이던 대국이 있으면 그대로 이어서 둘 수 있습니다.</Body>
      </header>

      <Form>
        <FormField autoComplete="email" label="이메일" name="email" placeholder="you@example.com" required type="email" />
        <FormField autoComplete="current-password" label="비밀번호" name="password" required type="password" />
        <Button type="submit">로그인</Button>
      </Form>

      <p className="mt-6 text-center text-caption-1 text-muted">
        처음이신가요?{" "}
        <Link href="/sign-up" variant="text">
          회원가입
        </Link>
      </p>
    </section>
  );
}
