"use client";

import { US_STATES } from "@/lib/us-states";

// City / State / ZIP trio used by the company and event forms.
// `required` toggles HTML validation (members must fill it; businesses may skip).
export default function RegionFields({
  city = "",
  state = "",
  zip = "",
  required = false,
}: {
  city?: string;
  state?: string;
  zip?: string;
  required?: boolean;
}) {
  return (
    <>
      <div>
        <label htmlFor="city">City</label>
        <input id="city" name="city" defaultValue={city} autoComplete="address-level2" required={required} />
      </div>
      <div>
        <label htmlFor="state">State</label>
        <select id="state" name="state" defaultValue={state} autoComplete="address-level1" required={required}>
          <option value="">{required ? "Choose…" : "—"}</option>
          {US_STATES.map((s) => (
            <option key={s.abbr} value={s.abbr}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="zip">ZIP code</label>
        <input id="zip" name="zip" inputMode="numeric" pattern="\d{5}" maxLength={5} defaultValue={zip} autoComplete="postal-code" required={required} />
      </div>
    </>
  );
}
