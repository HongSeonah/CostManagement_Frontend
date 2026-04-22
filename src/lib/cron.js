function pad(value) {
  return String(value).padStart(2, '0')
}

export const SCHEDULE_RULES = [
  { value: 'DAILY', label: '매일', description: '매일 같은 시각에 실행합니다.' },
  { value: 'EVERY_N_DAYS', label: 'N일마다', description: '설정한 날짜 간격으로 실행합니다.' },
  { value: 'WEEKLY', label: '매주', description: '특정 요일에 실행합니다.' },
  { value: 'MONTHLY', label: '매월', description: '특정 날짜에 실행합니다.' },
  { value: 'INTERVAL', label: '간격 실행', description: '분 또는 시간 단위로 반복합니다.' },
]

export const WEEKDAY_OPTIONS = [
  { value: 'MON', label: '월요일' },
  { value: 'TUE', label: '화요일' },
  { value: 'WED', label: '수요일' },
  { value: 'THU', label: '목요일' },
  { value: 'FRI', label: '금요일' },
  { value: 'SAT', label: '토요일' },
  { value: 'SUN', label: '일요일' },
]

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => ({
  value: String(index).padStart(2, '0'),
  label: `${String(index).padStart(2, '0')}시`,
}))

export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => ({
  value: String(index).padStart(2, '0'),
  label: `${String(index).padStart(2, '0')}분`,
}))

export const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}일`,
}))

export const INTERVAL_COUNT_OPTIONS = Array.from({ length: 60 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}`,
}))

export const INTERVAL_UNIT_OPTIONS = [
  { value: 'MINUTES', label: '분 간격' },
  { value: 'HOURS', label: '시간 간격' },
]

export function buildScheduleCronExpression(config) {
  const {
    rule,
    hour = '02',
    minute = '00',
    dayStep = '2',
    weekday = 'MON',
    monthDay = '1',
    intervalUnit = 'MINUTES',
    intervalCount = '30',
  } = config

  if (rule === 'EVERY_N_DAYS') {
    return `0 ${minute} ${hour} */${dayStep} * *`
  }

  if (rule === 'WEEKLY') {
    return `0 ${minute} ${hour} * * ${weekday}`
  }

  if (rule === 'MONTHLY') {
    return `0 ${minute} ${hour} ${monthDay} * *`
  }

  if (rule === 'INTERVAL') {
    if (intervalUnit === 'HOURS') {
      return `0 0 */${intervalCount} * * *`
    }
    return `0 0/${intervalCount} * * * *`
  }

  return `0 ${minute} ${hour} * * *`
}

export function parseScheduleExpression(cronExpression) {
  const fallback = {
    rule: 'DAILY',
    hour: '02',
    minute: '00',
    dayStep: '2',
    weekday: 'MON',
    monthDay: '1',
    intervalUnit: 'MINUTES',
    intervalCount: '30',
  }

  if (!cronExpression) {
    return fallback
  }

  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 6) {
    return fallback
  }

  const [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts
  const everyDay = dayOfMonth === '*' && month === '*' && dayOfWeek === '*'

  if (second === '0' && minute.includes('/') && hour === '*' && everyDay) {
    return {
      ...fallback,
      rule: 'INTERVAL',
      intervalUnit: 'MINUTES',
      intervalCount: minute.split('/')[1] || '30',
    }
  }

  if (second === '0' && minute === '0' && hour.includes('/') && everyDay) {
    return {
      ...fallback,
      rule: 'INTERVAL',
      intervalUnit: 'HOURS',
      intervalCount: hour.split('/')[1] || '1',
    }
  }

  if (second === '0' && dayOfMonth.startsWith('*/') && month === '*' && dayOfWeek === '*') {
    return {
      ...fallback,
      rule: 'EVERY_N_DAYS',
      hour,
      minute,
      dayStep: dayOfMonth.split('/')[1] || '2',
    }
  }

  if (second === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*' && hour !== '*') {
    return {
      ...fallback,
      rule: 'WEEKLY',
      hour,
      minute,
      weekday: dayOfWeek,
    }
  }

  if (second === '0' && dayOfMonth !== '*' && month === '*' && dayOfWeek === '*' && hour !== '*') {
    return {
      ...fallback,
      rule: 'MONTHLY',
      hour,
      minute,
      monthDay: dayOfMonth,
    }
  }

  if (second === '0' && everyDay && hour !== '*') {
    return {
      ...fallback,
      rule: 'DAILY',
      hour,
      minute,
    }
  }

  return fallback
}

export function formatCronExpression(cronExpression) {
  if (!cronExpression) {
    return '크론 표현식이 없습니다.'
  }

  const parsed = parseScheduleExpression(cronExpression)
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 6) {
    return `사용자 정의 스케줄 (${cronExpression})`
  }

  if (parsed.rule === 'INTERVAL') {
    if (parsed.intervalUnit === 'HOURS') {
      return `매 ${parsed.intervalCount}시간마다 실행`
    }
    return `매 ${parsed.intervalCount}분마다 실행`
  }

  if (parsed.rule === 'EVERY_N_DAYS') {
    return `매 ${parsed.dayStep}일마다 ${pad(parsed.hour)}:${pad(parsed.minute)}에 실행`
  }

  if (parsed.rule === 'WEEKLY') {
    const weekdayLabel = WEEKDAY_OPTIONS.find((item) => item.value === parsed.weekday)?.label ?? parsed.weekday
    return `매주 ${weekdayLabel} ${pad(parsed.hour)}:${pad(parsed.minute)}에 실행`
  }

  if (parsed.rule === 'MONTHLY') {
    return `매월 ${parsed.monthDay}일 ${pad(parsed.hour)}:${pad(parsed.minute)}에 실행`
  }

  if (parsed.rule === 'DAILY') {
    if (parsed.hour === '00' && parsed.minute === '00') {
      return '매일 자정 00:00:00에 실행'
    }
    return `매일 ${pad(parsed.hour)}:${pad(parsed.minute)}에 실행`
  }

  return `사용자 정의 스케줄 (${cronExpression})`
}
