import ConfirmSubmit from "./confirm-submit";
import { sendConnect, acceptConnect, removeConnect } from "@/app/(member)/connections/actions";
import type { ConnState } from "@/lib/connections";

// Renders the right connection action(s) for a member, given the viewer's
// relationship to them. Server component — each button is a plain form.
export default function ConnectControls({
  otherId,
  state,
  size = "inline-btn",
}: {
  otherId: number;
  state: ConnState;
  size?: string;
}) {
  if (state === "self") return null;

  if (state === "connected") {
    return (
      <div className="conn-controls">
        <span className="badge">Connected</span>
        <form action={removeConnect}>
          <input type="hidden" name="otherId" value={otherId} />
          <ConfirmSubmit className="link-danger" message="Remove this connection?">Remove</ConfirmSubmit>
        </form>
      </div>
    );
  }

  if (state === "outgoing") {
    return (
      <div className="conn-controls">
        <span className="meta">Request sent</span>
        <form action={removeConnect}>
          <input type="hidden" name="otherId" value={otherId} />
          <button className={`btn btn-ghost ${size}`} type="submit">Cancel</button>
        </form>
      </div>
    );
  }

  if (state === "incoming") {
    return (
      <div className="conn-controls">
        <form action={acceptConnect}>
          <input type="hidden" name="otherId" value={otherId} />
          <button className={`btn ${size}`} type="submit">Accept</button>
        </form>
        <form action={removeConnect}>
          <input type="hidden" name="otherId" value={otherId} />
          <button className={`btn btn-ghost ${size}`} type="submit">Decline</button>
        </form>
      </div>
    );
  }

  return (
    <form action={sendConnect}>
      <input type="hidden" name="otherId" value={otherId} />
      <button className={`btn ${size}`} type="submit">Connect</button>
    </form>
  );
}
