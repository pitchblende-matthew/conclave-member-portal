import type { Taxon } from "@/lib/member-taxonomy";
import type { Industry } from "@/lib/industries";

// Checkbox groups for tagging content by industry + function. No-JS friendly;
// the inputs are named "industry" / "function" (multiple) and read server-side
// via readTagIds(formData).
export default function TagPicker({
  industries,
  functions,
  selectedIndustry = [],
  selectedFunction = [],
}: {
  industries: Industry[];
  functions: Taxon[];
  selectedIndustry?: number[];
  selectedFunction?: number[];
}) {
  return (
    <fieldset className="tag-picker">
      <legend>Relevant to <span className="meta">(optional)</span></legend>
      <div className="tag-pick-group">
        <span className="tag-pick-label">Industries</span>
        <div className="tag-pick-options">
          {industries.map((i) => (
            <label key={i.id} className="tag-check">
              <input type="checkbox" name="industry" value={i.id} defaultChecked={selectedIndustry.includes(i.id)} />
              <span>{i.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="tag-pick-group">
        <span className="tag-pick-label">Functions</span>
        <div className="tag-pick-options">
          {functions.map((f) => (
            <label key={f.id} className="tag-check">
              <input type="checkbox" name="function" value={f.id} defaultChecked={selectedFunction.includes(f.id)} />
              <span>{f.name}</span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
