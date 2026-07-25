"use client";

import { PHONE_COUNTRY_CODE } from "@/lib/phone";

/** Phone input with a fixed +94 country-code badge — the user only ever
 *  types the local 9-digit number. `value`/`onChange` deal in local digits
 *  only; combine with lib/phone.ts's toE164() before sending to the API. */
export function PhoneField({
  value,
  onChange,
  placeholder = "7X XXX XXXX",
  required,
}: {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="field flex items-center gap-2 p-0">
      <span className="ui select-none border-r border-slate-200 py-2.5 pl-3 pr-2 text-sm font-medium text-slate-600 dark:border-zinc-800 dark:text-zinc-400">
        {PHONE_COUNTRY_CODE}
      </span>
      <input
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        required={required}
        maxLength={9}
        className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 outline-none"
      />
    </div>
  );
}
