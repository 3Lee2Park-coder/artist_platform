"use client";

import { PlaceTipForm } from "@/components/PlaceTipForm";
import { useState } from "react";

export function HiddenPlacesTipControls() {
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <>
      <div className="hidden-place-tip-bar">
        <p>여기에 없는 곳을 알고 있나요?</p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setTipOpen((open) => !open)}
        >
          {tipOpen ? "닫기" : "나만의 장소 알려주기"}
        </button>
      </div>
      {tipOpen ? <PlaceTipForm onDone={() => setTipOpen(false)} /> : null}
    </>
  );
}
