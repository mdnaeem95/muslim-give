/** One option in a chip group or segmented control. */
export interface ChoiceOption<V extends string> {
  readonly value: V;
  readonly label: string;
  /** Spoken label where the visible one reads badly, e.g. "10 Singapore dollars" for "S$10". */
  readonly accessibilityLabel?: string;
}
