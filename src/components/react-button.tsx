import Icon from "@/components/icons";
import { toggleReaction } from "@/app/(member)/_engagement/actions";

// "Appreciate" toggle with a count. Plain form (no JS); the page revalidates.
export default function ReactButton({
  contentType,
  contentId,
  count,
  reacted,
  path,
}: {
  contentType: "briefing" | "post";
  contentId: number;
  count: number;
  reacted: boolean;
  path: string;
}) {
  return (
    <form action={toggleReaction}>
      <input type="hidden" name="content_type" value={contentType} />
      <input type="hidden" name="content_id" value={contentId} />
      <input type="hidden" name="path" value={path} />
      <button type="submit" className={`react-btn${reacted ? " on" : ""}`} aria-pressed={reacted} title={reacted ? "Remove appreciation" : "Appreciate"}>
        <Icon name="sparkle" size={15} />
        <span>{count > 0 ? `${count}` : "Appreciate"}</span>
      </button>
    </form>
  );
}
