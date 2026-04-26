import { v4 as uuidv4 } from 'uuid'
import prisma from '../../../shared/prisma/client.js'
import { ruleService } from '../rules/rule.service.js'
import {
  ScheduleFailure,
  CreateTaskInput,
  TaskIdInput,
  AutoScheduleTaskResponse,
  ApplyTaskResponse,
  ScheduleSuccess,
} from './auto-schedule.types.js'
import { TimeSlot } from '../rules/rule.types.js'
import { Classroom } from '@prisma/client'
import { Schedule } from '../auto-schedule/auto-schedule.types.js'

const taskMap = new Map<string, AutoScheduleTaskResponse>()

export class AutoScheduleService {
  // 6.4.1 创建排课任务
  async createSchedulingTask(input: CreateTaskInput): Promise<AutoScheduleTaskResponse> {
    const taskId = uuidv4()
    const newTask: AutoScheduleTaskResponse = {
      taskId,
      status: 'queued',
      progress: 0,
      semesterId: input.semesterId,
    }
    taskMap.set(taskId, newTask)
    this.runAlgorithm(taskId, input) // 异步启动
    return newTask
  }
  // 6.4.2 查询任务状态
  async getTaskStatus(input: TaskIdInput): Promise<AutoScheduleTaskResponse> {
    const task = taskMap.get(input.taskId)
    if (!task) throw new Error('Task not found')
    return task
  }
  // 6.4.3 获取排课预览结果
  async getTaskPreview(input: TaskIdInput): Promise<AutoScheduleTaskResponse> {
    const task = taskMap.get(input.taskId)
    if (!task || task.status !== 'completed') throw new Error('Task results not ready')
    // 返回 task.result 而不是整个 task 对象
    return task
  }
  //6.4.4 应用排课结果
  async applyResults(input: TaskIdInput): Promise<ApplyTaskResponse> {
    const task = taskMap.get(input.taskId)
    if (!task || !task.result) throw new Error('No results to apply')

    // 事务写入 Schedule 表
    const created = await prisma.schedule.createMany({
      data: task.result.schedules.map((s) => ({
        courseOfferingId: s.schedule.courseOfferingId,
        classroomId: s.schedule.classroomId,
        dayOfWeek: s.schedule.dayOfWeek,
        startPeriod: s.schedule.startPeriod,
        endPeriod: s.schedule.endPeriod,
        startWeek: s.schedule.startWeek,
        endWeek: s.schedule.endWeek,
        notes: s.schedule.notes,
      })),
    })

    taskMap.delete(input.taskId)
    return { appliedCount: created.count, ignoredCount: task.result.failures.length }
  }

