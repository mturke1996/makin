import { useState, type ReactNode } from "react";
import { Backspace, Dialpad } from "@mui/icons-material";
import { Input } from "../../design-system/primitives";
import { isPartialDecimalInput } from "../../core/utils-formatters";
import { pressAmountKey, type PadKey } from "./quickExpenseLogic";

interface AmountEntryProps {
  value: string;
  onChange: (value: string) => void;
  status?: ReactNode;
}

/** Compact native decimal input leaves the client, category and save action within reach. */
export function AmountEntry({ value, onChange, status }: AmountEntryProps) {
  const [padOpen, setPadOpen] = useState(false);
  const keys: PadKey[] = [
    "7",
    "8",
    "9",
    "4",
    "5",
    "6",
    "1",
    "2",
    "3",
    ".",
    "0",
    "BS",
  ];
  return (
    <div className="space-y-2">
      <Input
        label="المبلغ بالدينار"
        value={value}
        onChange={(event) => {
          if (isPartialDecimalInput(event.target.value))
            onChange(event.target.value);
        }}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.000"
        dir="ltr"
        className="text-xl font-bold tabular-nums"
        calculator="حاسبة المبلغ"
        calculatorUnit="د.ل"
      />
      <button
        type="button"
        aria-expanded={padOpen}
        onClick={() => setPadOpen(!padOpen)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-fg-subtle hover:bg-surface-hover focus-visible:shadow-focus"
      >
        <Dialpad aria-hidden sx={{ fontSize: 18 }} />{" "}
        {padOpen ? "إخفاء لوحة الأرقام" : "لوحة أرقام داخلية"}
      </button>
      {padOpen && (
        <div dir="ltr" className="grid grid-cols-3 gap-2">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={
                key === "BS" ? "حذف رقم" : key === "." ? "فاصلة عشرية" : key
              }
              onClick={() => onChange(pressAmountKey(value, key))}
              className="grid min-h-11 place-items-center rounded-md bg-surface-sunken text-xl font-semibold tabular-nums text-fg hover:bg-surface-hover focus-visible:shadow-focus"
            >
              {key === "BS" ? (
                <Backspace aria-hidden sx={{ fontSize: 22 }} />
              ) : (
                key
              )}
            </button>
          ))}
        </div>
      )}
      {status}
    </div>
  );
}
