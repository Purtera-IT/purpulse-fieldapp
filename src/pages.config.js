/**
 * pages.config.js — registered pages for React Router (see src/App.jsx).
 *
 * Technician home is /FieldJobs (canonical); root "/" redirects there in App.jsx.
 *
 * Legacy technician pages (Jobs, JobDetail, Chat, TimeLog) remain as files under
 * ./pages/ for a later removal pass but are not registered here — App.jsx redirects
 * those paths to the canonical field routes.
 */
import ActiveJob from './pages/ActiveJob';
import EvidenceHub from './pages/EvidenceHub';
import Support from './pages/Support';
import AdminQC from './pages/AdminQC';
import Onboarding from './pages/Onboarding';
import AdminJobs from './pages/AdminJobs';
import AdminSnapshot from './pages/AdminSnapshot';
import AdminAuditLog from './pages/AdminAuditLog';
import AdminUsers from './pages/AdminUsers';
import AdminDevices from './pages/AdminDevices';
import DevModelInputs from './pages/DevModelInputs';
import AdminManifest from './pages/AdminManifest';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActiveJob": ActiveJob,
    "EvidenceHub": EvidenceHub,
    "Support": Support,
    "AdminQC": AdminQC,
    "Onboarding": Onboarding,
    "AdminJobs": AdminJobs,
    "AdminSnapshot": AdminSnapshot,
    "AdminAuditLog": AdminAuditLog,
    "AdminUsers": AdminUsers,
    "AdminDevices": AdminDevices,
    "DevModelInputs": DevModelInputs,
    "AdminManifest": AdminManifest,
    "Profile": Profile,
}

export const pagesConfig = {
    /**
     * Registered pages only. There is no `mainPage` key: the app entry route is
     * owned by App.jsx (`/` → `/FieldJobs`). Do not reintroduce mainPage without
     * updating App.jsx to match, or you will fork the source of truth for landing.
     */
    Pages: PAGES,
    Layout: __Layout,
};