  // --- 核心算法实现 ---
  private async runAlgorithm(taskId: string, input: CreateTaskInput) {
    const task = taskMap.get(taskId)!
    try {
      task.status = 'processing'
      task.progress = 5

      // 1. 获取基础数据：通过 include 获取教师背后的 User 姓名
      const [offerings, classrooms, rulesMap] = await Promise.all([
        prisma.courseOffering.findMany({
          where: input.courseOfferingIds
            ? { id: { in: input.courseOfferingIds } }
            : { semesterId: input.semesterId },
          include: {
            course: true,
            teacher: { include: { user: true } }, // 关键：解决 teacher 没有 name 的报错
          },
        }),
        prisma.classroom.findMany(),
        ruleService.getRulesMap(),
      ])

      task.progress = 15

      const successResults: ScheduleSuccess[] = []
      const failureResults: ScheduleFailure[] = []

      // 时间段枚举 (1-5天, 1-11节，假设每课2节)我默认是单课 2 节（1-2, 3-4...），起始节次为 [1, 3, 5, 7, 9]。
      // 如果实际应用中学校有不同的排课规则（比如有的课 3 节连上），需要调整 periods 数组。
      const days = [1, 2, 3, 4, 5]
      const periods = [1, 3, 5, 7, 9] // 默认 2 节连上

      // 2. 预处理：按硬约束多少降序排列，先排“难搞”的课（最受限者优先）
      offerings.sort((a, b) => {
        const ruleA =
          rulesMap.get(`teacher:${a.teacherId}`)?.hardConstraints.unavailableTimeSlots?.length || 0
        const ruleB =
          rulesMap.get(`teacher:${b.teacherId}`)?.hardConstraints.unavailableTimeSlots?.length || 0
        return ruleB - ruleA
      })

      // 3. DFS 核心函数
      const solve = (idx: number): boolean => {
        if (idx === offerings.length) return true

        const off = offerings[idx]
        task.progress = Math.floor(15 + (idx / offerings.length) * 80)

        const teacherRule = rulesMap.get(`teacher:${off.teacherId}`)
        const courseRule = rulesMap.get(`course:${off.courseId}`)

        // --- 核心优化：生成所有可能的候选组合并按“软约束”评分 ---
        const candidates: { day: number; period: number; room: Classroom; score: number }[] = []
        for (const day of days) {
          for (const period of periods) {
            for (const room of classrooms) {
              // I. 硬约束判定 (Hard Constraints)
              // 1. 教室类型匹配
              if (
                courseRule?.hardConstraints?.requiredRoomType &&
                room.roomType !== courseRule.hardConstraints.requiredRoomType
              )
                continue
              // 2. 容量校验：教室容量必须大于开课设定的容量
              if (room.capacity < off.capacity) continue
              // 3. 教师时间避让
              const isTeacherBusy = teacherRule?.hardConstraints?.unavailableTimeSlots?.some(
                (t: TimeSlot) =>
                  t.dayOfWeek === day && period >= t.startPeriod && period <= t.endPeriod
              )
              if (isTeacherBusy) continue
              // 4. 实时冲突 (同一时间教师或教室已被占用)
              const isOccupied = successResults.some(
                (s) =>
                  (s.schedule.classroomId === room.id || s.teacherId === off.teacherId) &&
                  s.schedule.dayOfWeek === day &&
                  s.schedule.startPeriod === period
              )
              if (isOccupied) continue

              // II. 软约束评分 (Soft Constraints Score)
              let score = 0
              const soft = teacherRule?.softConstraints || courseRule?.softConstraints
              if (soft) {
                // 1. 偏好时间段 (+10分)
                if (
                  soft.preferredTimeSlots?.some(
                    (p: TimeSlot) => p.dayOfWeek === day && p.startPeriod === period
                  )
                )
                  score += 10
                // 2. 偏好教学楼 (+5分)
                if (soft.preferredBuilding && room.building === soft.preferredBuilding) score += 5
              }

              candidates.push({ day, period, room, score })
            }
          }
        }

        // 按评分从高到低排序，优先尝试分数高的位置
        candidates.sort((a, b) => b.score - a.score)

        // III. 递归搜索
        for (const cand of candidates) {
          const currentSchedule: Schedule = {
            schedule: {
              courseOfferingId: off.id,
              classroomId: cand.room.id,
              dayOfWeek: cand.day,
              startWeek: 1,
              endWeek: 16,
              startPeriod: cand.period,
              endPeriod: cand.period + 1,
              notes: null,
            },
            teacherId: off.teacherId,
          }

          successResults.push(currentSchedule)
          if (solve(idx + 1)) return true
          successResults.pop() // 回溯
        }

        // 记录失败
        failureResults.push({
          courseOfferingId: off.id,
          courseName: off.course.name,
          teacherName: off.teacher.user?.username,
          reason: 'no_available_slot',
          detail: '无法在满足硬约束条件下找到可用教室或时间段',
        })
        return solve(idx + 1)
      }

      solve(0)

      task.result = {
        successRate: Math.round((successResults.length / offerings.length) * 100),
        schedules: successResults,
        failures: failureResults,
      }
      task.status = 'completed'
      task.progress = 100
    } catch {
      task.status = 'failed'
    }
  }
}

export const autoScheduleService = new AutoScheduleService()
