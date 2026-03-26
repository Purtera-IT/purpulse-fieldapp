/**
 * Iteration 17: single operator-facing model for evidence record vs file reference vs sync honesty.
 * Compact vocabulary only — does not invent backend durability guarantees.
 */

export type EvidencePersistenceStatus =
  | 'pending_upload'
  | 'uploading'
  | 'uploaded'
  | 'error'
  | 'replaced'
  | string

export type EvidencePersistenceInput = {
  id?: string
  status?: EvidencePersistenceStatus
  file_url?: string
  upload_error?: string
  azure_blob_url?: string | null
}

export type ArtifactTone = 'ok' | 'pending' | 'error' | 'muted'

/** Compact operator phrases (badge + headlines). Avoid implying full durability, QC, or archive. */
export const ARTIFACT_VOCAB = {
  savedOnJob: 'Saved on job',
  previewOnly: 'Preview only',
  /** https / remote file reference on the record — not “fully processed” or review-ready. */
  linkOnJob: 'Link on job',
  waitingToSync: 'Waiting to sync',
  needsAttention: 'Needs attention',
} as const

export type ArtifactPersistencePresentation = {
  recordOnJob: boolean
  headline: string
  /** One line; null when nothing more to say (e.g. replaced). */
  detailLine: string | null
  badgeShort: string
  badgeTone: ArtifactTone
  /** Tooltip / metadata: headline · detail when detail present. */
  summaryLine: string
}

type FileRefKind = 'inline_preview' | 'simulated' | 'remote_url' | 'missing'

function classifyFileRef(fileUrl: string | undefined): FileRefKind {
  const u = fileUrl || ''
  if (!u) return 'missing'
  if (u.startsWith('data:') || u.startsWith('blob:')) return 'inline_preview'
  if (u.startsWith('mock://')) return 'simulated'
  if (/^https?:\/\//i.test(u)) return 'remote_url'
  return 'remote_url'
}

/**
 * Canonical presentation for an evidence row + file URL shape.
 * `azure_blob_url` does not strengthen durability claims — never treat as “fully uploaded everywhere.”
 */
export function getArtifactPersistencePresentation(ev: EvidencePersistenceInput): ArtifactPersistencePresentation {
  const status = ev.status
  const err = ev.upload_error?.trim()

  if (status === 'error') {
    const headline = ARTIFACT_VOCAB.needsAttention
    const detailLine = err || 'Save or transfer failed.'
    return {
      recordOnJob: false,
      headline,
      detailLine,
      badgeShort: ARTIFACT_VOCAB.needsAttention,
      badgeTone: 'error',
      summaryLine: err ? `${headline} · ${err}` : headline,
    }
  }

  if (status === 'pending_upload') {
    return {
      recordOnJob: false,
      headline: ARTIFACT_VOCAB.waitingToSync,
      detailLine: 'File transfer not finished yet.',
      badgeShort: ARTIFACT_VOCAB.waitingToSync,
      badgeTone: 'pending',
      summaryLine: `${ARTIFACT_VOCAB.waitingToSync} · File transfer not finished yet.`,
    }
  }

  if (status === 'uploading') {
    return {
      recordOnJob: false,
      headline: ARTIFACT_VOCAB.waitingToSync,
      detailLine: 'Sending file…',
      badgeShort: ARTIFACT_VOCAB.waitingToSync,
      badgeTone: 'pending',
      summaryLine: `${ARTIFACT_VOCAB.waitingToSync} · Sending file…`,
    }
  }

  if (status === 'replaced') {
    return {
      recordOnJob: true,
      headline: 'Replaced',
      detailLine: null,
      badgeShort: 'Replaced',
      badgeTone: 'muted',
      summaryLine: 'Replaced',
    }
  }

  if (status !== 'uploaded') {
    const s = status ? String(status) : 'Unknown'
    return {
      recordOnJob: false,
      headline: s,
      detailLine: null,
      badgeShort: s.slice(0, 12),
      badgeTone: 'muted',
      summaryLine: s,
    }
  }

  const kind = classifyFileRef(ev.file_url)
  const pendingDetail = 'File transfer or storage sync may still be pending.'

  if (kind === 'missing') {
    return {
      recordOnJob: true,
      headline: ARTIFACT_VOCAB.savedOnJob,
      detailLine: 'No file link on the record yet.',
      badgeShort: ARTIFACT_VOCAB.waitingToSync,
      badgeTone: 'pending',
      summaryLine: `${ARTIFACT_VOCAB.savedOnJob} · No file link on the record yet.`,
    }
  }

  if (kind === 'inline_preview') {
    return {
      recordOnJob: true,
      headline: ARTIFACT_VOCAB.savedOnJob,
      detailLine: `${ARTIFACT_VOCAB.previewOnly}. ${pendingDetail}`,
      badgeShort: ARTIFACT_VOCAB.previewOnly,
      badgeTone: 'pending',
      summaryLine: `${ARTIFACT_VOCAB.savedOnJob} · ${ARTIFACT_VOCAB.previewOnly}. ${pendingDetail}`,
    }
  }

  if (kind === 'simulated') {
    return {
      recordOnJob: true,
      headline: ARTIFACT_VOCAB.savedOnJob,
      detailLine: pendingDetail,
      badgeShort: ARTIFACT_VOCAB.waitingToSync,
      badgeTone: 'pending',
      summaryLine: `${ARTIFACT_VOCAB.savedOnJob} · ${pendingDetail}`,
    }
  }

  // remote_url (https etc.) — link on record; not QC-complete, fully processed, or archived
  const remoteDetail = 'Link only. Further sync or processing may still be pending.'
  return {
    recordOnJob: true,
    headline: ARTIFACT_VOCAB.savedOnJob,
    detailLine: remoteDetail,
    badgeShort: ARTIFACT_VOCAB.linkOnJob,
    badgeTone: 'ok',
    summaryLine: `${ARTIFACT_VOCAB.savedOnJob} · ${remoteDetail}`,
  }
}
