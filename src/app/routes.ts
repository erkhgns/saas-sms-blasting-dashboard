import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/common";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { SendSMS } from "@/pages/SendSMS";
import { Campaigns } from "@/pages/Campaigns";
import { CampaignForm } from "@/pages/CampaignForm";
import { Contacts } from "@/pages/Contacts";
import { Inbox } from "@/pages/Inbox";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import { Logs } from "@/pages/Logs";

// Wrapper components so React Router gets proper component references
// (React Router requires components, not JSX or function calls)
function CampaignFormCreate() { return CampaignForm({ mode: "create" }); }
function CampaignFormEdit()   { return CampaignForm({ mode: "edit" }); }
function CampaignFormView()   { return CampaignForm({ mode: "view" }); }

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
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
          { path: "reports", Component: Reports },
          { path: "logs", Component: Logs },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
