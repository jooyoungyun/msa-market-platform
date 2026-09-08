'use client';

import { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMarket } from '@/context/MarketProvider';

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, busy, login, currentUserName } = useMarket();
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await loginUser({ email: String(fd.get('email')), password: String(fd.get('password')) });
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      router.replace(next);
    } catch { /* provider handles */ }
  };
  return <section className="page-width login-route"><div className="modal login-modal route-login-card"><div className="modal-brand"><span className="brand-mark">M</span><div><strong>MSA MARKET</strong><small>Next.js Login Route</small></div></div><h1>{login.userId ? `${currentUserName || '회원'}님 로그인 중` : '다시 만나서 반갑습니다.'}</h1><p>Spring Security 로그인 후 Response Header의 JWT를 sessionStorage에 저장합니다.</p><form onSubmit={submit}><label>이메일<input name="email" type="email" defaultValue="test@test.com" required /></label><label>비밀번호<input name="password" type="password" defaultValue="test1234" required /></label><button type="submit" className="login-submit" disabled={busy}>{busy ? '처리 중...' : '로그인'}</button></form><div className="demo-account"><span>DEMO</span><p><strong>test@test.com</strong><small>password · test1234</small></p></div></div></section>;
}
