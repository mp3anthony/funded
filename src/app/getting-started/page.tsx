import type { Metadata } from "next";
import GettingStartedClient from "./getting-started-client";

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export const metadata: Metadata = { title: "Getting started · Funded" };

export default function Page() {
  return <GettingStartedClient />;
}
