/**
 * C1/C2 手动验收用种子数据（可重复执行）。
 * 命令：pnpm --filter @stss/server db:seed:c1c2
 */
import {
    AdminType,
    CourseType,
    EnrollmentStatus,
    OfferingStatus,
    PrismaClient,
    RoomType,
    SelectionPhase,
    SemesterStatus,
    CourseStatus,
    RoomStatus
} from '@prisma/client'

const prisma = new PrismaClient()

const semester1 = '00000000-0000-0000-0000-000000000001'
const semester2 = '00000000-0000-0000-0000-000000000002'

const courseOffering1 = '11111111-1111-1111-1111-111111111111'
const courseOffering2 = '22222222-2222-2222-2222-222222222222'
const courseOffering3 = '33333333-3333-3333-3333-333333333333'
const courseOffering4 = '44444444-4444-4444-4444-444444444444'
const courseOffering5 = '55555555-5555-5555-5555-555555555555'
const courseOffering6 = '66666666-6666-6666-6666-666666666666'
const courseOffering7 = '77777777-7777-7777-7777-777777777777'
const courseOffering8 = '88888888-8888-8888-8888-888888888888'
const courseOffering9 = '99999999-9999-9999-9999-999999999999'

async function main() {
    const studentUser = await prisma.user.findUnique({ where: { username: 'student' } })
    const teacherUser = await prisma.user.findUnique({ where: { username: 'teacher' } })
    if (!studentUser || !teacherUser) {
        throw new Error('Run db:seed first (student/teacher users missing)')
    }

    await prisma.schedule.deleteMany()
    await prisma.classroom.deleteMany()
    await prisma.coursePrerequisite.deleteMany()
    await prisma.enrollment.deleteMany()
    await prisma.curriculumCourse.deleteMany()
    await prisma.schedule.deleteMany()
    await prisma.courseOffering.deleteMany()
    await prisma.student.deleteMany()
    await prisma.teacher.deleteMany()
    await prisma.course.deleteMany()
    await prisma.curriculum.deleteMany()
    await prisma.major.deleteMany()
    await prisma.department.deleteMany()
    await prisma.semester.deleteMany()
    await prisma.classroom.deleteMany()

    await prisma.department.upsert({
        where: { id: 'departmentId' },
        update: {
        },
        create: {
            id: 'departmentId',
            name: 'CS'
        }
    })

    await prisma.major.upsert({
        where: { id: 'majorId' },
        update: {
        },
        create: {
            id: 'majorId',
            name: 'CS',
            departmentId: 'departmentId'
        }
    })

    await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {
        },
        create: {
            userId: studentUser.id,
            studentNumber: '20260001',
            majorId: 'majorId',
            grade: 2026,
            className: 'CS-1'
        }
    })

    await prisma.teacher.upsert({
        where: { userId: teacherUser.id },
        update: {
        },
        create: {
            userId: teacherUser.id,
            teacherNumber: '20260001',
            departmentId: 'departmentId'
        }
    })

    await prisma.course.upsert({
        where: { id: 'course1' },
        update: {
        },
        create: {
            id: 'course1',
            code: 'course1',
            name: 'course1',
            credits: 1,
            courseType: CourseType.REQUIRED,
            departmentId: 'departmentId',
            teacherId: teacherUser.id
        }
    })

    await prisma.course.upsert({
        where: { id: 'course2' },
        update: {
        },
        create: {
            id: 'course2',
            code: 'course2',
            name: 'course2',
            credits: 2,
            courseType: CourseType.ELECTIVE,
            departmentId: 'departmentId'
        }
    })

    await prisma.course.upsert({
        where: { id: 'course3' },
        update: {
        },
        create: {
            id: 'course3',
            code: 'course3',
            name: 'course3',
            credits: 3,
            courseType: CourseType.GENERAL,
            departmentId: 'departmentId',
            status: CourseStatus.ARCHIVED
        }
    })

    await prisma.course.upsert({
        where: { id: 'course4' },
        update: {
        },
        create: {
            id: 'course4',
            code: 'course4',
            name: 'course4',
            credits: 4,
            courseType: CourseType.GENERAL
        }
    })

    await prisma.course.upsert({
        where: { id: 'course5' },
        update: {
        },
        create: {
            id: 'course5',
            code: 'course5',
            name: 'course5',
            credits: 5,
            courseType: CourseType.GENERAL
        }
    })

    await prisma.course.upsert({
        where: { id: 'course6' },
        update: {
        },
        create: {
            id: 'course6',
            code: 'course6',
            name: 'course6',
            credits: 6,
            courseType: CourseType.GENERAL
        }
    })

    await prisma.course.upsert({
        where: { id: 'course7' },
        update: {
        },
        create: {
            id: 'course7',
            code: 'course7',
            name: 'course7',
            credits: 7,
            courseType: CourseType.GENERAL
        }
    })

    await prisma.curriculum.upsert({
        where: { id: 'curriculumId' },
        update: {
        },
        create: {
            id: 'curriculumId',
            majorId: 'majorId',
            name: 'curriculum-CS-2026',
            year: 2026,
            totalCredits: 100,
            requiredCredits: 50
        }
    })

    await prisma.curriculumCourse.upsert({
        where: {
            curriculumId_courseId: {
                curriculumId: 'curriculumId',
                courseId: 'course1'
            }
        },
        update: {
        },
        create: {
            curriculumId: 'curriculumId',
            courseId: 'course1',
            courseType: CourseType.REQUIRED
        }
    })

    await prisma.curriculumCourse.upsert({
        where: {
            curriculumId_courseId: {
                curriculumId: 'curriculumId',
                courseId: 'course2'
            }
        },
        update: {
        },
        create: {
            curriculumId: 'curriculumId',
            courseId: 'course2',
            courseType: CourseType.ELECTIVE
        }
    })

    await prisma.curriculumCourse.upsert({
        where: {
            curriculumId_courseId: {
                curriculumId: 'curriculumId',
                courseId: 'course5'
            }
        },
        update: {
        },
        create: {
            curriculumId: 'curriculumId',
            courseId: 'course5',
            courseType: CourseType.GENERAL
        }
    })

    await prisma.curriculumCourse.upsert({
        where: {
            curriculumId_courseId: {
                curriculumId: 'curriculumId',
                courseId: 'course6'
            }
        },
        update: {
        },
        create: {
            curriculumId: 'curriculumId',
            courseId: 'course6',
            courseType: CourseType.GENERAL
        }
    })

    const now = new Date()

    await prisma.semester.upsert({
        where: {
            id: semester1
        },
        update: {
        },
        create: {
            id: semester1,
            name: 'semester1',
            startDate: new Date(now.getTime() - 200 * 86400000),
            endDate: new Date(now.getTime() - 100 * 86400000),
            status: SemesterStatus.ENDED
        }
    })

    await prisma.semester.upsert({
        where: {
            id: semester2
        },
        update: {
        },
        create: {
            id: semester2,
            name: 'semester2',
            startDate: new Date(now.getTime() - 50 * 86400000),
            endDate: new Date(now.getTime() + 50 * 86400000),
            status: SemesterStatus.CURRENT
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering1
        },
        update: {
        },
        create: {
            id: courseOffering1,
            courseId: 'course1',
            semesterId: semester1,
            teacherId: teacherUser.id,
            capacity: 100,
            enrolledCount: 10,
            status: OfferingStatus.CLOSED
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering2
        },
        update: {
        },
        create: {
            id: courseOffering2,
            courseId: 'course2',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 200,
            enrolledCount: 20
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering3
        },
        update: {
        },
        create: {
            id: courseOffering3,
            courseId: 'course2',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 300,
            enrolledCount: 300,
            status: OfferingStatus.OPEN
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering4
        },
        update: {
        },
        create: {
            id: courseOffering4,
            courseId: 'course2',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 400,
            enrolledCount: 44,
            status: OfferingStatus.OPEN
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering5
        },
        update: {
        },
        create: {
            id: courseOffering5,
            courseId: 'course1',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 500,
            enrolledCount: 55,
            status: OfferingStatus.OPEN
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering6
        },
        update: {
        },
        create: {
            id: courseOffering6,
            courseId: 'course4',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 600,
            enrolledCount: 6,
            status: OfferingStatus.OPEN
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering7
        },
        update: {
        },
        create: {
            id: courseOffering7,
            courseId: 'course5',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 700,
            enrolledCount: 7,
            status: OfferingStatus.OPEN
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering8
        },
        update: {
        },
        create: {
            id: courseOffering8,
            courseId: 'course6',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 800,
            enrolledCount: 8,
            status: OfferingStatus.OPEN
        }
    })

    await prisma.courseOffering.upsert({
        where: {
            id: courseOffering9
        },
        update: {
        },
        create: {
            id: courseOffering9,
            courseId: 'course7',
            semesterId: semester2,
            teacherId: teacherUser.id,
            capacity: 900,
            enrolledCount: 9,
            status: OfferingStatus.OPEN
        }
    })

    await prisma.enrollment.upsert({
        where: {
            id: 'enrollment1'
        },
        update: {
        },
        create: {
            id: 'enrollment1',
            studentId: studentUser.id,
            courseOfferingId: courseOffering1,
            status: EnrollmentStatus.ENROLLED
        }
    })

    await prisma.enrollment.upsert({
        where: {
            id: 'enrollment2'
        },
        update: {
        },
        create: {
            id: 'enrollment2',
            studentId: studentUser.id,
            courseOfferingId: courseOffering2,
            status: EnrollmentStatus.DROPPED
        }
    })

    await prisma.enrollment.upsert({
        where: {
            id: 'enrollment3'
        },
        update: {
        },
        create: {
            id: 'enrollment3',
            studentId: studentUser.id,
            courseOfferingId: courseOffering8,
            status: EnrollmentStatus.ENROLLED
        }
    })

    await prisma.coursePrerequisite.upsert({
        where: {
            courseId_prerequisiteId: {
                courseId: 'course5',
                prerequisiteId: 'course2'
            }
        },
        update: {
        },
        create: {
            courseId: 'course5',
            prerequisiteId: 'course2'
        }
    })

    await prisma.classroom.upsert({
        where: {
            id: 'classroomId'
        },
        update: {
        },
        create: {
            id: 'classroomId',
            building: 'building',
            roomNumber: '101',
            campus: 'campus',
            capacity: 100,
            roomType: RoomType.LAB,
            status: RoomStatus.AVAILABLE
        }
    })

    await prisma.schedule.upsert({
        where: {
            id: 'schedule1'
        },
        update: {
        },
        create: {
            id: 'schedule1',
            courseOfferingId: courseOffering8,
            classroomId: 'classroomId',
            dayOfWeek: 1,
            startWeek: 1,
            endWeek: 2,
            startPeriod: 1,
            endPeriod: 2,
            notes: 'notes'
        }
    })

    await prisma.schedule.upsert({
        where: {
            id: 'schedule2'
        },
        update: {
        },
        create: {
            id: 'schedule2',
            courseOfferingId: courseOffering9,
            classroomId: 'classroomId',
            dayOfWeek: 1,
            startWeek: 2,
            endWeek: 3,
            startPeriod: 2,
            endPeriod: 3
        }
    })

    console.log('✅ C1/C2 verify seed OK')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())