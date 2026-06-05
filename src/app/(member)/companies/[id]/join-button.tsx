"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMyCompany } from "../actions";

export default function JoinCompanyButton({
  companyId,
  isMember,
}: {
  companyId: number;
  isMember: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      await setMyCompany(isMember ? 0 : companyId);
      router.refresh();
    });

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`btn inline-btn${isMember ? " btn-ghost" : ""}`}
    >
      {pending ? "Saving…" : isMember ? "Leave this company" : "I work here"}
    </button>
  );
}
