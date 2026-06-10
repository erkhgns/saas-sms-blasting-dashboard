import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/common";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { SendSMS } from "@/pages/SendSMS";
import { Campaigns } from "@/pages/Campaigns";
import { CampaignForm } from "@/pages/CampaignForm";
import { Contacts } from "@/pages/Contacts";
import { Automations } from "@/pages/Automations";
import { Forms } from "@/pages/Forms";
import { FormSubmissions } from "@/pages/Forms/FormSubmissions";
import { PublicForm } from "@/pages/PublicForm";
import { Inbox } from "@/pages/Inbox";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import { Logs } from "@/pages/Logs";
import { ApiDocs } from "@/pages/ApiDocs";

// Wrapper components so React Router gets proper component references
// (React Router requires components, not JSX or function calls)
function CampaignFormCreate() { return CampaignForm({ mode: "create" }); }
function CampaignFormEdit()   { return CampaignForm({ mode: "edit" }); }
function CampaignFormView()   { return CampaignForm({ mode: "view" }); }

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  // Public form — unauthenticated, no dashboard chrome.
  // /f/:code handles both short codes and custom slugs — same component,
  // the backend resolves both. Accessible even when logged in.
  { path: "/f/:code", Component: PublicForm },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        Component: DashboardLayout,
        children: [
          { index: true, Component: Dashboard },
          { path: "send", Component: SendSMS },
          { path: "campaigns", Component: Campaigns },
          { path: "campaigns/new", Component: CampaignFormCreate },
          { path: "campaigns/:id/edit", Component: CampaignFormEdit },
          { path: "campaigns/:id", Component: CampaignFormView },
          { path: "contacts", Component: Contacts },
          { path: "inbox", Component: Inbox },
          { path: "forms", Component: Forms },
          { path: "forms/:id/submissions", Component: FormSubmissions },
          { path: "automations", Component: Automations },
          { path: "reports", Component: Reports },
          { path: "logs", Component: Logs },
          { path: "api-docs", Component: ApiDocs },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
