"use client";

import { RichIntroEditor } from "@/components/RichIntroEditor";
import { CurationCourseBuilder } from "@/components/CurationCourseBuilder";
import {
  buildAutoSubtitle,
  stopsToApiPayload,
  type CourseStopDraft
} from "@/lib/curation-stop-draft";
import {
  createTextBlock,
  parseStoryBlocks,
  serializeStoryBlocks,
  storyBlocksToImageUrls,
  storyBlocksToPlainText,
  type StoryBlock
} from "@/lib/story";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Application = {
  userId: string;
  name: string;
  email: string;
  bio: string;
  portfolioUrl: string | null;
  activityArea: string | null;
};

type CurationRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  storyJson: string;
  coverImageUrl: string | null;
  published: boolean;
  featured: boolean;
  coverTone: string;
  neighborhood: string | null;
  situationTags: string[];
  basePlaceId: string | null;
  basePlaceName: string | null;
  radiusMeters: number;
  durationText: string | null;
  stopSummary: string;
  exhibitionIds: string[];
  exhibitionTitles: string[];
  stops: CourseStopDraft[];
};

type ExhibitionOption = {
  id: string;
  title: string;
  source: string;
  region: string;
  district: string;
  lat: number;
  lng: number;
};

type SpaceOption = {
  id: string;
  name: string;
  type: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  visitPolicy: string;
};

type PlaceRow = {
  id: string;
  name: string;
  type: string;
  region: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
  sourceUrl: string | null;
  notes: string | null;
  editorialNote: string | null;
  imageUrl: string | null;
  homeFeatured: boolean;
  homeSortOrder: number;
  isActive: boolean;
  usedCount: number;
};

const EMPTY_PLACE_FORM = {
  name: "",
  type: "CAFE",
  region: "서울",
  district: "성수",
  address: "",
  lat: "37.5443",
  lng: "127.0540",
  tags: "데이트,조용",
  sourceUrl: "",
  notes: "",
  editorialNote: "",
  imageUrl: "",
  homeFeatured: false,
  homeSortOrder: "0"
};

type PlaceTipRow = {
  id: string;
  name: string;
  sourceUrl: string | null;
  situation: string;
  district: string;
  imageUrl: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  placeId: string | null;
  placeName: string | null;
};

type EventSummary = {
  type: string;
  count: number;
};

type RecentEvent = {
  id: string;
  type: string;
  createdAt: string;
  source: string | null;
  metadata: string;
  userLabel: string;
  exhibitionTitle: string;
};

type CurationMetric = {
  curationId: string;
  title: string;
  neighborhood: string | null;
  views: number;
  shares: number;
  placeClicks: number;
  exhibitionViews: number;
  saves: number;
};

type ReviewSpaceRow = {
  id: string;
  slug: string;
  name: string;
  district: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

type ReviewProgramRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  isPublic: boolean;
  startDate: string;
  endDate: string;
  spaceName: string;
  hostName: string | null;
  hostEmail: string | null;
};

type OwnershipSpaceRow = {
  id: string;
  slug: string;
  name: string;
  district: string;
  status: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

type OwnershipExhibitionRow = {
  id: string;
  title: string;
  district: string;
  status: string;
  source: string;
  registeredByName: string | null;
  registeredByEmail: string | null;
};

type OwnershipProgramRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  spaceName: string;
  hostName: string | null;
  hostEmail: string | null;
};

type MemberRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  artistStatus: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  phone: string | null;
  exhibitionCount: number;
  spaceCount: number;
  programCount: number;
  reservationCount: number;
};

type AdminDashboardProps = {
  applications: Application[];
  curations: CurationRow[];
  exhibitionOptions: ExhibitionOption[];
  spaceOptions: SpaceOption[];
  places: PlaceRow[];
  placeTips: PlaceTipRow[];
  eventSummaries: EventSummary[];
  recentEvents: RecentEvent[];
  curationMetrics: CurationMetric[];
  reviewSpaces: ReviewSpaceRow[];
  reviewPrograms: ReviewProgramRow[];
  ownershipSpaces: OwnershipSpaceRow[];
  ownershipExhibitions: OwnershipExhibitionRow[];
  ownershipPrograms: OwnershipProgramRow[];
  members: MemberRow[];
};

const SITUATION_OPTIONS = [
  "데이트",
  "오후",
  "혼자",
  "사진",
  "비오는날",
  "퇴근후",
  "주말",
  "실내",
  "산책",
  "친구",
  "짧은코스",
  "천천히"
];

