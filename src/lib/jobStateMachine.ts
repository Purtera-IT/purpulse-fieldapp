/**
 * Job State Machine — Enforced transitions with role-based gating and evidence requirements
 */

export type JobStatus = 
  | 'assigned'
  | 'en_route'
  | 'checked_in'
  | 'in_progress'
  | 'paused'
  | 'pending_closeout'
  | 'submitted'
  | 'approved'
  | 'rejected';

export type UserRole = 'admin' | 'dispatcher' | 'technician' | 'viewer';

export interface EvidenceRequirement {
  type: 'photo_count' | 'checklist_complete' | 'signature' | 'meeting_recorded';
  label: string;
  isMet: boolean;
  current?: number;
  required?: number;
}

export interface TransitionGate {
  isAllowed: boolean;
  blockers: EvidenceRequirement[];
  canOverride: boolean;
  overrideReason?: string;
}

export interface StateTransition {
  from: JobStatus;
  to: JobStatus;
  label: string;
  allowedRoles: UserRole[];
  evidenceRequirements: EvidenceRequirement[];
  description: string;
}

/**
 * State machine definition: allowed transitions per role
 */
export const STATE_MACHINE: Record<JobStatus, StateTransition[]> = {
  assigned: [
    {
      from: 'assigned',
      to: 'en_route',
      label: 'Start Route',
      allowedRoles: ['technician', 'dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Technician is en route to site',
    },
  ],
  en_route: [
    {
      from: 'en_route',
      to: 'checked_in',
      label: 'Check In',
      allowedRoles: ['technician', 'dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Technician has arrived at site (GPS or manual)',
    },
  ],
  checked_in: [
    {
      from: 'checked_in',
      to: 'in_progress',
      label: 'Start Work',
      allowedRoles: ['technician', 'dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Work session started',
    },
  ],
  in_progress: [
    {
      from: 'in_progress',
      to: 'paused',
      label: 'Pause',
      allowedRoles: ['technician', 'dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Temporarily pause work',
    },
    {
      from: 'in_progress',
      to: 'pending_closeout',
      label: 'Complete Work',
      allowedRoles: ['technician', 'dispatcher', 'admin'],
      evidenceRequirements: [
        { type: 'photo_count', label: 'Before/After Photos', isMet: false, current: 0, required: 2 },
        { type: 'checklist_complete', label: 'Runbook Checklist', isMet: false },
      ],
      description: 'Mark work complete and ready for closeout',
    },
  ],
  paused: [
    {
      from: 'paused',
      to: 'in_progress',
      label: 'Resume',
      allowedRoles: ['technician', 'dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Resume work after pause',
    },
  ],
  pending_closeout: [
    {
      from: 'pending_closeout',
      to: 'submitted',
      label: 'Submit Closeout',
      allowedRoles: ['technician', 'dispatcher', 'admin'],
      evidenceRequirements: [
        { type: 'signature', label: 'Customer Signature', isMet: false },
      ],
      description: 'Submit job for admin approval',
    },
    {
      from: 'pending_closeout',
      to: 'in_progress',
      label: 'Reopen',
      allowedRoles: ['dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Reopen job for additional work',
    },
  ],
  submitted: [
    {
      from: 'submitted',
      to: 'approved',
      label: 'Approve',
      allowedRoles: ['dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Admin approves job completion',
    },
    {
      from: 'submitted',
      to: 'rejected',
      label: 'Reject',
      allowedRoles: ['dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Admin rejects — requires rework',
    },
  ],
  approved: [],
  rejected: [
    {
      from: 'rejected',
      to: 'in_progress',
      label: 'Reopen for Rework',
      allowedRoles: ['dispatcher', 'admin'],
      evidenceRequirements: [],
      description: 'Reopen job for required rework',
    },
  ],
};

/**
 * Evaluate if a transition is allowed for a given role
 */
export function canTransition(
  currentStatus: JobStatus,
  targetStatus: JobStatus,
  userRole: UserRole,
  evidence: { evidence_type?: string }[] = [],
  runbookComplete: boolean = false,
  hasSignature: boolean = false,
): TransitionGate {
  const transitions = STATE_MACHINE[currentStatus] || [];
  const targetTransition = transitions.find(t => t.to === targetStatus);

  if (!targetTransition) {
    return {
      isAllowed: false,
      blockers: [],
      canOverride: false,
      overrideReason: 'Invalid transition',
    };
  }

  // Check role permission
  const hasRole = targetTransition.allowedRoles.includes(userRole);
  if (!hasRole) {
    return {
      isAllowed: false,
      blockers: [],
      canOverride: userRole === 'admin',
      overrideReason: `Role "${userRole}" cannot perform this transition`,
    };
  }

  // Evaluate evidence requirements
  const blockers = targetTransition.evidenceRequirements.map(req => {
    if (req.type === 'photo_count') {
      const photoCount = evidence.filter(e =>
        e.evidence_type?.startsWith('photo') || e.evidence_type?.includes('before') || e.evidence_type?.includes('after')
      ).length;
      return {
        ...req,
        isMet: photoCount >= (req.required || 0),
        current: photoCount,
      };
    }
    if (req.type === 'checklist_complete') {
      return { ...req, isMet: runbookComplete };
    }
    if (req.type === 'signature') {
      return { ...req, isMet: hasSignature };
    }
    return { ...req, isMet: false };
  });

  const allRequirementsMet = blockers.every(b => b.isMet);

  return {
    isAllowed: allRequirementsMet,
    blockers,
    canOverride: userRole === 'admin' && !allRequirementsMet,
    overrideReason: allRequirementsMet ? undefined : 'Missing evidence — admin override available',
  };
}

/**
 * Get all allowed transitions from current status
 */
export function getAllowedTransitions(
  currentStatus: JobStatus,
  userRole: UserRole,
  evidence: { evidence_type?: string }[] = [],
  runbookComplete: boolean = false,
  hasSignature: boolean = false,
): StateTransition[] {
  const transitions = STATE_MACHINE[currentStatus] || [];
  return transitions.filter(t => {
    const { isAllowed } = canTransition(
      currentStatus,
      t.to,
      userRole,
      evidence,
      runbookComplete,
      hasSignature,
    );
    return isAllowed || userRole === 'admin';
  });
}

/**
 * Get status label with description
 */
export const STATUS_LABELS: Record<JobStatus, { label: string; color: string }> = {
  assigned: { label: 'Assigned', color: 'bg-slate-100 text-slate-700' },
  en_route: { label: 'En Route', color: 'bg-cyan-100 text-cyan-700' },
  checked_in: { label: 'Checked In', color: 'bg-purple-100 text-purple-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700' },
  pending_closeout: { label: 'Pending Closeout', color: 'bg-orange-100 text-orange-700' },
  submitted: { label: 'Submitted', color: 'bg-indigo-100 text-indigo-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};