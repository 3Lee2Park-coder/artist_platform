import { Header } from "@/components/Header";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getSession, getUserById } from "@/lib/auth";
import { parseTasteArray } from "@/lib/taste";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login?redirect=/onboarding");
  }

  const user = await getUserById(session.id);

  return (
    <>
      <Header />
      <OnboardingForm
        initialInterests={parseTasteArray(user?.interestTags)}
        initialPurposes={parseTasteArray(user?.visitPurposes)}
      />
    </>
  );
}