export function AdminDashboard({
  applications,
  curations,
  exhibitionOptions,
  spaceOptions,
  places,
  placeTips,
  eventSummaries,
  recentEvents,
  curationMetrics,
  reviewSpaces,
  reviewPrograms,
  ownershipSpaces,
  ownershipExhibitions,
  ownershipPrograms,
  members
}: AdminDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<
    | "curations"
    | "places"
    | "tips"
    | "applications"
    | "review"
    | "ownership"
    | "members"
    | "events"
  >("curations");
  const [message, setMessage] = useState("");
  const [transferDrafts, setTransferDrafts] = useState<Record<string, string>>(
    {}
  );
  const [transferringKey, setTransferringKey] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<"all" | "unverified">("all");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyBlocks, setStoryBlocks] = useState<StoryBlock[]>([createTextBlock()]);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [neighborhood, setNeighborhood] = useState("성수");
  const [situationTags, setSituationTags] = useState<string[]>(["데이트", "오후"]);
  const [customSituation, setCustomSituation] = useState("");
  const [basePlaceId, setBasePlaceId] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(800);
  const [durationText, setDurationText] = useState("2~3시간");
  const [featured, setFeatured] = useState(false);
  const [courseStops, setCourseStops] = useState<CourseStopDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const [placeForm, setPlaceForm] = useState(EMPTY_PLACE_FORM);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [creatingPlace, setCreatingPlace] = useState(false);
  const [tipBusyId, setTipBusyId] = useState<string | null>(null);
  const pendingTipCount = placeTips.filter((tip) => tip.status === "PENDING").length;

  async function uploadPlaceImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "places");
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "이미지 업로드에 실패했습니다.");
    }
    return data.url as string;
  }

  const visibleMembers = useMemo(() => {
    if (memberFilter === "unverified") {
      return members.filter((member) => !member.emailVerifiedAt);
    }
    return members;
  }, [members, memberFilter]);

  async function handleMemberAction(
    id: string,
    action: "verify" | "resend" | "delete" | "approveArtist"
  ) {
    setMemberBusyId(id);
    setMessage("");

    const response =
      action === "delete"
        ? await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          })
        : await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, action })
          });

    const data = await response.json().catch(() => ({}));
    setMemberBusyId(null);

    if (!response.ok) {
      setMessage(data.error ?? "회원 처리에 실패했습니다.");
      return;
    }

    setMessage(
      action === "verify"
        ? "이메일 인증을 완료 처리했습니다."
        : action === "resend"
          ? "인증 메일을 다시 보냈습니다."
          : action === "approveArtist"
            ? data.already
              ? "이미 작가로 승인된 회원입니다."
              : "작가로 승인했습니다. 작가님이 다시 로그인하면 등록 메뉴를 쓸 수 있습니다."
            : "미인증 계정을 삭제했습니다. 이제 같은 이메일로 다시 가입할 수 있습니다."
    );
    router.refresh();
  }

  const basePlace = places.find((place) => place.id === basePlaceId) ?? null;

  const districtPlaces = useMemo(
    () =>
      places.filter(
        (place) => place.isActive && (!neighborhood || place.district === neighborhood)
      ),
    [places, neighborhood]
  );

  async function handleApplication(userId: string, action: "approve" | "reject") {
    const response = await fetch("/api/admin/artist-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action })
    });

    if (response.ok) {
      setMessage(action === "approve" ? "작가 승인 완료" : "신청 반려됨");
      router.refresh();
    } else {
      setMessage("처리에 실패했습니다.");
    }
  }

  function toggleSituation(tag: string) {
    setSituationTags((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag]
    );
  }

  function buildDescriptionDraft() {
    const place = basePlace;
    const placeBlock = place
      ? `거점\n${place.name} (${place.address})\n— ${place.notes || "검증된 동네 거점"}\n좌표: ${place.lat}, ${place.lng}\n${place.sourceUrl || `https://map.naver.com/p/search/${encodeURIComponent(place.name)}`}`
      : "거점\n(거점을 선택하세요)";

    const stopLines =
      courseStops.length > 0
        ? courseStops
            .map(
              (stop, index) =>
                `${index + 1}. ${stop.title}${stop.distanceText ? ` · ${stop.distanceText}` : ""}${stop.note ? `\n   ${stop.note}` : ""}`
            )
            .join("\n")
        : "(동선 지점을 추가하세요)";

    return `${neighborhood}에서 어디부터 갈지 고민될 때 쓰는 코스입니다.
공간·장소·전시를 걸어서 이어지는 순서로 골라 두었습니다.

${placeBlock}

동선
${stopLines}

추천 흐름
${place ? `${place.name}에서 시작` : "첫 지점에서 시작"}
공간·장소를 순서대로
여유 있으면 전시나 산책 한 곳 더

팁
주말 오후는 웨이팅이 있을 수 있어 이른 오후가 편합니다.`;
  }

  function resetCurationForm() {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setDescription("");
    setStoryBlocks([createTextBlock()]);
    setCoverImageUrl("");
    setNeighborhood("성수");
    setSituationTags(["데이트", "오후"]);
    setBasePlaceId("");
    setRadiusMeters(800);
    setDurationText("2~3시간");
    setFeatured(false);
    setCourseStops([]);
  }

  function loadCurationForEdit(curation: CurationRow) {
    setEditingId(curation.id);
    setTitle(curation.title);
    setSubtitle(curation.subtitle ?? "");
    setDescription(curation.description ?? "");
    const blocks = parseStoryBlocks(curation.storyJson);
    setStoryBlocks(blocks.length > 0 ? blocks : [createTextBlock()]);
    setCoverImageUrl(curation.coverImageUrl ?? "");
    setNeighborhood(curation.neighborhood ?? "성수");
    setSituationTags(
      curation.situationTags.length > 0 ? curation.situationTags : ["데이트", "오후"]
    );
    setBasePlaceId(curation.basePlaceId ?? "");
    setRadiusMeters(curation.radiusMeters || 800);
    setDurationText(curation.durationText ?? "2~3시간");
    setFeatured(curation.featured);
    setCourseStops(curation.stops);
    setMessage(`「${curation.title}」 수정 모드입니다. 저장하면 바로 반영됩니다.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCuration() {
    if (title.trim().length < 2) {
      setMessage("큐레이션 제목을 입력해주세요.");
      return;
    }

    if (courseStops.length === 0) {
      setMessage("동선에 공간·장소·전시 중 최소 1곳 이상 추가해주세요.");
      return;
    }

    const stops = stopsToApiPayload(courseStops);
    const storyJson = serializeStoryBlocks(storyBlocks);
    const storyPlain = storyBlocksToPlainText(storyBlocks);
    const descriptionImages = storyBlocksToImageUrls(storyBlocks);
    const payload = {
      title,
      subtitle:
        subtitle ||
        buildAutoSubtitle(
          neighborhood,
          basePlace?.name ?? null,
          courseStops,
          durationText
        ),
      description: description || buildDescriptionDraft(),
      storyJson,
      descriptionImages,
      coverImageUrl: coverImageUrl || null,
      neighborhood,
      situationTags,
      basePlaceId: basePlaceId || null,
      radiusMeters,
      durationText,
      featured,
      stops
    };

    setCreating(true);
    const response = await fetch("/api/admin/curations", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload)
    });
    setCreating(false);

    if (response.ok) {
      setMessage(
        editingId
          ? storyPlain
            ? "큐레이션이 수정되었습니다."
            : "큐레이션이 수정되었습니다."
          : storyPlain
            ? "큐레이션이 생성되었습니다. 자유 소개도 함께 저장되었습니다."
            : "큐레이션이 생성되었습니다."
      );
      resetCurationForm();
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? (editingId ? "수정에 실패했습니다." : "생성에 실패했습니다."));
    }
  }

  async function togglePublish(id: string, published: boolean) {
    await fetch("/api/admin/curations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published: !published })
    });
    router.refresh();
  }

  async function toggleFeatured(id: string, next: boolean) {
    await fetch("/api/admin/curations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, featured: next })
    });
    setMessage(
      next
        ? "홈 히어로 추천 코스로 지정했습니다. (다른 추천은 자동 해제)"
        : "히어로 추천을 해제했습니다."
    );
    router.refresh();
  }

  async function deleteCuration(id: string) {
    await fetch(`/api/admin/curations?id=${id}`, { method: "DELETE" });
    setMessage("큐레이션이 삭제되었습니다.");
    router.refresh();
  }

  async function publishSpace(id: string) {
    const response = await fetch("/api/admin/spaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "PUBLISHED", isPublic: true })
    });
    if (response.ok) {
      setMessage("공간을 공개했습니다.");
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? "공간 공개에 실패했습니다.");
    }
  }

  async function hideSpace(id: string) {
    const response = await fetch("/api/admin/spaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "HIDDEN", isPublic: false })
    });
    if (response.ok) {
      setMessage("공간을 비공개 처리했습니다.");
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? "처리에 실패했습니다.");
    }
  }

  async function publishProgram(id: string) {
    const response = await fetch("/api/admin/programs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "PUBLISHED", isPublic: true })
    });
    if (response.ok) {
      setMessage("프로그램을 공개했습니다.");
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? "프로그램 공개에 실패했습니다.");
    }
  }

  async function hideProgram(id: string) {
    const response = await fetch("/api/admin/programs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "HIDDEN", isPublic: false })
    });
    if (response.ok) {
      setMessage("프로그램을 비공개 처리했습니다.");
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? "처리에 실패했습니다.");
    }
  }

  function transferDraftKey(kind: "space" | "exhibition" | "program", id: string) {
    return `${kind}:${id}`;
  }

  function getTransferDraft(
    kind: "space" | "exhibition" | "program",
    id: string,
    fallback: string | null
  ) {
    const key = transferDraftKey(kind, id);
    return transferDrafts[key] ?? fallback ?? "";
  }

  function setTransferDraft(
    kind: "space" | "exhibition" | "program",
    id: string,
    value: string
  ) {
    const key = transferDraftKey(kind, id);
    setTransferDrafts((prev) => ({ ...prev, [key]: value }));
  }

  async function transferOwnership(
    kind: "space" | "exhibition" | "program",
    id: string,
    email: string
  ) {
    const key = transferDraftKey(kind, id);
    const trimmed = email.trim();
    setTransferringKey(key);

    const endpoint =
      kind === "space"
        ? "/api/admin/spaces"
        : kind === "exhibition"
          ? "/api/admin/exhibitions"
          : "/api/admin/programs";

    const body =
      kind === "space"
        ? { id, ownerEmail: trimmed || null }
        : kind === "exhibition"
          ? { id, registeredByEmail: trimmed || null }
          : { id, hostEmail: trimmed || null };

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    setTransferringKey(null);

    if (response.ok) {
      setMessage(
        trimmed
          ? `${kind === "space" ? "공간" : kind === "exhibition" ? "전시" : "프로그램"} 소유권을 연결했습니다.`
          : "소유자 연결을 해제했습니다."
      );
      router.refresh();
    } else {
      setMessage(data.error ?? "소유권 이관에 실패했습니다.");
    }
  }

  async function savePlace() {
    setCreatingPlace(true);
    const payload = {
      name: placeForm.name,
      type: placeForm.type,
      region: placeForm.region,
      district: placeForm.district,
      address: placeForm.address,
      lat: Number(placeForm.lat),
      lng: Number(placeForm.lng),
      tags: placeForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      sourceUrl: placeForm.sourceUrl,
      notes: placeForm.notes,
      editorialNote: placeForm.editorialNote,
      imageUrl: placeForm.imageUrl,
      homeFeatured: placeForm.homeFeatured,
      homeSortOrder: Number(placeForm.homeSortOrder) || 0
    };
    const response = await fetch("/api/admin/places", {
      method: editingPlaceId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingPlaceId ? { id: editingPlaceId, ...payload } : payload
      )
    });
    setCreatingPlace(false);

    if (response.ok) {
      setMessage(
        editingPlaceId
          ? "Place가 수정되었습니다."
          : "Place Pool에 추가되었습니다."
      );
      resetPlaceForm();
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? "장소 저장에 실패했습니다.");
    }
  }

  function resetPlaceForm() {
    setEditingPlaceId(null);
    setPlaceForm(EMPTY_PLACE_FORM);
  }

  function loadPlaceForEdit(place: PlaceRow) {
    setEditingPlaceId(place.id);
    setPlaceForm({
      name: place.name,
      type: place.type,
      region: place.region,
      district: place.district,
      address: place.address,
      lat: String(place.lat),
      lng: String(place.lng),
      tags: place.tags.join(","),
      sourceUrl: place.sourceUrl ?? "",
      notes: place.notes ?? "",
      editorialNote: place.editorialNote ?? "",
      imageUrl: place.imageUrl ?? "",
      homeFeatured: place.homeFeatured,
      homeSortOrder: String(place.homeSortOrder ?? 0)
    });
    setMessage(`「${place.name}」 수정 모드입니다. 저장하면 바로 반영됩니다.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePlaceActive(id: string, isActive: boolean) {
    await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive })
    });
    router.refresh();
  }

  async function togglePlaceHome(id: string, homeFeatured: boolean) {
    await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, homeFeatured: !homeFeatured })
    });
    router.refresh();
  }

  async function patchPlaceImage(id: string, file: File) {
    try {
      const imageUrl = await uploadPlaceImage(file);
      await fetch("/api/admin/places", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, imageUrl })
      });
      setMessage("Place 이미지가 저장되었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 저장 실패");
    }
  }

  async function reviewTip(
    tip: PlaceTipRow,
    action: "adopt" | "reject"
  ) {
    setTipBusyId(tip.id);
    setMessage("");

    const body =
      action === "reject"
        ? { id: tip.id, action }
        : {
            id: tip.id,
            action,
            createPlace: {
              name: tip.name,
              type: "ETC" as const,
              region: "서울",
              district: tip.district,
              address: tip.district,
              lat: 37.5665,
              lng: 126.978,
              sourceUrl: tip.sourceUrl || "",
              editorialNote: "",
              imageUrl: tip.imageUrl || "",
              homeFeatured: false
            }
          };

    const response = await fetch("/api/admin/place-tips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    setTipBusyId(null);

    if (!response.ok) {
      setMessage(data.error ?? "제보 처리에 실패했습니다.");
      return;
    }

    setMessage(
      action === "adopt"
        ? "제보를 채택해 Place로 등록했습니다. 주소·좌표를 Place Pool에서 보완하세요."
        : "제보를 반려했습니다."
    );
    router.refresh();
  }

  async function syncPublicExhibitions(
    source: "all" | "kcisa" | "cultureinfo" | "sema" = "all"
  ) {
    setSyncLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/public-exhibitions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maxPages: source === "cultureinfo" ? 200 : 15,
        source
      })
    });
    const data = await response.json();
    setSyncLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "공공 API 동기화에 실패했습니다.");
      return;
    }

    const summary = data.summary as {
      kcisa?: {
        scanned: number;
        imported: number;
        updated: number;
        skipped: number;
        geocoded: number;
        invalidImages: number;
      };
      cultureInfo?: {
        scanned: number;
        imported: number;
        updated: number;
        skipped: number;
        invalidImages: number;
        detailsFetched: number;
        pagesFetched?: number;
      };
      sema?: {
        scanned: number;
        imported: number;
        updated: number;
        skipped: number;
        detailsFetched: number;
      };
    };

    const parts: string[] = [];
    if (summary.kcisa) {
      parts.push(
        `문체부 스캔 ${summary.kcisa.scanned}/신규 ${summary.kcisa.imported}/갱신 ${summary.kcisa.updated}/좌표 ${summary.kcisa.geocoded}`
      );
    }
    if (summary.cultureInfo) {
      parts.push(
        `문화정보원 스캔 ${summary.cultureInfo.scanned}/신규 ${summary.cultureInfo.imported}/갱신 ${summary.cultureInfo.updated}/상세 ${summary.cultureInfo.detailsFetched}`
      );
    }
    if (summary.sema) {
      parts.push(
        `SeMA 스캔 ${summary.sema.scanned}/신규 ${summary.sema.imported}/갱신 ${summary.sema.updated}`
      );
    }

    setMessage(`공공 전시 동기화 완료 — ${parts.join(" · ")}`);
    router.refresh();
  }

  return (
    <main className="my-page">
      <section className="register-card wide my-page-header">
        <p className="eyebrow">Admin</p>
        <h1>관리자 페이지</h1>
        <p className="auth-description">
          Place Pool · 지역 코스 · 작가·공간·프로그램 검수 · 코스 성과 데이터를 관리합니다.
        </p>

        <div className="my-tabs">
          <button
            type="button"
            className={tab === "curations" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("curations")}
          >
            코스 큐레이션
          </button>
          <button
            type="button"
            className={tab === "review" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("review")}
          >
            공간·프로그램 검수 ({reviewSpaces.length + reviewPrograms.length})
          </button>
          <button
            type="button"
            className={tab === "places" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("places")}
          >
            Place Pool ({places.length})
          </button>
          <button
            type="button"
            className={tab === "tips" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("tips")}
          >
            장소 제보 ({pendingTipCount})
          </button>
          <button
            type="button"
            className={tab === "ownership" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("ownership")}
          >
            소유권 이관
          </button>
          <button
            type="button"
            className={tab === "applications" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("applications")}
          >
            작가 신청 ({applications.length})
          </button>
          <button
            type="button"
            className={tab === "members" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("members")}
          >
            회원 ({members.length})
          </button>
          <button
            type="button"
            className={tab === "events" ? "my-tab active" : "my-tab"}
            onClick={() => setTab("events")}
          >
            데이터 로그
          </button>
        </div>

        {message ? (
          <p className={message.includes("실패") ? "form-error" : "form-success"}>
            {message}
          </p>
        ) : null}
      </section>

      {tab === "curations" && (
        <>
          <section className="register-card wide my-section">
            <h2>{editingId ? "동선 코스 수정" : "동선 코스 만들기"}</h2>
            <p className="auth-description">
              동네 → 상황 → 시작 거점(선택) → 동선에 공간·장소·전시를 순서대로 추가 → 저장.
              거점은 상세 페이지 강조용이고, 지도 동선은 아래 목록 순서를 따릅니다.
              {editingId ? " 아래에서 «수정»을 누르면 이 폼에 불러옵니다." : ""}
            </p>
            {editingId ? (
              <div className="status-banner warn">
                수정 중인 큐레이션입니다.{" "}
                <button type="button" className="secondary-button" onClick={resetCurationForm}>
                  새 코스로 전환
                </button>
              </div>
            ) : null}

            <label>
              동네
              <input
                value={neighborhood}
                onChange={(event) => setNeighborhood(event.target.value)}
                placeholder="성수"
              />
            </label>

            <p className="field-label">상황 태그</p>
            <p className="field-hint">
              코스 상세·홈에서 “이런 날/이런 사람과”를 보여주는 편집용 라벨입니다. 검색
              필터와는 별개입니다.
            </p>
            <div className="admin-exhibition-picker">
              {SITUATION_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={situationTags.includes(tag) ? "taste-chip active" : "taste-chip"}
                  onClick={() => toggleSituation(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="admin-custom-tag-row">
              <input
                value={customSituation}
                onChange={(event) => setCustomSituation(event.target.value)}
                placeholder="직접 입력 (예: 비 오는 성수)"
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  const tag = customSituation.trim();
                  if (!tag) return;
                  if (!situationTags.includes(tag)) {
                    setSituationTags((prev) => [...prev, tag]);
                  }
                  setCustomSituation("");
                }}
              >
                태그 추가
              </button>
            </div>

            <label>
              시작 거점 (선택)
              <select
                value={basePlaceId}
                onChange={(event) => setBasePlaceId(event.target.value)}
              >
                <option value="">선택 안 함</option>
                {districtPlaces.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name} · {place.district} · {place.type}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-hint">
              카페·식당 등 Place Pool 장소입니다. 상세 페이지 «거점» 카드와 반경 필터 기준으로
              쓰입니다. 동선에 넣으려면 아래 «거점을 동선에 추가»를 누르세요.
            </p>

            <label>
              반경 (m) — 후보 필터용
              <input
                type="number"
                min={200}
                max={2000}
                step={100}
                value={radiusMeters}
                onChange={(event) => setRadiusMeters(Number(event.target.value) || 800)}
              />
            </label>

            <label>
              예상 시간
              <input
                value={durationText}
                onChange={(event) => setDurationText(event.target.value)}
                placeholder="2~3시간"
              />
            </label>

            <label className="course-pool-filter">
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
              />
              홈 히어로 추천 코스로 지정 (하나만 선택됨)
            </label>

            <label>
              제목
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 성수 오후, 로우키에서 시작하는 연무장 전시 둘러보기"
              />
            </label>
            <label>
              부제 (비우면 자동 생성)
              <input
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                placeholder="성수 · 로우키 거점 · 도보 10분 · …"
              />
            </label>
            <label>
              설명 (거점/흐름/팁 템플릿 — 비우면 자동 생성)
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setDescription(buildDescriptionDraft())}
            >
              설명 초안 채우기
            </button>

            <RichIntroEditor
              label="자유 소개 (이미지·문단)"
              hint="블로그처럼 사진과 글을 섞어 코스 이야기를 작성할 수 있습니다. 상세 페이지에 표시됩니다."
              blocks={storyBlocks}
              onChange={setStoryBlocks}
              uploadFolder="curations/story"
              onError={(message) => setMessage(message)}
            />

            <label>
              커버 이미지 URL (선택)
              <input
                value={coverImageUrl}
                onChange={(event) => setCoverImageUrl(event.target.value)}
                placeholder="업로드한 이미지 URL 또는 외부 URL"
              />
            </label>

            <CurationCourseBuilder
              neighborhood={neighborhood}
              basePlace={basePlace}
              radiusMeters={radiusMeters}
              spaces={spaceOptions}
              places={places}
              exhibitions={exhibitionOptions}
              stops={courseStops}
              onChange={setCourseStops}
            />

            <div className="review-form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={saveCuration}
                disabled={creating}
              >
                {creating
                  ? editingId
                    ? "저장 중..."
                    : "생성 중..."
                  : editingId
                    ? "수정 저장"
                    : "코스 발행"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetCurationForm}
                >
                  취소
                </button>
              ) : null}
            </div>
          </section>

          <section className="register-card wide my-section">
            <h2>등록된 큐레이션</h2>
            {curations.length > 0 ? (
              <div className="my-list">
                {curations.map((curation) => (
                  <article key={curation.id} className="my-list-card">
                    <div>
                      <h3>{curation.title}</h3>
                      {curation.subtitle ? <p>{curation.subtitle}</p> : null}
                      <p className="field-hint">
                        {curation.neighborhood ?? "지역 미정"}
                        {curation.basePlaceName ? ` · 거점 ${curation.basePlaceName}` : ""}
                        {" · "}
                        {curation.stopSummary}
                        {curation.exhibitionIds.length > 0
                          ? ` · 전시 ${curation.exhibitionTitles.slice(0, 2).join(", ")}${curation.exhibitionTitles.length > 2 ? " 외" : ""}`
                          : ""}
                      </p>
                      <span className={curation.published ? "status-pill ok" : "status-pill"}>
                        {curation.published ? "노출 중" : "숨김"}
                      </span>
                      {curation.featured ? (
                        <span className="status-pill ok">히어로 추천</span>
                      ) : null}
                      {editingId === curation.id ? (
                        <span className="status-pill warn">수정 중</span>
                      ) : null}
                    </div>
                    <div className="hub-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => loadCurationForEdit(curation)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => toggleFeatured(curation.id, !curation.featured)}
                      >
                        {curation.featured ? "히어로 해제" : "히어로 지정"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => togglePublish(curation.id, curation.published)}
                      >
                        {curation.published ? "숨기기" : "노출하기"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button warn-button"
                        onClick={() => deleteCuration(curation.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">등록된 큐레이션이 없습니다.</div>
            )}
          </section>
        </>
      )}

      {tab === "places" && (
        <>
          <section className="register-card wide my-section">
            <h2>{editingPlaceId ? "Place 수정" : "Place Pool 추가"}</h2>
            <p className="auth-description">
              지역별 카페·식당·산책 포인트를 자산으로 쌓아 두고, 코스 거점으로 조립합니다.
              {editingPlaceId
                ? " 아래에서 «수정»을 누르면 이 폼에 불러옵니다."
                : ""}
            </p>
            {editingPlaceId ? (
              <div className="status-banner warn">
                수정 중인 Place입니다.{" "}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetPlaceForm}
                >
                  새 Place로 전환
                </button>
              </div>
            ) : null}
            <div className="admin-place-grid">
              <label>
                이름
                <input
                  value={placeForm.name}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>
              <label>
                타입
                <select
                  value={placeForm.type}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                >
                  <option value="CAFE">CAFE</option>
                  <option value="RESTAURANT">RESTAURANT</option>
                  <option value="WALK">WALK</option>
                  <option value="ETC">ETC</option>
                </select>
              </label>
              <label>
                동네
                <input
                  value={placeForm.district}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, district: event.target.value }))
                  }
                />
              </label>
              <label>
                주소
                <input
                  value={placeForm.address}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
              </label>
              <label>
                lat
                <input
                  value={placeForm.lat}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, lat: event.target.value }))
                  }
                />
              </label>
              <label>
                lng
                <input
                  value={placeForm.lng}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, lng: event.target.value }))
                  }
                />
              </label>
              <label>
                태그 (쉼표)
                <input
                  value={placeForm.tags}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
              </label>
              <label>
                플레이스 URL
                <input
                  value={placeForm.sourceUrl}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, sourceUrl: event.target.value }))
                  }
                />
              </label>
              <label className="admin-place-notes">
                선정 메모 (내부)
                <input
                  value={placeForm.notes}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </label>
              <label className="admin-place-notes">
                홈 카드 한 줄
                <input
                  value={placeForm.editorialNote}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({
                      ...prev,
                      editorialNote: event.target.value
                    }))
                  }
                  placeholder="전시 보고 나서 정갈하게 앉기 좋은 곳"
                />
              </label>
              <label>
                홈 노출 순서
                <input
                  value={placeForm.homeSortOrder}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({
                      ...prev,
                      homeSortOrder: event.target.value
                    }))
                  }
                />
              </label>
              <label className="admin-place-notes">
                사진
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const imageUrl = await uploadPlaceImage(file);
                      setPlaceForm((prev) => ({ ...prev, imageUrl }));
                      setMessage("이미지가 업로드되었습니다.");
                    } catch (error) {
                      setMessage(
                        error instanceof Error ? error.message : "업로드 실패"
                      );
                    }
                  }}
                />
                {placeForm.imageUrl ? (
                  <span className="field-hint">업로드됨</span>
                ) : null}
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={placeForm.homeFeatured}
                  onChange={(event) =>
                    setPlaceForm((prev) => ({
                      ...prev,
                      homeFeatured: event.target.checked
                    }))
                  }
                />
                홈 «나만 알고 싶었던 곳인데»에 노출
              </label>
            </div>
            <div className="review-form-actions">
              <button
                type="button"
                className="primary-button"
                onClick={savePlace}
                disabled={creatingPlace}
              >
                {creatingPlace
                  ? "저장 중..."
                  : editingPlaceId
                    ? "Place 저장"
                    : "Place 추가"}
              </button>
              {editingPlaceId ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetPlaceForm}
                >
                  취소
                </button>
              ) : null}
            </div>
          </section>

          <section className="register-card wide my-section">
            <h2>등록된 Place</h2>
            {places.length > 0 ? (
              <div className="my-list">
                {places.map((place) => (
                  <article key={place.id} className="my-list-card ownership-card">
                    <div>
                      <h3>
                        {place.name}{" "}
                        <small>
                          {place.type} · {place.district}
                        </small>
                      </h3>
                      <p>{place.address}</p>
                      <p className="field-hint">
                        태그 {place.tags.join(", ") || "-"} · 사용 {place.usedCount}회
                      </p>
                      <div className="place-card-memos">
                        {place.notes ? (
                          <p>
                            <strong>선정 메모(내부)</strong>
                            {place.notes}
                          </p>
                        ) : (
                          <p className="muted">
                            <strong>선정 메모(내부)</strong>
                            없음
                          </p>
                        )}
                        {place.editorialNote ? (
                          <p>
                            <strong>홈 카드 한 줄</strong>
                            {place.editorialNote}
                          </p>
                        ) : (
                          <p className="muted">
                            <strong>홈 카드 한 줄</strong>
                            없음
                          </p>
                        )}
                      </div>
                      <span className={place.isActive ? "status-pill ok" : "status-pill"}>
                        {place.isActive ? "ACTIVE" : "RESTING"}
                      </span>
                      {place.homeFeatured ? (
                        <span className="status-pill ok">HOME</span>
                      ) : null}
                      {place.imageUrl ? (
                        <span className="status-pill ok">PHOTO</span>
                      ) : null}
                      {editingPlaceId === place.id ? (
                        <span className="status-pill warn">수정 중</span>
                      ) : null}
                    </div>
                    <div className="hub-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => loadPlaceForEdit(place)}
                      >
                        수정
                      </button>
                      <label className="secondary-button">
                        사진
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void patchPlaceImage(place.id, file);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => togglePlaceHome(place.id, place.homeFeatured)}
                      >
                        {place.homeFeatured ? "홈에서 내리기" : "홈에 올리기"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => togglePlaceActive(place.id, place.isActive)}
                      >
                        {place.isActive ? "쉬게 하기" : "다시 쓰기"}
                      </button>
                      <Link className="secondary-button" href={`/places/${place.id}`}>
                        상세
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Place Pool이 비어 있습니다.</div>
            )}
          </section>
        </>
      )}

      {tab === "tips" && (
        <section className="register-card wide my-section">
          <h2>장소 제보 검수</h2>
          <p className="auth-description">
            채택 시 Place가 생성됩니다. 주소·좌표는 Place Pool에서 보완한 뒤 홈에
            올려 주세요. 채택되면 제보자에게 이메일이 갑니다.
          </p>
          {placeTips.length > 0 ? (
            <div className="my-list">
              {placeTips.map((tip) => (
                <article key={tip.id} className="my-list-card">
                  <div>
                    <h3>
                      {tip.name}{" "}
                      <small>
                        {tip.district} · {tip.situation}
                      </small>
                    </h3>
                    <p className="field-hint">
                      {tip.userName} ({tip.userEmail}) ·{" "}
                      {new Date(tip.createdAt).toLocaleString("ko-KR")}
                    </p>
                    {tip.sourceUrl ? (
                      <p>
                        <a href={tip.sourceUrl} target="_blank" rel="noreferrer">
                          링크
                        </a>
                      </p>
                    ) : null}
                    {tip.imageUrl ? (
                      <p className="field-hint">사진 첨부됨</p>
                    ) : null}
                    <span
                      className={
                        tip.status === "ADOPTED"
                          ? "status-pill ok"
                          : tip.status === "REJECTED"
                            ? "status-pill"
                            : "status-pill warn"
                      }
                    >
                      {tip.status}
                    </span>
                    {tip.placeName ? (
                      <p className="field-hint">연결된 Place: {tip.placeName}</p>
                    ) : null}
                  </div>
                  {tip.status === "PENDING" ? (
                    <div className="hub-actions">
                      <button
                        type="button"
                        className="primary-button"
                        disabled={tipBusyId === tip.id}
                        onClick={() => reviewTip(tip, "adopt")}
                      >
                        채택
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={tipBusyId === tip.id}
                        onClick={() => reviewTip(tip, "reject")}
                      >
                        반려
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">제보가 없습니다.</div>
          )}
        </section>
      )}

      {tab === "review" && (
        <>
          <section className="register-card wide my-section">
            <h2>공간 검수</h2>
            <p className="auth-description">
              작가가 등록한 공간은 DRAFT 상태로 들어옵니다. 내용을 확인한 뒤 공개하세요.
              관리자 계정으로 직접 등록한 공간은 자동 공개됩니다.
            </p>
            {reviewSpaces.length > 0 ? (
              <div className="my-list">
                {reviewSpaces.map((space) => (
                  <article key={space.id} className="my-list-card">
                    <div>
                      <h3>{space.name}</h3>
                      <p>
                        {space.district} · {space.status}
                        {space.isPublic ? " · 공개" : " · 비공개"}
                      </p>
                      {space.ownerName ? (
                        <p className="field-hint">
                          등록: {space.ownerName} ({space.ownerEmail})
                        </p>
                      ) : (
                        <p className="field-hint">소유자 미연결</p>
                      )}
                    </div>
                    <div className="hub-actions">
                      {space.status === "PUBLISHED" && space.isPublic ? (
                        <a className="secondary-button" href={`/spaces/${space.slug}`}>
                          보기
                        </a>
                      ) : null}
                      <a
                        className="secondary-button"
                        href={`/my/spaces/${space.id}/edit`}
                      >
                        수정
                      </a>
                      {space.status !== "PUBLISHED" || !space.isPublic ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => publishSpace(space.id)}
                        >
                          공개하기
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="secondary-button warn-button"
                          onClick={() => hideSpace(space.id)}
                        >
                          비공개
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">검수 대기 중인 공간이 없습니다.</div>
            )}
          </section>

          <section className="register-card wide my-section">
            <h2>프로그램 검수</h2>
            {reviewPrograms.length > 0 ? (
              <div className="my-list">
                {reviewPrograms.map((program) => (
                  <article key={program.id} className="my-list-card">
                    <div>
                      <h3>{program.title}</h3>
                      <p>
                        {program.spaceName} · {program.startDate} - {program.endDate} ·{" "}
                        {program.status}
                      </p>
                      {program.hostName ? (
                        <p className="field-hint">
                          등록: {program.hostName} ({program.hostEmail})
                        </p>
                      ) : null}
                    </div>
                    <div className="hub-actions">
                      <a className="secondary-button" href={`/programs/${program.slug}`}>
                        미리보기
                      </a>
                      <a
                        className="secondary-button"
                        href={`/my/programs/${program.id}/edit`}
                      >
                        수정
                      </a>
                      {program.status !== "PUBLISHED" || !program.isPublic ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => publishProgram(program.id)}
                        >
                          공개하기
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="secondary-button warn-button"
                          onClick={() => hideProgram(program.id)}
                        >
                          비공개
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">검수 대기 중인 프로그램이 없습니다.</div>
            )}
          </section>
        </>
      )}

      {tab === "ownership" && (
        <>
          <section className="register-card wide my-section">
            <h2>소유권 이관</h2>
            <p className="auth-description">
              운영자가 대리 등록한 공간·전시·프로그램을, 이메일 인증·작가 승인까지 끝난
              계정에 연결합니다. 연결 후 작가는 MY에서 수정할 수 있습니다.
            </p>
          </section>

          <section className="register-card wide my-section">
            <h2>공간 ({ownershipSpaces.length})</h2>
            {ownershipSpaces.length > 0 ? (
              <div className="my-list">
                {ownershipSpaces.map((space) => {
                  const key = transferDraftKey("space", space.id);
                  return (
                    <article key={space.id} className="my-list-card ownership-card">
                      <div>
                        <h3>{space.name}</h3>
                        <p>
                          {space.district} · {space.status}
                        </p>
                        <p className="field-hint">
                          현재:{" "}
                          {space.ownerEmail
                            ? `${space.ownerName} (${space.ownerEmail})`
                            : "미연결"}
                        </p>
                        <label className="field">
                          <span>작가 이메일</span>
                          <input
                            type="email"
                            value={getTransferDraft("space", space.id, space.ownerEmail)}
                            onChange={(event) =>
                              setTransferDraft("space", space.id, event.target.value)
                            }
                            placeholder="approved-artist@example.com"
                          />
                        </label>
                      </div>
                      <div className="hub-actions">
                        <a className="secondary-button" href={`/spaces/${space.slug}`}>
                          보기
                        </a>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={transferringKey === key}
                          onClick={() =>
                            transferOwnership(
                              "space",
                              space.id,
                              getTransferDraft("space", space.id, space.ownerEmail)
                            )
                          }
                        >
                          {transferringKey === key ? "연결 중…" : "소유자 연결"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">공간이 없습니다.</div>
            )}
          </section>

          <section className="register-card wide my-section">
            <h2>전시 ({ownershipExhibitions.length})</h2>
            <p className="field-hint">공공 API 전시는 제외합니다.</p>
            {ownershipExhibitions.length > 0 ? (
              <div className="my-list">
                {ownershipExhibitions.map((exhibition) => {
                  const key = transferDraftKey("exhibition", exhibition.id);
                  return (
                    <article key={exhibition.id} className="my-list-card ownership-card">
                      <div>
                        <h3>{exhibition.title}</h3>
                        <p>
                          {exhibition.district} · {exhibition.status} · {exhibition.source}
                        </p>
                        <p className="field-hint">
                          현재:{" "}
                          {exhibition.registeredByEmail
                            ? `${exhibition.registeredByName} (${exhibition.registeredByEmail})`
                            : "미연결"}
                        </p>
                        <label className="field">
                          <span>작가 이메일</span>
                          <input
                            type="email"
                            value={getTransferDraft(
                              "exhibition",
                              exhibition.id,
                              exhibition.registeredByEmail
                            )}
                            onChange={(event) =>
                              setTransferDraft(
                                "exhibition",
                                exhibition.id,
                                event.target.value
                              )
                            }
                            placeholder="approved-artist@example.com"
                          />
                        </label>
                      </div>
                      <div className="hub-actions">
                        <a
                          className="secondary-button"
                          href={`/exhibitions/${exhibition.id}`}
                        >
                          보기
                        </a>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={transferringKey === key}
                          onClick={() =>
                            transferOwnership(
                              "exhibition",
                              exhibition.id,
                              getTransferDraft(
                                "exhibition",
                                exhibition.id,
                                exhibition.registeredByEmail
                              )
                            )
                          }
                        >
                          {transferringKey === key ? "연결 중…" : "등록자 연결"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">이관 대상 전시가 없습니다.</div>
            )}
          </section>

          <section className="register-card wide my-section">
            <h2>프로그램 ({ownershipPrograms.length})</h2>
            {ownershipPrograms.length > 0 ? (
              <div className="my-list">
                {ownershipPrograms.map((program) => {
                  const key = transferDraftKey("program", program.id);
                  return (
                    <article key={program.id} className="my-list-card ownership-card">
                      <div>
                        <h3>{program.title}</h3>
                        <p>
                          {program.spaceName} · {program.status}
                        </p>
                        <p className="field-hint">
                          현재:{" "}
                          {program.hostEmail
                            ? `${program.hostName} (${program.hostEmail})`
                            : "미연결"}
                        </p>
                        <label className="field">
                          <span>작가 이메일</span>
                          <input
                            type="email"
                            value={getTransferDraft(
                              "program",
                              program.id,
                              program.hostEmail
                            )}
                            onChange={(event) =>
                              setTransferDraft("program", program.id, event.target.value)
                            }
                            placeholder="approved-artist@example.com"
                          />
                        </label>
                      </div>
                      <div className="hub-actions">
                        <a
                          className="secondary-button"
                          href={`/programs/${program.slug}`}
                        >
                          보기
                        </a>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={transferringKey === key}
                          onClick={() =>
                            transferOwnership(
                              "program",
                              program.id,
                              getTransferDraft(
                                "program",
                                program.id,
                                program.hostEmail
                              )
                            )
                          }
                        >
                          {transferringKey === key ? "연결 중…" : "주최자 연결"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">프로그램이 없습니다.</div>
            )}
          </section>
        </>
      )}

      {tab === "members" && (
        <section className="register-card wide my-section">
          <h2>회원 관리</h2>
          <p className="auth-description">
            가입·이메일 인증·작가 승인을 한곳에서 처리합니다. 미인증 계정은 인증 메일
            재발송·강제 인증·삭제(빈 계정만)가 가능합니다. 이메일 인증이 끝난 회원은
            작가 신청 없이 「작가 승인」으로 바로 작가 권한을 줄 수 있습니다. 승인 후
            작가님은 다시 로그인하면 공간·전시 등록을 쓸 수 있습니다.
          </p>
          <div className="hub-actions" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={memberFilter === "all" ? "primary-button" : "secondary-button"}
              onClick={() => setMemberFilter("all")}
            >
              전체
            </button>
            <button
              type="button"
              className={
                memberFilter === "unverified" ? "primary-button" : "secondary-button"
              }
              onClick={() => setMemberFilter("unverified")}
            >
              미인증만 ({members.filter((member) => !member.emailVerifiedAt).length})
            </button>
          </div>
          {visibleMembers.length > 0 ? (
            <div className="my-list">
              {visibleMembers.map((member) => {
                const verified = Boolean(member.emailVerifiedAt);
                const busy = memberBusyId === member.id;
                const isArtistApproved = member.artistStatus === "APPROVED";
                const canApproveArtist =
                  verified &&
                  member.role !== "ADMIN" &&
                  !isArtistApproved;
                const canDelete =
                  !verified &&
                  member.role !== "ADMIN" &&
                  member.exhibitionCount +
                    member.spaceCount +
                    member.programCount +
                    member.reservationCount ===
                    0;
                return (
                  <article key={member.id} className="my-list-card ownership-card">
                    <div>
                      <h3>{member.name}</h3>
                      <p>{member.email}</p>
                      <p className="field-hint">
                        {member.role} · 작가 {member.artistStatus} ·{" "}
                        {verified ? "이메일 인증됨" : "미인증"} · 가입{" "}
                        {new Date(member.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                      <p className="field-hint">
                        전시 {member.exhibitionCount} · 공간 {member.spaceCount} ·
                        프로그램 {member.programCount} · 예약 {member.reservationCount}
                      </p>
                    </div>
                    <div className="hub-actions">
                      {!verified ? (
                        <>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busy}
                            onClick={() => handleMemberAction(member.id, "resend")}
                          >
                            {busy ? "처리 중…" : "인증 메일"}
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={busy}
                            onClick={() => handleMemberAction(member.id, "verify")}
                          >
                            {busy ? "처리 중…" : "강제 인증"}
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              className="secondary-button warn-button"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `${member.email} 미인증 계정을 삭제할까요? 삭제 후 같은 이메일로 다시 가입할 수 있습니다.`
                                  )
                                ) {
                                  handleMemberAction(member.id, "delete");
                                }
                              }}
                            >
                              삭제
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {isArtistApproved ? (
                            <span className="field-hint">이메일·작가 승인 완료</span>
                          ) : (
                            <span className="field-hint">이메일 인증 완료</span>
                          )}
                          {canApproveArtist ? (
                            <button
                              type="button"
                              className="primary-button"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `${member.name} (${member.email}) 님을 작가로 바로 승인할까요까요?\n작가 신청 절차 없이 공간·전시 등록 권한이 열립니다.`
                                  )
                                ) {
                                  handleMemberAction(member.id, "approveArtist");
                                }
                              }}
                            >
                              {busy ? "처리 중…" : "작가 승인"}
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">표시할 회원이 없습니다.</div>
          )}
        </section>
      )}

      {tab === "applications" && (
        <section className="register-card wide my-section">
          <h2>작가 승인 신청</h2>
          {applications.length > 0 ? (
            <div className="my-list">
              {applications.map((application) => (
                <article key={application.userId} className="my-list-card">
                  <div>
                    <h3>{application.name}</h3>
                    <p>{application.email}</p>
                    <p className="field-hint">{application.bio}</p>
                    {application.activityArea ? (
                      <p className="field-hint">활동 지역: {application.activityArea}</p>
                    ) : null}
                    {application.portfolioUrl ? (
                      <a
                        className="text-link"
                        href={application.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        포트폴리오 보기
                      </a>
                    ) : null}
                  </div>
                  <div className="hub-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => handleApplication(application.userId, "approve")}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className="secondary-button warn-button"
                      onClick={() => handleApplication(application.userId, "reject")}
                    >
                      반려
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">대기 중인 작가 신청이 없습니다.</div>
          )}
        </section>
      )}

      {tab === "events" && (
        <>
          <section className="register-card wide my-section">
            <h2>공공 전시 동기화</h2>
            <p className="auth-description">
              문체부 API_CCA_145와 한국문화정보원 «한눈에보는문화정보»(period2,
              serviceTp=A)에서 진행 중 전시를 가져와 `PUBLIC_API`로 등록합니다.
              문화정보원은 페이지당 10건이라 기본 200페이지(~2000건)까지 스캔하며,
              이미지 HEAD 검증을 생략해 빠르게 적재합니다. SeMA는 키워드 수집입니다.
            </p>
            <div className="admin-sync-actions">
              <button
                type="button"
                className="primary-button"
                disabled={syncLoading}
                onClick={() => syncPublicExhibitions("all")}
              >
                {syncLoading ? "동기화 중..." : "전체 가져오기"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={syncLoading}
                onClick={() => syncPublicExhibitions("kcisa")}
              >
                문체부만
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={syncLoading}
                onClick={() => syncPublicExhibitions("cultureinfo")}
              >
                문화정보원만
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={syncLoading}
                onClick={() => syncPublicExhibitions("sema")}
              >
                서울시립미술관(SeMA)
              </button>
            </div>
          </section>

          <section className="register-card wide my-section">
            <div className="admin-events-header">
              <div>
                <h2>큐레이션 성과</h2>
                <p className="auth-description">
                  조회 · 거점 클릭 · 전시 전환 · 저장을 코스별로 집계합니다. F&amp;B 제휴 설득용
                  기초 데이터입니다.
                </p>
              </div>
              <a className="secondary-button" href="/api/admin/events/export">
                CSV 내보내기
              </a>
            </div>
            {curationMetrics.length > 0 ? (
              <div className="my-table-wrap">
                <table className="my-table">
                  <thead>
                    <tr>
                      <th>코스</th>
                      <th>동네</th>
                      <th>조회</th>
                      <th>공유</th>
                      <th>거점클릭</th>
                      <th>전시전환</th>
                      <th>저장</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curationMetrics.map((row) => (
                      <tr key={row.curationId}>
                        <td>{row.title}</td>
                        <td>{row.neighborhood ?? "-"}</td>
                        <td>{row.views}</td>
                        <td>{row.shares}</td>
                        <td>{row.placeClicks}</td>
                        <td>{row.exhibitionViews}</td>
                        <td>{row.saves}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">아직 큐레이션 성과 데이터가 없습니다.</div>
            )}
          </section>

          <section className="register-card wide my-section">
            <h2>이벤트 요약</h2>
            {eventSummaries.length > 0 ? (
              <div className="stat-grid">
                {eventSummaries.map((event) => (
                  <div key={event.type} className="stat-card">
                    <span>{eventLabel(event.type)}</span>
                    <strong>{event.count}회</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">아직 수집된 이벤트가 없습니다.</div>
            )}
          </section>

          <section className="register-card wide my-section">
            <h2>최근 이벤트</h2>
            {recentEvents.length > 0 ? (
              <div className="my-table-wrap">
                <table className="my-table">
                  <thead>
                    <tr>
                      <th>일시</th>
                      <th>이벤트</th>
                      <th>전시</th>
                      <th>사용자</th>
                      <th>출처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((event) => (
                      <tr key={event.id}>
                        <td>{formatEventDate(event.createdAt)}</td>
                        <td>{eventLabel(event.type)}</td>
                        <td>{event.exhibitionTitle}</td>
                        <td>{event.userLabel}</td>
                        <td>{event.source ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">최근 이벤트가 없습니다.</div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    EXHIBITION_VIEW: "전시 상세 조회",
    EXHIBITION_SHARE: "전시 공유",
    ARTIST_SHARE: "작가 홍보 공유",
    VISIT_SHARE: "방문 기록 공유",
    CURATION_VIEW: "큐레이션 조회",
    CURATION_SHARE: "큐레이션 공유",
    PLACE_CLICK: "거점 플레이스 클릭",
    SAVE_CREATE: "저장",
    SAVE_REMOVE: "저장 취소",
    VISIT_CREATE: "다녀왔어요",
    VISIT_REMOVE: "방문 취소",
    REVIEW_UPSERT: "리뷰 작성/수정",
    REVIEW_DELETE: "리뷰 삭제",
    RESERVATION_CREATE: "예약 완료",
    RESERVATION_INTENT: "예약 클릭"
  };

  return labels[type] ?? type;
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
