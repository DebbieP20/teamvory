"use client";

import { ClockIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { QUARTER_HOURS, formatTimeFull, isTimeTyping, parseTimeInput } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * A time box people can type into ("12:15 pm", "2pm", "1430"...) or pick from a
 * list. Only keys that can make a time are accepted; "2" becomes 2:00 PM when the
 * box is left (Tab, Enter or a click elsewhere). The list always shows :00, :15, :30 and :45, whatever was typed. (The
 * browser's own time picker builds its list from the typed minutes, so after
 * 12:22 it would offer :07, :22, :37 and :52.)
 *
 * `value` is "HH:mm" when the text could be understood, otherwise the raw text,
 * so the parent can show an error. Follows the ARIA combobox pattern.
 */
export function TimeCombobox({
  id,
  name,
  value,
  onChange,
  invalid,
  errorId,
  label,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  errorId?: string;
  /** Accessible name when there's no visible <label for={id}> */
  label?: string;
}) {
  const listId = useId();
  const [text, setText] = useState(() => display(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => nearestIndex(value));
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the highlighted choice visible while the list is open. Only the list scrolls, never
  // the page (scrollIntoView would also move the page, which jumps on phones).
  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [open, active]);

  // Tapping a box that shows a time selects it, so typing replaces it. Some phones drop the
  // selection, so the first character typed after focusing also starts a new time. A second
  // tap, or an arrow key, places the cursor for a small fix instead.
  const replaceOnType = useRef(false);
  const justFocused = useRef(false);

  function commit(raw: string) {
    const parsed = parseTimeInput(raw);
    if (parsed) setText(formatTimeFull(parsed));
    onChange(parsed ?? raw.trim());
  }

  function choose(index: number) {
    const time = QUARTER_HOURS[index];
    setText(formatTimeFull(time));
    setActive(index);
    onChange(time);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) replaceOnType.current = false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + QUARTER_HOURS.length) % QUARTER_HOURS.length);
    } else if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        choose(active);
      } else {
        commit(text);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          inputMode="text"
          autoComplete="off"
          placeholder="Pick a time"
          value={text}
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(e) => {
            let next = e.target.value;
            const typed = (e.nativeEvent as InputEvent).data;
            if (replaceOnType.current && typed && next !== typed && next.length === text.length + typed.length) next = typed;
            replaceOnType.current = false;
            // Ignore keys that can't be part of a time (e.g. digits after "PM").
            if (!isTimeTyping(next)) return;
            setText(next);
            setOpen(true);
            const parsed = parseTimeInput(next);
            if (parsed) setActive(nearestIndex(parsed));
          }}
          onFocus={(e) => {
            replaceOnType.current = e.currentTarget.value !== "";
            justFocused.current = true;
            const box = e.currentTarget;
            box.select();
            // Again just after the tap (phones can undo it), unless a key was pressed already.
            setTimeout(() => document.activeElement === box && replaceOnType.current && box.select(), 0);
          }}
          onMouseUp={(e) => {
            // Releasing the first tap would put the cursor in the text and undo the selection.
            if (justFocused.current) e.preventDefault();
            else replaceOnType.current = false;
            justFocused.current = false;
          }}
          onClick={() => setOpen(true)}
          onBlur={() => {
            replaceOnType.current = false;
            justFocused.current = false;
            setOpen(false);
            commit(text);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "h-10 w-36 rounded-lg border bg-white pr-9 pl-2.5 text-base outline-none focus-visible:ring-3",
            invalid
              ? "border-destructive bg-red-50 text-destructive focus-visible:ring-destructive/30"
              : "border-input focus-visible:border-ring focus-visible:ring-ring/50",
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show times"
          onMouseDown={(e) => e.preventDefault()} // keep focus in the box
          onClick={() => {
            inputRef.current?.focus();
            setOpen((o) => !o);
          }}
          className="absolute inset-y-0 right-0 grid w-9 place-items-center text-slate-500 hover:text-navy"
        >
          <ClockIcon className="size-4" aria-hidden />
        </button>
      </div>
      {/* The value sent with the form: "HH:mm", or what was typed if it couldn't be understood. */}
      <input type="hidden" name={name} value={value} />
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Times"
          className="absolute z-20 mt-1 max-h-60 w-36 overflow-auto rounded-lg border bg-white py-1 shadow-lg"
        >
          {QUARTER_HOURS.map((time, i) => (
            <li
              key={time}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={time === value}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the box
              onClick={() => choose(i)}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm",
                i === active && "bg-mint text-teal-dark",
                time === value && "font-semibold",
              )}
            >
              {formatTimeFull(time)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function display(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? formatTimeFull(value) : value;
}

/** The list position closest to `value` (rounding down to the quarter hour). */
function nearestIndex(value: string) {
  const parsed = parseTimeInput(value) ?? "12:00";
  const minutes = Number(parsed.slice(0, 2)) * 60 + Number(parsed.slice(3));
  return Math.min(QUARTER_HOURS.length - 1, Math.floor(minutes / 15));
}

/** A friendly message if a typed time can't be used, otherwise null. */
export function timeProblem(time: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "Double-check the time. Type it like 12:15 PM, or pick one from the list.";
  if (Number(time.slice(3)) % 15 !== 0) {
    return "Double-check the time. Use :00, :15, :30 or :45, like 12:15 PM.";
  }
  return null;
}
