import { useMemo } from 'react'
import { useAuthStore } from '@/shared/stores/authStore'
import {
  FORUM_EXPORT_ROLES,
  FORUM_MOD_ROLES,
  FORUM_STATS_ROLES,
  FORUM_TEACHER_ROLES,
} from '../constants/forum'

function hasAnyRole(roles: string[], allowed: readonly string[]) {
  return allowed.some((r) => roles.includes(r))
}

export function useForumPermissions() {
  const user = useAuthStore((s) => s.user)
  const roles = user?.roles ?? []

  return useMemo(() => {
    const isAuthor = (authorId?: string) => !!user?.id && authorId === user.id

    const canManagePost = (authorId?: string) =>
      isAuthor(authorId) || hasAnyRole(roles, FORUM_TEACHER_ROLES) || hasAnyRole(roles, FORUM_MOD_ROLES)

    return {
      userId: user?.id,
      roles,
      isTeacher: hasAnyRole(roles, FORUM_TEACHER_ROLES),
      canManageAnnouncements: hasAnyRole(roles, FORUM_TEACHER_ROLES),
      canPinPost: hasAnyRole(roles, FORUM_TEACHER_ROLES),
      canViewStats: hasAnyRole(roles, FORUM_STATS_ROLES),
      canExportStats: hasAnyRole(roles, FORUM_EXPORT_ROLES),
      canModerateComments:
        hasAnyRole(roles, FORUM_TEACHER_ROLES) || hasAnyRole(roles, FORUM_MOD_ROLES),
      canViewHiddenComments:
        hasAnyRole(roles, FORUM_TEACHER_ROLES) || hasAnyRole(roles, FORUM_MOD_ROLES),
      isAuthor,
      canEditPost: canManagePost,
      canDeletePost: canManagePost,
      canDeleteOwnComment: (authorId?: string) => isAuthor(authorId) || hasAnyRole(roles, FORUM_MOD_ROLES),
    }
  }, [user?.id, roles])
}
