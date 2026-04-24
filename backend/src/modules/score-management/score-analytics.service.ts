import prisma from '../../shared/prisma/client.js'
import { ForbiddenError, NotFoundError } from '@stss/shared'
import type { Prisma } from '@prisma/client'

type JwtUser = {
  userId: string
  roles: string[]
}

const PASS_LINE = 60

const toNumber = (value: Prisma.Decimal | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null
  }
  return Number(value)
}

const round2 = (value: number): number => Math.round(value * 100) / 100

const isAdmin = (roles: string[]) =>
  roles.some((role) => role === 'admin' || role === 'super_admin')

const resolveStudentTarget = (user: JwtUser, studentId: string) => {
  if (isAdmin(user.roles)) {
    return
  }

  if (user.roles.includes('student') && user.userId === studentId) {
    return
  }

  throw new ForbiddenError('仅可查看本人的个人分析')
}

const buildDistribution = (scores: number[]) => {
  const ranges = [
    { range: '0-59', min: 0, max: 59.999 },
    { range: '60-69', min: 60, max: 69.999 },
    { range: '70-79', min: 70, max: 79.999 },
    { range: '80-89', min: 80, max: 89.999 },
    { range: '90-100', min: 90, max: 100 },
  ]

  return ranges.map((item) => ({
    range: item.range,
    count: scores.filter((score) => score >= item.min && score <= item.max).length,
  }))
}

export const scoreAnalyticsService = {
  async getCourseScoreAnalytics(user: JwtUser, courseOfferingId: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: {
          select: {
            name: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                realName: true,
              },
            },
          },
        },
      },
    })

    if (!offering) {
      throw new NotFoundError('开课', courseOfferingId)
    }

    if (
      !isAdmin(user.roles) &&
      (!user.roles.includes('teacher') || offering.teacherId !== user.userId)
    ) {
      throw new ForbiddenError('教师仅可查看自己任课课程分析')
    }

    const [totalStudents, submittedScores] = await Promise.all([
      prisma.enrollment.count({
        where: {
          courseOfferingId,
        },
      }),
      prisma.score.findMany({
        where: {
          courseOfferingId,
          status: {
            in: ['SUBMITTED', 'CONFIRMED'],
          },
          totalScore: {
            not: null,
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  realName: true,
                },
              },
            },
          },
        },
      }),
    ])

    const scoreValues = submittedScores.map((score) => Number(score.totalScore))
    const averageScore =
      scoreValues.length > 0
        ? round2(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length)
        : null
    const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : null
    const minScore = scoreValues.length > 0 ? Math.min(...scoreValues) : null
    const passCount = scoreValues.filter((score) => score >= PASS_LINE).length
    const failCount = scoreValues.filter((score) => score < PASS_LINE).length

    const rankingSorted = [...submittedScores].sort(
      (a, b) => Number(b.totalScore) - Number(a.totalScore)
    )
    const rankingTop10 = rankingSorted.slice(0, 10).map((score, index) => ({
      studentId: score.studentId,
      studentNumber: score.student.studentNumber,
      studentName: score.student.user.realName,
      totalScore: Number(score.totalScore),
      rank: index + 1,
    }))

    return {
      courseOfferingId,
      courseName: offering.course.name,
      teacherName: offering.teacher.user.realName,
      totalStudents,
      submittedCount: submittedScores.length,
      averageScore,
      maxScore,
      minScore,
      passCount,
      failCount,
      distribution: buildDistribution(scoreValues),
      rankingTop10,
    }
  },

  async getStudentScoreAnalytics(user: JwtUser, studentId: string) {
    resolveStudentTarget(user, studentId)

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: {
        user: {
          select: {
            realName: true,
          },
        },
      },
    })

    if (!student) {
      throw new NotFoundError('学生', studentId)
    }

    const scores = await prisma.score.findMany({
      where: {
        studentId,
        status: {
          in: ['SUBMITTED', 'CONFIRMED'],
        },
      },
      include: {
        courseOffering: {
          include: {
            course: {
              select: {
                courseType: true,
                credits: true,
              },
            },
            semester: {
              select: {
                id: true,
                name: true,
                startDate: true,
              },
            },
          },
        },
      },
    })

    const validScores = scores.filter((score) => score.totalScore !== null)
    const scoreValues = validScores.map((score) => Number(score.totalScore))

    const semesterMap = new Map<
      string,
      {
        semesterId: string
        semesterName: string
        startDate: Date
        totalScoreSum: number
        totalScoreCount: number
        gradePointCreditSum: number
        gradePointCredits: number
        earnedCredits: number
      }
    >()

    for (const score of validScores) {
      const semester = score.courseOffering.semester
      const semesterId = semester.id
      const current = semesterMap.get(semesterId) ?? {
        semesterId,
        semesterName: semester.name,
        startDate: semester.startDate,
        totalScoreSum: 0,
        totalScoreCount: 0,
        gradePointCreditSum: 0,
        gradePointCredits: 0,
        earnedCredits: 0,
      }

      const totalScore = Number(score.totalScore)
      const credits = Number(score.courseOffering.course.credits)

      current.totalScoreSum += totalScore
      current.totalScoreCount += 1

      if (score.gradePoint !== null) {
        current.gradePointCreditSum += Number(score.gradePoint) * credits
        current.gradePointCredits += credits
      }

      if (totalScore >= PASS_LINE) {
        current.earnedCredits += credits
      }

      semesterMap.set(semesterId, current)
    }

    const semesterTrend = Array.from(semesterMap.values())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((item) => ({
        semesterId: item.semesterId,
        semesterName: item.semesterName,
        gpa:
          item.gradePointCredits > 0
            ? round2(item.gradePointCreditSum / item.gradePointCredits)
            : null,
        averageScore:
          item.totalScoreCount > 0 ? round2(item.totalScoreSum / item.totalScoreCount) : null,
        earnedCredits: round2(item.earnedCredits),
      }))

    const typeMap = new Map<
      string,
      { earnedCredits: number; scoreSum: number; scoreCount: number }
    >()
    for (const score of validScores) {
      const courseType = score.courseOffering.course.courseType
      const current = typeMap.get(courseType) ?? { earnedCredits: 0, scoreSum: 0, scoreCount: 0 }
      const totalScore = Number(score.totalScore)
      const credits = Number(score.courseOffering.course.credits)

      if (totalScore >= PASS_LINE) {
        current.earnedCredits += credits
      }

      current.scoreSum += totalScore
      current.scoreCount += 1
      typeMap.set(courseType, current)
    }

    const courseTypeBreakdown = Array.from(typeMap.entries()).map(([courseType, value]) => ({
      courseType,
      earnedCredits: round2(value.earnedCredits),
      averageScore: value.scoreCount > 0 ? round2(value.scoreSum / value.scoreCount) : null,
    }))

    return {
      studentId,
      studentName: student.user.realName,
      semesterTrend,
      scoreDistribution: buildDistribution(scoreValues),
      courseTypeBreakdown,
    }
  },
}
