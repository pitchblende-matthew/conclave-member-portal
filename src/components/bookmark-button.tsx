import Icon from "@/components/icons";
import { toggleBookmark } from "@/app/(member)/_engagement/actions";

// Save/unsave (bookmark) toggle. Plain form (no JS); the page revalidates.
export default function BookmarkButton({
  contentType,
  contentId,
  saved,
  path,
}: {
  contentType: "briefing" | "topic" | "event";
  contentId: number;
  saved: boolean;
  path: string;
}) {
  return (
    <form action={toggleBookmark}>
      <input type="hidden" name="content_type" value={contentType} />
      <input type="hidden" name="content_id" value={contentId} />
      <input type="hidden" name="path" value={path} />
      <button type="submit" className={`react-btn${saved ? " on" : ""}`} aria-pressed={saved} title={saved ? "Remove from saved" : "Save"}>
        <Icon name="pin" size={15} />
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
    </form>
  );
}
