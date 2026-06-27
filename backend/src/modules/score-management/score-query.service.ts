import prisma from '../../shared/prisma/client.js'
import { ForbiddenError, NotFoundError } from '@stss/shared'
import type { MyScoresQuery } from './score-query.types.js'
import type { Prisma } from '@prisma/client'
import {
  PASS_LINE,
  SUBMITTED_SCORE_STATUSES,
  pickEffectiveScoresByCourse,
  round2,
  toNumber,
} from './score-statistics.js'

type JwtUser = {
  userId: string
  roles: string[]
}

const resolveAccessibleStudentId = async (user: JwtUser, targetStudentId?: string) => {
  const isAdmin = user.roles.some((role) => role === 'admin' || role === 'super_admin')
  const isStudent = user.roles.includes('student')

  if (targetStudentId) {
    if (isAdmin) {
      return targetStudentId
    }

    if (isStudent && user.userId === targetStudentId) {
      return targetStudentId
    }

    throw new ForbiddenError('仅可查看本人成绩摘要')
  }

  if (isAdmin) {
    throw new ForbiddenError('管理员查询该接口需要指定 studentId')
  }

  if (!isStudent) {
    throw new ForbiddenError('仅学生可访问此接口')
  }

  return user.userId
}

export const scoreQueryService = {
  async getMyScores(user: JwtUser, query: MyScoresQuery) {
    const studentId = await resolveAccessibleStudentId(user)
    const page = Number(query.page) || 1
    const pageSize = Number(query.pageSize) || 20
    const { semesterId, keyword } = query
    const skip = (page - 1) * pageSize

    const where: Prisma.ScoreWhereInput = {
      studentId,
      status: {
        in: [...SUBMITTED_SCORE_STATUSES],
      },
    }

    if (semesterId || keyword) {
      where.courseOffering = {}
      if (semesterId) {
        where.courseOffering.semesterId = semesterId
      }
      if (keyword) {
        where.courseOffering.course = {
          OR: [{ name: { contains: keyword } }, { code: { contains: keyword } }],
        }
      }
    }

    const [scores, total, allVisibleScores] = await Promise.all([
      prisma.score.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          enrollment: true,
          courseOffering: {
            include: {
              course: true,
              semester: true,
            },
          },
        },
        orderBy: [{ enteredAt: 'desc' }, { id: 'asc' }],
      }),
      prisma.score.count({ where }),
      prisma.score.findMany({
        where: {
          studentId,
          status: {
            in: [...SUBMITTED_SCORE_STATUSES],
          },
          totalScore: {
            not: null,
          },
        },
        include: {
          courseOffering: {
            include: {
              course: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
    ])

    const effectiveScoreIds = new Set(
      pickEffectiveScoresByCourse(allVisibleScores).map((score) => score.id)
    )

    const items = scores.map((score) => ({
      scoreId: score.id,
      enrollmentId: score.enrollmentId,
      courseOfferingId: score.courseOfferingId,
      courseId: score.courseOffering.courseId,
      courseCode: score.courseOffering.course.code,
      courseName: score.courseOffering.course.name,
      credits: toNumber(score.courseOffering.course.credits),
      courseType: score.courseOffering.course.courseType,
      semesterId: score.courseOffering.semesterId,
      semesterName: score.courseOffering.semester.name,
      usualScore: toNumber(score.usualScore),
      midtermScore: toNumber(score.midtermScore),
      finalScore: toNumber(score.finalScore),
      totalScore: toNumber(score.totalScore),
      gradePoint: toNumber(score.gradePoint),
      gradeLetter: score.gradeLetter,
      status: score.status,
      hasPendingModificationRequest: Boolean(score.modificationRequest),
      isEffective: effectiveScoreIds.has(score.id),
    }))

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  async getStudentScoreSummary(user: JwtUser, targetStudentId?: string) {
    const studentId = await resolveAccessibleStudentId(user, targetStudentId)

    const student = await prisma.student.findUnique({
      where: { userId: studentId },
      include: {
        user: {
          select: {
            realName: true,
          },
        },
        major: {
          include: {
            curriculums: {
              include: {
                courses: {
                  include: {
                    course: {
                      select: {
                        id: true,
                        credits: true,
                        courseType: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                year: 'desc',
              },
              take: 1,
            },
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
          in: [...SUBMITTED_SCORE_STATUSES],
        },
      },
      include: {
        courseOffering: {
          include: {
            course: {
              select: {
                id: true,
                credits: true,
                courseType: true,
              },
            },
          },
        },
      },
    })

    const validScores = pickEffectiveScoresByCourse(scores)
    const passedScores = validScores.filter((score) => Number(score.totalScore) >= PASS_LINE)

    const scoreSum = validScores.reduce((sum, score) => sum + Number(score.totalScore), 0)
    const avgScore = validScores.length > 0 ? round2(scoreSum / validScores.length) : null

    let weightedGradePointSum = 0
    let weightedCredits = 0
    for (const score of validScores) {
      if (score.gradePoint === null) {
        continue
      }
      const credits = Number(score.courseOffering.course.credits)
      weightedGradePointSum += Number(score.gradePoint) * credits
      weightedCredits += credits
    }
    const gpa = weightedCredits > 0 ? round2(weightedGradePointSum / weightedCredits) : null

    const passedCredits = round2(
      passedScores.reduce((sum, score) => sum + Number(score.courseOffering.course.credits), 0)
    )
    const earnedCredits = round2(
      validScores.reduce((sum, score) => sum + Number(score.courseOffering.course.credits), 0)
    )

    const activeCurriculum = student.major?.curriculums?.[0]
    const totalRequiredCredits = activeCurriculum ? Number(activeCurriculum.totalCredits) : null
    const requiredCredits = activeCurriculum?.requiredCredits
      ? Number(activeCurriculum.requiredCredits)
      : null
    const electiveCredits = activeCurriculum?.electiveCredits
      ? Number(activeCurriculum.electiveCredits)
      : null
    const curriculumCourseIds = new Set(
      activeCurriculum?.courses.map((item) => item.courseId) ?? []
    )
    const curriculumRequiredCourseIds = new Set(
      activeCurriculum?.courses
        .filter((item) => item.courseType === 'REQUIRED')
        .map((item) => item.courseId) ?? []
    )
    const curriculumElectiveCourseIds = new Set(
      activeCurriculum?.courses
        .filter((item) => item.courseType !== 'REQUIRED')
        .map((item) => item.courseId) ?? []
    )
    const curriculumPassedCredits = round2(
      passedScores
        .filter((score) => curriculumCourseIds.has(score.courseOffering.course.id))
        .reduce((sum, score) => sum + Number(score.courseOffering.course.credits), 0)
    )
    const curriculumRequiredPassedCredits = round2(
      passedScores
        .filter((score) => curriculumRequiredCourseIds.has(score.courseOffering.course.id))
        .reduce((sum, score) => sum + Number(score.courseOffering.course.credits), 0)
    )
    const curriculumElectivePassedCredits = round2(
      passedScores
        .filter((score) => curriculumElectiveCourseIds.has(score.courseOffering.course.id))
        .reduce((sum, score) => sum + Number(score.courseOffering.course.credits), 0)
    )

    const completedCurriculumCourseIds = new Set(
      passedScores
        .filter((score) => curriculumCourseIds.has(score.courseOffering.course.id))
        .map((score) => score.courseOffering.course.id)
    )
    const completedCurriculumCourseCount = completedCurriculumCourseIds.size
    const curriculumCourseCount = activeCurriculum?.courses.length ?? 0

    const completedCourseIds = new Set(validScores.map((score) => score.courseOffering.course.id))
    const enrolledCourseIds = new Set<string>()
    const inProgressEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'ENROLLED',
        courseOffering: {
          courseId: {
            notIn: Array.from(completedCourseIds),
          },
        },
      },
      include: {
        courseOffering: {
          include: {
            course: {
              select: {
                id: true,
                credits: true,
              },
            },
          },
        },
      },
    })

    const inProgressCredits = round2(
      inProgressEnrollments.reduce((sum, enrollment) => {
        const course = enrollment.courseOffering.course
        if (enrolledCourseIds.has(course.id)) {
          return sum
        }

        enrolledCourseIds.add(course.id)
        return sum + Number(course.credits)
      }, 0)
    )
    const remainingRequiredCredits =
      totalRequiredCredits === null
        ? null
        : round2(Math.max(totalRequiredCredits - curriculumPassedCredits, 0))

    return {
      studentId,
      studentName: student.user.realName,
      majorName: student.major?.name ?? null,
      grade: student.grade,
      totalRequiredCredits,
      earnedCredits,
      passedCredits,
      inProgressCredits,
      remainingRequiredCredits,
      gpa,
      averageScore: avgScore,
      passedCourseCount: passedScores.length,
      failedCourseCount: validScores.filter((score) => Number(score.totalScore) < PASS_LINE).length,
      effectiveScoreRule: '同一课程多次成绩按最高总评计入统计；总评相同时取最近修改或录入记录',
      curriculumProgress: {
        curriculumId: activeCurriculum?.id ?? null,
        curriculumName: activeCurriculum?.name ?? null,
        totalRequiredCredits,
        requiredCredits,
        electiveCredits,
        passedCredits: curriculumPassedCredits,
        requiredPassedCredits: curriculumRequiredPassedCredits,
        electivePassedCredits: curriculumElectivePassedCredits,
        remainingRequiredCredits,
        curriculumCourseCount,
        completedCurriculumCourseCount,
        completionRate:
          totalRequiredCredits && totalRequiredCredits > 0
            ? round2((curriculumPassedCredits / totalRequiredCredits) * 100)
            : null,
      },
    }
  },
}
