import type { Metadata } from "next";
import { OverviewView } from "./overview-view";

export const metadata: Metadata = { title: "Admin overview" };

export default function AdminOverviewPage() {
  return <OverviewView />;
}
