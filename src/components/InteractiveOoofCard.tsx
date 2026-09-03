"use client";

import { AddToDeckDialog } from "@/components/AddToDeckDialog";
import { OoofCard } from "@/components/OoofCard";
import type { OoofCard as OoofCardModel } from "@/lib/cards";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type InteractiveOoofCardProps = {
  card: OoofCardModel;
  catalog?: boolean;
  isLoggedIn?: boolean;
};

export function InteractiveOoofCard({
  card,
  catalog = true,
  isLoggedIn
}: InteractiveOoofCardProps) {
  const router = useRouter();
  const [model, setModel] = useState(card);
  const [fetchedLogin, setFetchedLogin] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [message, setMessage] = useState("");
  const loggedIn = isLoggedIn ?? fetchedLogin;
  if (card.key !== model.key) {
    setModel(card);
  }

  useEffect(() => {
    if (isLoggedIn !== undefined) return;
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setFetchedLogin(Boolean(data.user)))
      .catch(() => setFetchedLogin(false));
  }, [isLoggedIn]);

  function requireLogin() {
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    router.push(`/auth/login?redirect=${path}`);
  }

  async function patch(action: "save" | "visit") {
    if (!loggedIn) {
      requireLogin();
      return false;
    }
    const response = await fetch("/api/cards/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey: model.key, action })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "저장하지 못했습니다.");
      return false;
    }
    setModel((current) => ({
      ...current,
      saved: data.saved ?? current.saved,
      visited: data.visited ?? current.visited,
      visitedAt: data.visitedAt ?? current.visitedAt,
      visitedPhotoUrl: data.visitedPhotoUrl ?? current.visitedPhotoUrl
    }));
    return true;
  }

  async function handlePhoto(target: OoofCardModel, file: File) {
    if (!loggedIn) {
      requireLogin();
      return;
    }
    const body = new FormData();
    body.set("file", file);
    body.set("folder", "visited");
    const upload = await fetch("/api/upload", { method: "POST", body });
    const uploaded = await upload.json();
    if (!upload.ok) {
      setMessage(uploaded.error ?? "사진을 올리지 못했습니다.");
      return;
    }
    const response = await fetch("/api/cards/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey: target.key, action: "visit", photoUrl: uploaded.url })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "사진을 연결하지 못했습니다.");
      return;
    }
    setModel((current) => ({
      ...current,
      visited: true,
      visitedAt: data.visitedAt ?? current.visitedAt,
      visitedPhotoUrl: data.visitedPhotoUrl ?? uploaded.url
    }));
  }

  return (
    <div className="ooof-catalog-item">
      <OoofCard
        card={model}
        catalog={catalog}
        onSave={async () => {
          const ok = await patch("save");
          if (ok) setAddOpen(true);
        }}
        onVisit={() => patch("visit")}
        onAddToDeck={() => {
          if (!loggedIn) {
            requireLogin();
            return;
          }
          setAddOpen(true);
        }}
        onPhoto={handlePhoto}
      />
      {message ? <p className="ooof-catalog-msg">{message}</p> : null}
      {addOpen ? (
        <AddToDeckDialog
          cardKey={model.key}
          onClose={() => setAddOpen(false)}
          onAdded={() => setMessage("덱에 담았습니다.")}
        />
      ) : null}
    </div>
  );
}

export function InteractiveOoofCardList({
  cards,
  className
}: {
  cards: OoofCardModel[];
  className?: string;
}) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setLoggedIn(Boolean(data.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  return (
    <div className={className}>
      {cards.map((card) => (
        <InteractiveOoofCard key={card.key} card={card} isLoggedIn={loggedIn} />
      ))}
    </div>
  );
}
