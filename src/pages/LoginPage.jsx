import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { setToken } from '../lib/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiPost('/api/auth/login', form)
      setToken(data?.accessToken)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message ?? '로그인에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-orbs" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <div className="login-layout">
        <section className="login-hero">
          <div className="login-brand">
            <span className="brand-badge">IH</span>
            <div>
              <p className="eyebrow">InterLinkHub</p>
              <h1>통합정보시스템</h1>
            </div>
          </div>

          <p className="login-copy">
            여러 시스템 사이의 업무를 한곳에서 등록하고, 실행하고, 다시 확인하는 화면입니다.
          </p>

          <div className="hero-feature-grid">
            <article className="hero-feature">
              <strong>한눈에 보기</strong>
              <span>등록된 업무와 상태를 한 화면에서 확인</span>
            </article>
            <article className="hero-feature">
              <strong>실행 확인</strong>
              <span>보낸 내용, 받은 내용, 처리 결과를 확인</span>
            </article>
            <article className="hero-feature">
              <strong>관리 도구</strong>
              <span>다시 실행, 스케줄 실행, 현황 확인까지 한곳에서 관리</span>
            </article>
          </div>

          <div className="hero-metric-row">
            <div>
              <span>업무 방식</span>
              <strong>REST / SOAP / MQ / 배치</strong>
            </div>
            <div>
              <span>이용 대상</span>
              <strong>담당자</strong>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-panel-header">
              <p className="eyebrow">접속</p>
              <h2>로그인</h2>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                아이디
                <input
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="아이디를 입력하세요"
                />
              </label>
              <label>
                비밀번호
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="비밀번호를 입력하세요"
                />
              </label>
              {error ? <p className="error-banner">{error}</p> : null}
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="login-footnote">
              승인된 사용자만 접속할 수 있습니다.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
