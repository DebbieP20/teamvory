import { redirect } from "next/navigation";

/** The old "This & next week" page; links in emails sent before the change land here. */
export default function OldWeekPage() {
  redirect("/employee/availability");
}
