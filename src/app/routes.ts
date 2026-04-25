import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Dashboard } from "@/pages/Dashboard";
import { SendSMS } from "@/pages/SendSMS";
import { Campaigns } from "@/pages/Campaigns";
import { Contacts } from "@/pages/Contacts";
import { Inbox } from "@/pages/Inbox";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "send", Component: SendSMS },
      { path: "campaigns", Component: Campaigns },
      { path: "contacts", Component: Contacts },
      { path: "inbox", Component: Inbox },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
    ],
  },
]);
