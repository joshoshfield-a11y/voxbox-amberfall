/**
 * VoxBox landscape-first: the rotate-device prompt.
 *
 * VoxBox: Amberfall is formatted to play in landscape on phones. On a
 * touch device held in portrait, this overlay asks the player to rotate
 * and clears itself the moment the device is landscape (resize /
 * orientationchange). It is NOT gated on aspect ratio alone: a desktop
 * window in a portrait-ish shape has no touch indicators, so it never
 * sees the prompt and desktop play is untouched.
 *
 * Orientation lock is progressive enhancement only: the "Lock
 * landscape" button attempts fullscreen + Screen Orientation API lock
 * behind that user gesture, and silently degrades (a hint line) when
 * the API is unavailable or refuses — boot never depends on it.
 * "Play in portrait anyway" dismisses the prompt until the next
 * orientation change; landscape play is the default, not a prison.
 */

export interface RotatePromptState {
  /** touch / coarse-pointer indicators present */
  touch: boolean;
  width: number;
  height: number;
  /** user dismissed the prompt for the current portrait stint */
  dismissed: boolean;
}

/** Pure visibility rule — unit-tested. */
export function shouldShowRotatePrompt(s: RotatePromptState): boolean {
  if (!s.touch) return false;
  if (s.width <= 0 || s.height <= 0) return false;
  // Portrait means strictly taller than wide; square is not portrait.
  if (s.height <= s.width) return false;
  return !s.dismissed;
}

/** True on real touch hardware / coarse pointers. Safe in node (false). */
export function isPhoneLike(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if ('ontouchstart' in window) return true;
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
    if (typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches) return true;
  } catch {
    return false;
  }
  return false;
}

export class RotatePrompt {
  private root: HTMLElement | null = null;
  private noteEl: HTMLElement | null = null;
  private dismissed = false;
  private disposed = false;
  private onResize: () => void;

  constructor(private container: HTMLElement) {
    if (typeof document === 'undefined') {
      this.onResize = () => undefined;
      return;
    }
    const doc = document;
    const style = doc.createElement('style');
    style.textContent = [
      '#xandria-rotate-prompt{position:absolute;inset:0;z-index:9800;display:none;flex-direction:column;',
      'align-items:center;justify-content:center;gap:14px;background:rgba(6,8,14,.88);',
      'color:#e8ecf4;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px;}',
      '#xandria-rotate-prompt .rp-icon{font-size:44px;}',
      '#xandria-rotate-prompt .rp-title{font-size:20px;font-weight:800;letter-spacing:.08em;color:#ffd23f;}',
      '#xandria-rotate-prompt .rp-sub{font-size:14px;opacity:.85;max-width:320px;line-height:1.5;}',
      '#xandria-rotate-prompt .rp-note{font-size:12px;opacity:.7;min-height:16px;}',
      '#xandria-rotate-prompt button{pointer-events:auto;cursor:pointer;font-size:14px;font-weight:700;',
      'letter-spacing:.06em;padding:12px 24px;border-radius:10px;border:1px solid rgba(140,180,220,.4);',
      'background:linear-gradient(180deg,#2b3f57,#1a2536);color:#e8ecf1;}',
      '#xandria-rotate-prompt button.rp-quiet{background:transparent;color:#9aa4b8;}',
    ].join('');
    doc.head.appendChild(style);

    const root = doc.createElement('div');
    root.id = 'xandria-rotate-prompt';
    root.setAttribute('role', 'alert');
    const icon = doc.createElement('div');
    icon.className = 'rp-icon';
    icon.textContent = '↻';
    const title = doc.createElement('div');
    title.className = 'rp-title';
    title.textContent = 'ROTATE YOUR DEVICE';
    const sub = doc.createElement('div');
    sub.className = 'rp-sub';
    sub.textContent = 'VoxBox: Amberfall plays in landscape. Rotate your phone and the game appears.';
    const lock = doc.createElement('button');
    lock.textContent = 'LOCK LANDSCAPE';
    lock.setAttribute('aria-label', 'Lock landscape orientation');
    lock.addEventListener('click', () => void this.tryLock());
    const anyway = doc.createElement('button');
    anyway.className = 'rp-quiet';
    anyway.textContent = 'PLAY IN PORTRAIT ANYWAY';
    anyway.addEventListener('click', () => {
      this.dismissed = true;
      this.update();
    });
    const note = doc.createElement('div');
    note.className = 'rp-note';
    root.append(icon, title, sub, lock, anyway, note);
    container.appendChild(root);
    this.root = root;
    this.noteEl = note;

    this.onResize = () => this.update();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.update();
  }

  /** Re-evaluate visibility. Landscape clears a portrait dismissal. */
  update(): void {
    if (!this.root || this.disposed) return;
    let w = 0;
    let h = 0;
    try {
      w = window.innerWidth;
      h = window.innerHeight;
    } catch {
      w = 0;
      h = 0;
    }
    const landscape = h <= w;
    if (landscape) this.dismissed = false;
    const show = shouldShowRotatePrompt({ touch: isPhoneLike(), width: w, height: h, dismissed: this.dismissed });
    this.root.style.display = show ? 'flex' : 'none';
  }

  get visible(): boolean {
    return !!this.root && this.root.style.display !== 'none';
  }

  /** Best-effort orientation lock, behind the user's tap. Never throws. */
  private async tryLock(): Promise<void> {
    try {
      const docEl = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
      };
      if (docEl.requestFullscreen && document.fullscreenElement !== docEl) {
        await docEl.requestFullscreen().catch(() => undefined);
      }
      const orient = screen.orientation as unknown as {
        lock?: (o: string) => Promise<void>;
      } | undefined;
      if (orient?.lock) {
        await orient.lock('landscape');
        if (this.noteEl) this.noteEl.textContent = 'Landscape locked.';
        return;
      }
      if (this.noteEl) this.noteEl.textContent = 'This device can\u2019t lock orientation — just rotate it.';
    } catch {
      if (this.noteEl) this.noteEl.textContent = 'This device can\u2019t lock orientation — just rotate it.';
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.root?.remove();
    this.root = null;
  }
}
