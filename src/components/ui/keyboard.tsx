import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playKeyClickSound } from '../../utils/keyboardAudio';

interface KeyboardProps {
  enableSound?: boolean;
  onKeyPress?: (keyLabel: string) => void;
}

interface FlyingKey {
  id: number;
  label: string;
  sub?: string;
  leftPercent: number;
  topPercent: number;
  driftX: number;
  rotation: number;
  targetY: number;
}

const KEYBOARD_ROWS = [
  [
    { label: 'esc', sub: '' },
    { label: 'F1', sub: '☀︎' },
    { label: 'F2', sub: '☀︎' },
    { label: 'F3', sub: '🀰' },
    { label: 'F4', sub: '🔍' },
    { label: 'F5', sub: '🎤' },
    { label: 'F6', sub: '☾' },
    { label: 'F7', sub: '⏮' },
    { label: 'F8', sub: '⏯' },
    { label: 'F9', sub: '⏭' },
    { label: 'F10', sub: '🔇' },
    { label: 'F11', sub: '🔉' },
    { label: 'F12', sub: '🔊' },
  ],
  [
    { label: '~', sub: '`' },
    { label: '!', sub: '1' },
    { label: '@', sub: '2' },
    { label: '#', sub: '3' },
    { label: '$', sub: '4' },
    { label: '%', sub: '5' },
    { label: '^', sub: '6' },
    { label: '&', sub: '7' },
    { label: '*', sub: '8' },
    { label: '(', sub: '9' },
    { label: ')', sub: '0' },
    { label: '_', sub: '-' },
    { label: '+', sub: '=' },
    { label: 'del', sub: '' },
  ],
  [
    { label: 'tab', sub: '' },
    { label: 'q', sub: '' },
    { label: 'w', sub: '' },
    { label: 'e', sub: '' },
    { label: 'r', sub: '' },
    { label: 't', sub: '' },
    { label: 'y', sub: '' },
    { label: 'u', sub: '' },
    { label: 'i', sub: '' },
    { label: 'o', sub: '' },
    { label: 'p', sub: '' },
    { label: '{', sub: '[' },
    { label: '}', sub: ']' },
    { label: '|', sub: '\\' },
  ],
  [
    { label: 'caps', sub: '' },
    { label: 'a', sub: '' },
    { label: 's', sub: '' },
    { label: 'd', sub: '' },
    { label: 'f', sub: '' },
    { label: 'g', sub: '' },
    { label: 'h', sub: '' },
    { label: 'j', sub: '' },
    { label: 'k', sub: '' },
    { label: 'l', sub: '' },
    { label: ':', sub: ';' },
    { label: '"', sub: "'" },
    { label: 'return', sub: '' },
  ],
  [
    { label: 'shift', sub: '' },
    { label: 'z', sub: '' },
    { label: 'x', sub: '' },
    { label: 'c', sub: '' },
    { label: 'v', sub: '' },
    { label: 'b', sub: '' },
    { label: 'n', sub: '' },
    { label: 'm', sub: '' },
    { label: '<', sub: ',' },
    { label: '>', sub: '.' },
    { label: '?', sub: '/' },
    { label: 'shift', sub: '' },
  ],
  [
    { label: 'fn', sub: '🌐' },
    { label: 'ctrl', sub: '⌃' },
    { label: 'opt', sub: '⌥' },
    { label: 'cmd', sub: '⌘' },
    { label: 'space', sub: '' },
    { label: 'cmd', sub: '⌘' },
    { label: 'opt', sub: '⌥' },
    { label: '◄', sub: '' },
    { label: '▲/▼', sub: '' },
    { label: '►', sub: '' },
  ],
];

