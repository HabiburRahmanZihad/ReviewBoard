import type { Metadata } from "next";
import { StudentView } from "./student-view";

export const metadata: Metadata = { title: "My submissions" };

export default function SubmissionsPage() {
  return <StudentView />;
}
