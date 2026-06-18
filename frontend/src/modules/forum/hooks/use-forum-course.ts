import { useCallback, useEffect, useState } from 'react'
import { forumApi } from '../api/forum-api'
import { FORUM_COURSE_STORAGE_KEY } from '../constants/forum'
import { DEMO_COURSES } from '../constants/demo-mock'
import type { CourseOption } from '../types'

export function useForumCourse(demoMode: boolean) {
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [courseOfferingId, setCourseOfferingIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(FORUM_COURSE_STORAGE_KEY) ?? ''
  })
  const [loading, setLoading] = useState(true)

  const setCourseOfferingId = useCallback((id: string) => {
    setCourseOfferingIdState(id)
    if (id) {
      localStorage.setItem(FORUM_COURSE_STORAGE_KEY, id)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      if (demoMode) {
        if (!cancelled) {
          setCourses(DEMO_COURSES)
          if (!courseOfferingId && DEMO_COURSES[0]) {
            setCourseOfferingId(DEMO_COURSES[0].courseOfferingId)
          }
          setLoading(false)
        }
        return
      }

      try {
        let list = await forumApi.getCourseActivity().catch(() => [] as CourseOption[])

        if (list.length === 0) {
          const posts = await forumApi.getPosts({ pageSize: 50 }).catch(() => ({
            data: [],
            pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
          }))
          const map = new Map<string, CourseOption>()
          posts.data.forEach((p) => {
            const co = p.courseOffering
            if (co?.id && co.course) {
              map.set(co.id, {
                courseOfferingId: co.id,
                courseName: co.course.name,
                courseCode: co.course.code,
              })
            }
          })
          list = Array.from(map.values())
        }

        if (!cancelled) {
          setCourses(list)
          if (list.length > 0 && !courseOfferingId) {
            setCourseOfferingId(list[0].courseOfferingId)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [demoMode, setCourseOfferingId])

  return { courses, courseOfferingId, setCourseOfferingId, loading }
}