export function Keyboard({ enableSound = true, onKeyPress }: KeyboardProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [flyingKeys, setFlyingKeys] = useState<FlyingKey[]>([]);

  const spawnFlyingKey = (label: string, sub?: string, rowIdx?: number, colIdx?: number) => {
    // Map column & row position accurately across keyboard geometry
    const totalCols = 13;
    const colPos = colIdx !== undefined ? (colIdx / totalCols) * 82 + 9 : 20 + Math.random() * 60;
    const rowPos = rowIdx !== undefined ? (rowIdx / 6) * 62 + 8 : 20 + Math.random() * 45;

    let displayLabel = label;
    if (label.toLowerCase() === 'space') displayLabel = 'SPACE';
    else if (label.toLowerCase() === 'return') displayLabel = 'RETURN';
    else if (label.toLowerCase() === 'del') displayLabel = 'DELETE';
    else if (label.toLowerCase() === 'cmd') displayLabel = '⌘';

    const newKey: FlyingKey = {
      id: Date.now() + Math.random(),
      label: displayLabel,
      sub,
      leftPercent: Math.max(6, Math.min(94, colPos)),
      topPercent: Math.max(8, Math.min(82, rowPos)),
      driftX: (Math.random() - 0.5) * 70,
      rotation: (Math.random() - 0.5) * 32,
      targetY: -(300 + Math.random() * 140),
    };

    setFlyingKeys((prev) => [...prev.slice(-14), newKey]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyName = (e && typeof e.key === 'string' ? e.key : '').toLowerCase();
      let foundRow = 2;
      let foundCol = 5;
      let foundSub = '';
      let displayLabel = e.key;

      for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
        for (let c = 0; c < KEYBOARD_ROWS[r].length; c++) {
          const item = KEYBOARD_ROWS[r][c];
          if (
            item.label.toLowerCase() === keyName ||
            item.sub.toLowerCase() === keyName ||
            (keyName === ' ' && item.label === 'space') ||
            (keyName === 'enter' && item.label === 'return') ||
            (keyName === 'backspace' && item.label === 'del')
          ) {
            foundRow = r;
            foundCol = c;
            foundSub = item.sub;
            displayLabel = item.label;
            break;
          }
        }
      }

      setActiveKey(keyName);
      spawnFlyingKey(displayLabel, foundSub, foundRow, foundCol);
      setTimeout(() => setActiveKey(null), 150);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyClick = (keyId: string, label: string, sub?: string, rowIdx?: number, colIdx?: number) => {
    setActiveKey(keyId);
    if (enableSound) {
      if (label === 'space') {
        playKeyClickSound('space');
      } else if (label === 'return') {
        playKeyClickSound('enter');
      } else if (label === 'del') {
        playKeyClickSound('backspace');
      } else {
        playKeyClickSound('default');
      }
    }

    spawnFlyingKey(label, sub, rowIdx, colIdx);
    onKeyPress?.(label);
    setTimeout(() => setActiveKey(null), 150);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 rounded-[24px] bg-[#e2e8f0] border-2 border-slate-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-visible select-none">
      {/* Aluminum sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/60 via-transparent to-black/5 pointer-events-none rounded-[22px]" />

      {/* FLYING KEYS ANIMATION - TRANSITING TOWARDS TOP */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
        <AnimatePresence>
          {flyingKeys.map((k) => (
            <motion.div
              key={k.id}
              initial={{
                opacity: 1,
                y: 0,
                x: 0,
                scale: 0.8,
                rotate: 0,
              }}
              animate={{
                opacity: [1, 1, 0.85, 0],
                y: k.targetY,
                x: k.driftX,
                scale: [0.8, 1.35, 1.15, 0.75],
                rotate: k.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.25,
                ease: [0.16, 1, 0.3, 1],
              }}
              onAnimationComplete={() => {
                setFlyingKeys((prev) => prev.filter((item) => item.id !== k.id));
              }}
              className="pointer-events-none absolute flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#1c2234]/95 via-[#0e1322]/95 to-[#070a14]/98 border-2 border-white/70 text-white shadow-[0_20px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(56,189,248,0.6)] backdrop-blur-xl -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${k.leftPercent}%`,
                top: `${k.topPercent}%`,
                minWidth: k.label.length > 2 ? '68px' : '48px',
                height: '48px',
                padding: '0 12px',
                transformStyle: 'preserve-3d',
              }}
            >
              {k.sub && (
                <span className="text-[9px] text-cyan-300 font-bold leading-none mb-0.5">
                  {k.sub}
                </span>
              )}
              <span className="text-lg sm:text-xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]">
                {k.label.toUpperCase()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Keyboard Grid */}
      <div className="space-y-1 sm:space-y-1.5 relative z-10">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((item, iIdx) => {
              const keyId = `${item.label}-${rIdx}-${iIdx}`;
              const isSpace = item.label === 'space';
              const isWide = ['del', 'tab', 'caps', 'return', 'shift', 'ctrl', 'opt', 'cmd'].includes(item.label);
              const isActive = activeKey === item.label.toLowerCase() || activeKey === keyId;

              return (
                <motion.button
                  key={keyId}
                  whileTap={{ scale: 0.92, y: 1 }}
                  onClick={() => handleKeyClick(keyId, item.label, item.sub, rIdx, iIdx)}
                  className={`h-7 sm:h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-900 text-xs font-sans font-semibold flex flex-col items-center justify-center shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.8)_inset] border border-slate-300 transition-all cursor-pointer ${
                    isSpace ? 'w-52 sm:w-72' : isWide ? 'px-2 sm:px-3 flex-1' : 'w-8 sm:w-10'
                  } ${isActive ? 'bg-slate-200 shadow-inner translate-y-0.5' : ''}`}
                >
                  {item.sub ? (
                    <div className="flex flex-col items-center justify-center leading-none">
                      <span className="text-[8px] text-slate-500 font-medium leading-none">{item.sub}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-900 leading-tight">{item.label.toUpperCase()}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-900 tracking-tight leading-none">
                      {isSpace ? '' : item.label.toUpperCase()}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Trackpad */}
      <div className="mt-2.5 pt-2 border-t border-slate-300/80 flex justify-center">
        <div className="w-48 sm:w-64 h-7 sm:h-8 rounded-xl bg-white border border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.05)_inset] flex items-center justify-center">
          <span className="text-[9px] font-mono text-slate-400 tracking-widest font-bold">TRACKPAD</span>
        </div>
      </div>
    </div>
  );
}
