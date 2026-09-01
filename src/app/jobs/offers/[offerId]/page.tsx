import * as React from "react";
import { notFound } from "next/navigation";
import { viewPublicOfferAction } from "@/lib/recruitment/actions";
import { CandidateOfferView } from "@/components/public/candidate-offer-view";

export const metadata = {
  title: "Employment Offer — Ropimo",
};

export default async function PublicOfferPage(props: {
  params: Promise<{ offerId: string }>;
}) {
  const params = await props.params;
  const res = await viewPublicOfferAction(params.offerId);

  if (!res.success || !res.data) {
    notFound();
  }

  return <CandidateOfferView offer={res.data} />;
}
