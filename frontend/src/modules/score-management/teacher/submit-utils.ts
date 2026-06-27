import type { Key } from 'react'
import type {
  DraftScorePatch,
  EditableScoreValues,
  SaveDraftScoreInput,
  SubmitScoresPayload,
  TeacherScoreRow,
} from './types'

export function hasAnyScore(values: EditableScoreValues): boolean {
  return Object.values(values).some((value) => typeof value === 'number')
}

export function mergeRowValues(row: TeacherScoreRow, patch?: DraftScorePatch): EditableScoreValues {
  return {
    usualScore: patch && 'usualScore' in patch ? (patch.usualScore ?? null) : row.usualScore,
    midtermScore:
      patch && 'midtermScore' in patch ? (patch.midtermScore ?? null) : row.midtermScore,
    finalScore: patch && 'finalScore' in patch ? (patch.finalScore ?? null) : row.finalScore,
  }
}

export function pickRowsForAction(
  rows: TeacherScoreRow[],
  draftValues: Record<string, DraftScorePatch>,
  selectedRowKeys: Key[]
): TeacherScoreRow[] {
  if (selectedRowKeys.length > 0) {
    const selected = new Set(selectedRowKeys.map(String))
    return rows.filter((row) => selected.has(row.enrollmentId))
  }

  return rows.filter((row) => draftValues[row.enrollmentId])
}

export function buildDraftPayload(
  rows: TeacherScoreRow[],
  draftValues: Record<string, DraftScorePatch>
): SaveDraftScoreInput[] {
  return rows.map((row) => {
    const merged = mergeRowValues(row, draftValues[row.enrollmentId])

    return {
      enrollmentId: row.enrollmentId,
      scoreId: row.scoreId,
      usualScore: merged.usualScore,
      midtermScore: merged.midtermScore,
      finalScore: merged.finalScore,
    }
  })
}

export function hasLocalDraft(
  row: TeacherScoreRow,
  draftValues: Record<string, DraftScorePatch>
): boolean {
  return Boolean(draftValues[row.enrollmentId])
}

export function needsDraftSync(
  rows: TeacherScoreRow[],
  draftValues: Record<string, DraftScorePatch>
): boolean {
  return rows.some((row) => !row.scoreId || hasLocalDraft(row, draftValues))
}

export function buildSubmitPayload(rows: TeacherScoreRow[]): SubmitScoresPayload {
  return {
    scoreIds: rows.flatMap((row) => (row.scoreId ? [row.scoreId] : [])),
  }
}
