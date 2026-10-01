import { Button, Checkbox, InputGroup, TagInput } from '@blueprintjs/core';
import { NumberInput } from 'react-cheminfo/ui';

import type { FilterField, FilterFieldType, OperatorId } from './types.ts';

interface ValueEditorProps {
  /** Field definition for the currently chosen field (undefined for free-text). */
  fieldDef: FilterField | undefined;
  /** Effective field type (mirrors `fieldDef.type`, defaults to `string`). */
  fieldType: FilterFieldType;
  /** Currently selected operator. */
  operator: OperatorId;
  /** Current values. Length 2 for `between`, ≥ 1 otherwise. */
  values: string[];
  /** Called when the user edits the values. */
  onChange: (next: string[]) => void;
  /**
   * Text typed into the `TagInput` but not yet committed (no Enter pressed
   * yet). Lifted into the parent so the Apply handler can flush it into
   * `values` without first round-tripping through state updates.
   */
  pendingInput: string;
  /** Called whenever the `TagInput` pending text changes. */
  onPendingInputChange: (next: string) => void;
}

/**
 * Renders the value section of the clause editor. The exact widget is
 * picked from {fieldType, operator}:
 *
 * - `between`              → two `NumberInput`s with a `…` separator.
 * - `enum`                 → multi-checkbox list of the field's `options`.
 * - `number` (≤ 1 value)   → plain `NumberInput` + `+` to grow to OR-list.
 * - `string` (≤ 1 value)   → plain `InputGroup` + `+` to grow to OR-list.
 * - multi-value (length>1) → BlueprintJS `TagInput`; pending text is
 *                            tracked via `pendingInput` so a click on
 *                            `Apply` mid-typing doesn't drop it.
 * @param props - Component props.
 * @param props.fieldDef - Field schema (for placeholders / enum options).
 * @param props.fieldType - Effective field type.
 * @param props.operator - Currently selected operator.
 * @param props.values - Current value list.
 * @param props.onChange - Called when the values change.
 * @param props.pendingInput - Uncommitted `TagInput` text.
 * @param props.onPendingInputChange - Setter for the pending text.
 * @returns The value-editor React element.
 */
export default function ValueEditor({
  fieldDef,
  fieldType,
  operator,
  values,
  onChange,
  pendingInput,
  onPendingInputChange,
}: ValueEditorProps) {
  if (operator === 'between') {
    const [low = '', high = ''] = values;
    return (
      <div className="smart-filter-editor-range">
        <NumberInput
          allowEmpty
          buttons={false}
          fill
          placeholder={
            fieldDef?.min !== undefined ? String(fieldDef.min) : 'low'
          }
          value={numberOf(low)}
          ariaLabel="From"
          onChange={(next) => onChange([textOf(next), high])}
        />
        <span className="smart-filter-editor-range-sep">…</span>
        <NumberInput
          allowEmpty
          buttons={false}
          fill
          placeholder={
            fieldDef?.max !== undefined ? String(fieldDef.max) : 'high'
          }
          value={numberOf(high)}
          ariaLabel="To"
          onChange={(next) => onChange([low, textOf(next)])}
        />
      </div>
    );
  }
  if (fieldType === 'enum' && fieldDef?.options) {
    return (
      <div className="smart-filter-editor-enum">
        {fieldDef.options.map((option) => {
          const checked = values.includes(option);
          return (
            <Checkbox
              key={option}
              checked={checked}
              label={option}
              onChange={() => {
                onChange(
                  checked
                    ? values.filter((value) => value !== option)
                    : [...values.filter(Boolean), option],
                );
              }}
            />
          );
        })}
      </div>
    );
  }
  if (values.length <= 1) {
    const current = values[0] ?? '';
    const grow = () => onChange([current, '']);
    return (
      <div className="smart-filter-editor-single">
        {fieldType === 'number' ? (
          <NumberInput
            allowEmpty
            buttons={false}
            fill
            placeholder="value"
            value={numberOf(current)}
            ariaLabel="Value"
            onChange={(next) => onChange([textOf(next)])}
          />
        ) : (
          <InputGroup
            fill
            placeholder="value"
            value={current}
            onChange={(event) => onChange([event.target.value])}
          />
        )}
        <Button
          icon="plus"
          size="small"
          variant="minimal"
          title="Add another OR value"
          onClick={grow}
        />
      </div>
    );
  }
  return (
    <TagInput
      fill
      placeholder="press Enter to add another value"
      values={values.filter(Boolean)}
      inputValue={pendingInput}
      onInputChange={(event) => onPendingInputChange(event.target.value)}
      onChange={(next) => {
        onChange(next.map((item) => (typeof item === 'string' ? item : '')));
        onPendingInputChange('');
      }}
    />
  );
}

/**
 * The number a stored value reads as.
 * @param text - The value as the clause stores it.
 * @returns The number, or nothing when the box is empty.
 */
function numberOf(text: string): number | undefined {
  if (text.trim() === '') return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * The text a clause stores a number as.
 * @param value - The number, or nothing when the box is empty.
 * @returns Its text.
 */
function textOf(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}
