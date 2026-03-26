import { describe, expect, it } from 'vitest'
import {
  getArtifactPersistencePresentation,
  ARTIFACT_VOCAB,
} from '@/lib/artifactPersistencePresentation'

describe('getArtifactPersistencePresentation', () => {
  it('pending_upload', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'pending_upload',
      file_url: 'https://example.com/a.jpg',
    })
    expect(a.recordOnJob).toBe(false)
    expect(a.badgeShort).toBe(ARTIFACT_VOCAB.waitingToSync)
    expect(a.badgeTone).toBe('pending')
  })

  it('uploading', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'uploading',
    })
    expect(a.recordOnJob).toBe(false)
    expect(a.headline).toBe(ARTIFACT_VOCAB.waitingToSync)
  })

  it('error with message', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'error',
      upload_error: 'Network timeout',
    })
    expect(a.recordOnJob).toBe(false)
    expect(a.badgeShort).toBe(ARTIFACT_VOCAB.needsAttention)
    expect(a.detailLine).toContain('Network')
  })

  it('replaced', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'replaced',
      file_url: 'https://example.com/a.jpg',
    })
    expect(a.recordOnJob).toBe(true)
    expect(a.detailLine).toBeNull()
    expect(a.badgeTone).toBe('muted')
  })

  it('uploaded + data URL → preview only', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'uploaded',
      file_url: 'data:image/png;base64,abc',
    })
    expect(a.recordOnJob).toBe(true)
    expect(a.badgeShort).toBe(ARTIFACT_VOCAB.previewOnly)
    expect(a.detailLine).toContain('Preview only')
    expect(a.detailLine).toContain('pending')
  })

  it('uploaded + mock:// → waiting to sync', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'uploaded',
      file_url: 'mock://bucket/job/x.jpg',
    })
    expect(a.badgeShort).toBe(ARTIFACT_VOCAB.waitingToSync)
    expect(a.badgeTone).toBe('pending')
  })

  it('uploaded + https → link on job, ok tone (not “fully processed”)', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'uploaded',
      file_url: 'https://storage.example.com/a.jpg',
    })
    expect(a.badgeShort).toBe(ARTIFACT_VOCAB.linkOnJob)
    expect(a.badgeTone).toBe('ok')
    expect(a.headline).toBe(ARTIFACT_VOCAB.savedOnJob)
    expect(a.detailLine).toMatch(/Link only|pending/i)
  })

  it('uploaded + https + azure_blob_url still conservative', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'uploaded',
      file_url: 'https://storage.example.com/a.jpg',
      azure_blob_url: 'https://blob.core.windows.net/c/a.jpg',
    })
    expect(a.badgeShort).toBe(ARTIFACT_VOCAB.linkOnJob)
    expect(a.detailLine).toContain('pending')
  })

  it('uploaded + missing file_url', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'uploaded',
    })
    expect(a.badgeTone).toBe('pending')
    expect(a.detailLine).toContain('No file link')
  })

  it('uploaded + blob: URL treated as preview', () => {
    const a = getArtifactPersistencePresentation({
      id: '1',
      status: 'uploaded',
      file_url: 'blob:http://localhost/550e8400-e29b-41d4-a716-446655440000',
    })
    expect(a.badgeShort).toBe(ARTIFACT_VOCAB.previewOnly)
  })
})
