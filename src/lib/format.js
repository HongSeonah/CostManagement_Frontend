export function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value ?? 0)
}

export function formatCurrency(value) {
  return `₩${formatNumber(value)}`
}

export function formatSignedCurrency(value) {
  const amount = Number(value ?? 0)
  const formatted = formatCurrency(Math.abs(amount))
  return amount < 0 ? `-${formatted}` : formatted
}

export function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR').format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatStatus(value) {
  const labels = {
    ACTIVE: '진행',
    ON_HOLD: '보류',
    CLOSED: '종료',
  }
  return labels[value] ?? value ?? '-'
}

export function formatCategory(value) {
  const labels = {
    PERSONNEL: '인건비',
    INFRASTRUCTURE: '인프라',
    OUTSOURCING: '외주',
    MARKETING: '마케팅',
    OTHER: '기타',
  }
  return labels[value] ?? value ?? '-'
}

export function formatPercent(value) {
  const number = Number(value ?? 0)
  return `${new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(number)}%`
}

export function formatEmployeeStatus(value) {
  const labels = {
    ACTIVE: '재직',
    ON_LEAVE: '휴직',
    LEFT: '퇴사',
  }
  return labels[value] ?? value ?? '-'
}

export function formatBasisType(value) {
  const labels = {
    BUSINESS_UNIT: '본부 기준',
    PROJECT: '프로젝트 기준',
    EMPLOYEE: '인력 기준',
  }
  return labels[value] ?? value ?? '-'
}
