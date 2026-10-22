import React, {
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

export type SmoothInputProps = ComponentPropsWithoutRef<'input'> & {
  wrapperClassName?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  isFilled?: boolean;
  accentColor?: 'cyan' | 'fuchsia' | 'purple' | 'emerald';
};

const PASSWORD_CHAR = typeof navigator !== 'undefined' && navigator.userAgent.match(/firefox|fxios/i)
  ? '\u25CF'
  : '\u2022';

export const SmoothInput = ({
  className,
  wrapperClassName,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  type = 'text',
  placeholder = 'Enter details…',
  icon,
  rightElement,
  isFilled = false,
  accentColor = 'cyan',
  style,
  ...props
}: SmoothInputProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const caretX = useMotionValue(0);
  const caretOpacity = useMotionValue(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const isControlled = value !== undefined;
  const inputValue = isControlled ? String(value) : String(internalValue);

  // Smooth spring physics matching Skiper 106 source code
  const springCaretX = useSpring(
    caretX,
    prefersReducedMotion
      ? { stiffness: 10000, damping: 100, mass: 0.1 }
      : { stiffness: 500, damping: 30, mass: 0.5 }
  );

  const syncMeasureSpan = () => {
    const input = inputRef.current;
    const measureSpan = measureRef.current;
    if (!input || !measureSpan) return;

    const styles = window.getComputedStyle(input);
    const isPassword = input.type === 'password';

    let fontSize = styles.fontSize;
    if (
      PASSWORD_CHAR === '\u2022' &&
      isPassword &&
      typeof navigator !== 'undefined' &&
      !navigator.userAgent.match(/chrome|chromium|crios/i)
    ) {
      fontSize = `${parseFloat(fontSize) + 6.25}px`;
    }

    measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize} ${styles.fontFamily}`;
    measureSpan.style.letterSpacing = styles.letterSpacing;
    measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
    measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
  };

  const measurePrefixWidth = (text: string) => {
    const input = inputRef.current;
    const measureSpan = measureRef.current;
    if (!input || !measureSpan) return null;

    syncMeasureSpan();
    measureSpan.textContent = text;

    const paddingLeft = parseFloat(window.getComputedStyle(input).paddingLeft) || 0;

    return text.length > 0
      ? measureSpan.offsetWidth + paddingLeft
      : paddingLeft - 1;
  };

  const scrollCaretIntoView = (
    target: HTMLInputElement,
    absoluteWidth: number
  ) => {
    const styles = window.getComputedStyle(target);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
    const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
    const visibleLeft = target.scrollLeft + paddingLeft;

    if (absoluteWidth > visibleRight) {
      target.scrollLeft = Math.min(
        absoluteWidth - target.clientWidth + paddingRight,
        maxScroll
      );
      return;
    }

    if (absoluteWidth < visibleLeft) {
      target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
    }
  };

  const getCaretIndex = (target: HTMLInputElement) => {
    const selectionStart = target.selectionStart ?? 0;
    const selectionEnd = target.selectionEnd ?? 0;

    if (selectionStart === selectionEnd) {
      return selectionStart;
    }

    return target.selectionDirection === 'backward'
      ? selectionStart
      : selectionEnd;
  };

  const updateCaretFromInput = (target: HTMLInputElement) => {
    const selectionStart = target.selectionStart ?? 0;
    const selectionEnd = target.selectionEnd ?? 0;
    const hasSelection = selectionStart !== selectionEnd;
    const caretIndex = getCaretIndex(target);
    const isPassword = target.type === 'password';
    const textBeforeCaret = isPassword
      ? PASSWORD_CHAR.repeat(caretIndex)
      : target.value.slice(0, caretIndex);

    const absoluteWidth = measurePrefixWidth(textBeforeCaret);
    if (absoluteWidth === null) return;

    scrollCaretIntoView(target, absoluteWidth);

    const styles = window.getComputedStyle(target);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const caretPosition = absoluteWidth - target.scrollLeft;
    const minX = paddingLeft - 1;
    const maxX = target.clientWidth - paddingRight;
    const isCaretVisible = caretPosition >= minX && caretPosition <= maxX + 1;

    caretX.set(Math.min(caretPosition, maxX));

    if (!isCaretVisible || hasSelection) {
      caretOpacity.set(0);
      return;
    }

    caretOpacity.set(1);
  };

  const updateCaretRef = useRef(updateCaretFromInput);
  updateCaretRef.current = updateCaretFromInput;
  const caretOpacityRef = useRef(caretOpacity);
  caretOpacityRef.current = caretOpacity;

  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) {
      updateCaretRef.current(input);
    }
  }, [inputValue]);

  useEffect(() => {
    const input = inputRef.current;
    const container = containerRef.current;
    if (!input || !container) return;

    const updateCaretIfFocused = () => {
      if (document.activeElement === input) {
        updateCaretRef.current(input);
      }
    };

    const handleSelectionChange = () => {
      if (document.activeElement !== input) return;

      requestAnimationFrame(() => {
        if (document.activeElement === input) {
          updateCaretRef.current(input);
        }
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.fonts?.addEventListener?.('loadingdone', updateCaretIfFocused);
    void document.fonts?.ready?.then?.(updateCaretIfFocused);
    input.addEventListener('scroll', updateCaretIfFocused);

    const resizeObserver = new ResizeObserver(updateCaretIfFocused);
    resizeObserver.observe(container);

    updateCaretIfFocused();

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.fonts?.removeEventListener?.('loadingdone', updateCaretIfFocused);
      input.removeEventListener('scroll', updateCaretIfFocused);
      resizeObserver.disconnect();
    };
  }, []);

  // Glowing borders based on accent & filled status
  const borderStyles = isFilled
    ? accentColor === 'fuchsia'
      ? 'border-fuchsia-400 bg-fuchsia-950/25 text-white shadow-[0_0_15px_rgba(217,70,239,0.65)] ring-1 ring-fuchsia-400/50'
      : accentColor === 'purple'
      ? 'border-purple-400 bg-purple-950/25 text-white shadow-[0_0_15px_rgba(168,85,247,0.65)] ring-1 ring-purple-400/50'
      : accentColor === 'emerald'
      ? 'border-emerald-400 bg-emerald-950/25 text-white shadow-[0_0_15px_rgba(16,185,129,0.65)] ring-1 ring-emerald-400/50'
      : 'border-cyan-400 bg-cyan-950/25 text-white shadow-[0_0_15px_rgba(6,182,212,0.65)] ring-1 ring-cyan-400/50'
    : isFocused
    ? 'border-cyan-400 bg-[#070a13] text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
    : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600';

  const caretColorClass =
    accentColor === 'fuchsia'
      ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.9)]'
      : accentColor === 'purple'
      ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.9)]'
      : accentColor === 'emerald'
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
      : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center w-full rounded-xl border text-xs sm:text-sm font-medium transition-all duration-300',
        borderStyles,
        wrapperClassName
      )}
    >
      {/* Left Icon */}
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          {icon}
        </div>
      )}

      {/* Input container with smooth spring caret */}
      <div
        className="relative grid grid-cols-1 w-full"
        style={{ caretColor: 'transparent' }}
      >
        <input
          {...props}
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          value={inputValue}
          className={cn(
            'w-full bg-transparent py-2.5 text-xs sm:text-sm font-medium outline-none placeholder:text-slate-500 transition-colors',
            icon ? 'pl-10' : 'pl-3.5',
            rightElement ? 'pr-10' : 'pr-3.5',
            className
          )}
          style={style}
          onChange={(e) => {
            if (!isControlled) setInternalValue(e.target.value);
            onChange?.(e);
            requestAnimationFrame(() => {
              updateCaretRef.current(e.target);
            });
          }}
          onFocus={(e) => {
            setIsFocused(true);
            caretOpacityRef.current.set(1);
            onFocus?.(e);
            requestAnimationFrame(() => {
              updateCaretRef.current(e.target);
            });
          }}
          onBlur={(e) => {
            setIsFocused(false);
            caretOpacityRef.current.set(0);
            onBlur?.(e);
          }}
        />

        {/* Hidden measurement span for exact subpixel text width */}
        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre"
        />

        {/* Smooth Spring Caret Cursor */}
        <motion.div
          className={cn(
            'pointer-events-none absolute col-start-1 col-end-2 row-start-1 row-end-2 w-0.5 rounded-full self-center',
            caretColorClass
          )}
          style={{
            x: springCaretX,
            opacity: caretOpacity,
            height: '1.25em',
          }}
        />
      </div>

      {/* Right Element (e.g. Eye toggle for passwords) */}
      {rightElement && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 flex items-center">
          {rightElement}
        </div>
      )}
    </div>
  );
};
