import { redirect } from "next/navigation";

/** 메일·구링크 호환. 질문 확인은 MY 질문 함으로 보낸다. */
export default function QuestionsIndexRedirect() {
  redirect("/my#inbox");
}
