/**
 * Verifies C group load-test enrollment counts after a pressure test.
 *
 * Run inside Docker:
 * pnpm --filter @stss/server exec tsx prisma/verify-c-load.ts
 */
import { EnrollmentStatus, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const readRequiredEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

const readExpectedNumber = (name: string): number => {
  const raw = readRequiredEnv(name)
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
  return value
}

async function main() {
  const offeringId = readRequiredEnv('C_LOAD_VERIFY_OFFERING_ID')
  const expectedEnrolled = readExpectedNumber('C_LOAD_EXPECTED_ENROLLED')
  const maxEnrolled = process.env.C_LOAD_MAX_ENROLLED
    ? readExpectedNumber('C_LOAD_MAX_ENROLLED')
    : expectedEnrolled

  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: {
      id: true,
      capacity: true,
      enrolledCount: true,
    },
  })

  if (!offering) {
    throw new Error(`CourseOffering not found: ${offeringId}`)
  }

  const enrolledRecords = await prisma.enrollment.count({
    where: {
      courseOfferingId: offeringId,
      status: EnrollmentStatus.ENROLLED,
    },
  })

  if (enrolledRecords !== expectedEnrolled) {
    throw new Error(
      `Expected ${expectedEnrolled} ENROLLED records, got ${enrolledRecords}`
    )
  }

  if (offering.enrolledCount !== enrolledRecords) {
    throw new Error(
      `CourseOffering.enrolled_count ${offering.enrolledCount} does not match ENROLLED records ${enrolledRecords}`
    )
  }

  if (enrolledRecords > maxEnrolled || enrolledRecords > offering.capacity) {
    throw new Error(
      `Over-enrolled: records=${enrolledRecords}, max=${maxEnrolled}, capacity=${offering.capacity}`
    )
  }

  console.log('C load-test enrollment verification OK')
  console.log(`  offering_id: ${offering.id}`)
  console.log(`  capacity: ${offering.capacity}`)
  console.log(`  enrolled_count: ${offering.enrolledCount}`)
  console.log(`  enrolled_records: ${enrolledRecords}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
