import type { Prisma } from '@prisma/client'

export const PASS_LINE = 60

export const SUBMITTED_SCORE_STATUSES = ['SUBMITTED', 'CONFIRMED'] as const

export const round2 = (value: number): number => Math.round(value * 100) / 100

export const toNumber = (value: Prisma.Decimal | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  return Number(value)
}

type EffectiveScoreCandidate = {
  id: string
  totalScore: Prisma.Decimal | number | null
  enteredAt?: Date | null
  modifiedAt?: Date | null
  courseOffering: {
    courseId?: string | null
    course: {
      id: string
    }
  }
}

const scoreTimestamp = (score: EffectiveScoreCandidate): number =>
  (score.modifiedAt ?? score.enteredAt ?? new Date(0)).getTime()

const courseIdOf = (score: EffectiveScoreCandidate): string =>
  score.courseOffering.courseId ?? score.courseOffering.course.id

const isBetterEffectiveScore = (
  candidate: EffectiveScoreCandidate,
  current: EffectiveScoreCandidate
): boolean => {
  const candidateScore = toNumber(candidate.totalScore)
  const currentScore = toNumber(current.totalScore)

  if (candidateScore === null) {
    return false
  }

  if (currentScore === null || candidateScore > currentScore) {
    return true
  }

  if (candidateScore < currentScore) {
    return false
  }

  return scoreTimestamp(candidate) > scoreTimestamp(current)
}

export const pickEffectiveScoresByCourse = <T extends EffectiveScoreCandidate>(
  scores: T[]
): T[] => {
  const effectiveByCourse = new Map<string, T>()

  for (const score of scores) {
    if (score.totalScore === null) {
      continue
    }

    const courseId = courseIdOf(score)
    const current = effectiveByCourse.get(courseId)

    if (!current || isBetterEffectiveScore(score, current)) {
      effectiveByCourse.set(courseId, score)
    }
  }

  return Array.from(effectiveByCourse.values())
}
