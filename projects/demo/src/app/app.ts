import { Component, computed, input, signal, type OnInit } from '@angular/core';
import {
  createCallable,
  createMutationFlow,
  injectCall,
  type Callable,
  type MutationFn,
  NgxCallHost,
} from 'ngx-call';

type DemoRoot = { user: string };
type ExampleCategory =
  | 'Dialog'
  | 'Picker'
  | 'Notification'
  | 'Menu'
  | 'Drawer'
  | 'Overlay'
  | 'Flow';
type ExampleFilter = ExampleCategory | 'All';
type ToastTone = 'info' | 'success' | 'warning' | 'error';
type PickerItem = { id: string; name: string; detail: string };
type SettingsValue = {
  email: boolean;
  density: 'Compact' | 'Comfortable';
  theme: 'System' | 'Light' | 'Dark';
};
type WizardResult = { email: string; plan: string };
type PermissionResponse = { action: 'allow' } | { action: 'deny' };

type ExampleId =
  | 'confirm-dialog'
  | 'alert-dialog'
  | 'prompt-input'
  | 'nested-dialog'
  | 'save-form'
  | 'root-context'
  | 'optional-mutation'
  | 'progress-toast'
  | 'error-banner'
  | 'live-status'
  | 'broadcast-update'
  | 'item-picker'
  | 'color-picker'
  | 'context-menu'
  | 'command-palette'
  | 'bottom-sheet'
  | 'side-drawer'
  | 'image-lightbox'
  | 'wizard'
  | 'permission-prompt'
  | 'caller-resolve';

type ExampleCard = {
  id: ExampleId;
  category: ExampleCategory;
  title: string;
  description: string;
  behaviors: readonly string[];
  action: string;
};

const exampleFilters: readonly ExampleFilter[] = [
  'All',
  'Dialog',
  'Picker',
  'Notification',
  'Menu',
  'Drawer',
  'Overlay',
  'Flow',
];

const examples: readonly ExampleCard[] = [
  {
    id: 'confirm-dialog',
    category: 'Dialog',
    title: 'Confirm dialog',
    description: 'Ask the user to confirm an action before it runs. Returns a boolean.',
    behaviors: [],
    action: 'Open confirm',
  },
  {
    id: 'alert-dialog',
    category: 'Dialog',
    title: 'Alert dialog',
    description: 'A one-button notice. The caller awaits acknowledgement and receives void.',
    behaviors: [],
    action: 'Show alert',
  },
  {
    id: 'prompt-input',
    category: 'Dialog',
    title: 'Prompt for input',
    description: 'A custom prompt that resolves with entered text or null on cancel.',
    behaviors: [],
    action: 'Open prompt',
  },
  {
    id: 'nested-dialog',
    category: 'Dialog',
    title: 'Nested dialog',
    description:
      'A callable opens another instance of itself while each promise resolves separately.',
    behaviors: ['Nested'],
    action: 'Open nested',
  },
  {
    id: 'save-form',
    category: 'Dialog',
    title: 'Save form with mutation flow',
    description: 'Async submit tracks pending state and keeps the dialog open on failure.',
    behaviors: ['Mutation flow'],
    action: 'Run mutation',
  },
  {
    id: 'root-context',
    category: 'Dialog',
    title: 'Account-aware dialog',
    description: 'Root props carry signed-in user data without passing it through each call.',
    behaviors: ['Root props'],
    action: 'Use root prop',
  },
  {
    id: 'optional-mutation',
    category: 'Dialog',
    title: 'Confirm with optional async',
    description: 'The same callable closes instantly without a handler or waits for async work.',
    behaviors: ['Mutation flow'],
    action: 'Instant confirm',
  },
  {
    id: 'progress-toast',
    category: 'Notification',
    title: 'Progress toast',
    description: 'A singleton toast updates itself as work progresses through upsert().',
    behaviors: ['Upsert'],
    action: 'Start progress',
  },
  {
    id: 'error-banner',
    category: 'Notification',
    title: 'Auto-dismissing error',
    description: 'Transient banners close themselves while multiple calls stack.',
    behaviors: ['Stacking'],
    action: 'Trigger error',
  },
  {
    id: 'live-status',
    category: 'Notification',
    title: 'Live status update',
    description: 'The caller keeps the promise and pushes new props into that open call.',
    behaviors: ['Update'],
    action: 'Track status',
  },
  {
    id: 'broadcast-update',
    category: 'Notification',
    title: 'Broadcast to every call',
    description: 'One update without a promise merges into every open notification.',
    behaviors: ['Update', 'Stacking'],
    action: 'Broadcast',
  },
  {
    id: 'item-picker',
    category: 'Picker',
    title: 'Item picker',
    description: 'Pick from a list and resolve with the selected object, or null on cancel.',
    behaviors: [],
    action: 'Pick item',
  },
  {
    id: 'color-picker',
    category: 'Picker',
    title: 'Color picker',
    description: 'Forward the current value as a prop and resolve with the chosen hex.',
    behaviors: [],
    action: 'Pick color',
  },
  {
    id: 'context-menu',
    category: 'Menu',
    title: 'Context menu',
    description: 'Open a positioned menu by forwarding cursor coordinates from the caller.',
    behaviors: [],
    action: 'Open menu',
  },
  {
    id: 'command-palette',
    category: 'Menu',
    title: 'Command palette (Cmd K)',
    description: 'Searchable actions with Enter, Escape, and arrow-key navigation.',
    behaviors: [],
    action: 'Open palette',
  },
  {
    id: 'bottom-sheet',
    category: 'Drawer',
    title: 'Bottom sheet',
    description: 'A mobile-style sheet slides from the bottom and resolves with an action.',
    behaviors: ['Exit animation'],
    action: 'Open sheet',
  },
  {
    id: 'side-drawer',
    category: 'Drawer',
    title: 'Settings drawer',
    description: 'Initial settings arrive as props; local form state resolves on save.',
    behaviors: ['Exit animation'],
    action: 'Open drawer',
  },
  {
    id: 'image-lightbox',
    category: 'Overlay',
    title: 'Image lightbox',
    description: 'Open a full image overlay and close it from the backdrop or button.',
    behaviors: [],
    action: 'View image',
  },
  {
    id: 'wizard',
    category: 'Flow',
    title: 'Multi-step wizard',
    description: 'The callable owns step state and returns one structured response.',
    behaviors: [],
    action: 'Start wizard',
  },
  {
    id: 'permission-prompt',
    category: 'Flow',
    title: 'Permission consent',
    description: 'Resolve with a tagged allow or deny response instead of a boolean.',
    behaviors: [],
    action: 'Ask consent',
  },
  {
    id: 'caller-resolve',
    category: 'Flow',
    title: 'Resolve from the caller',
    description: 'The promise identifies the open call so the caller can settle it externally.',
    behaviors: ['End from caller'],
    action: 'Auto resolve',
  },
];

type ConfirmProps = { message: string };

@Component({
  selector: 'demo-confirm-dialog',
  standalone: true,
  template: `
    <section class="dialog" [class.leaving]="call.ended()" role="dialog">
      <p class="dialog-kicker">Signed in as {{ call.root().user }}</p>
      <h2>Confirm action</h2>
      <p>{{ message() }}</p>
      <div class="dialog-actions">
        <button type="button" class="secondary" (click)="call.end(false)">Cancel</button>
        <button type="button" (click)="call.end(true)">Continue</button>
      </div>
    </section>
  `,
  styles: `
    .dialog {
      position: fixed;
      z-index: 50;
      inset: auto 24px 24px auto;
      width: min(380px, calc(100vw - 48px));
      padding: 20px;
      border: 1px solid #d9e0ea;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgb(17 24 39 / 18%);
      color: #111827;
      transition:
        opacity 180ms ease,
        transform 180ms ease;
    }

    .dialog.leaving {
      opacity: 0;
      transform: translateY(12px);
    }

    .dialog-kicker {
      margin: 0 0 8px;
      color: #05865c;
      font-size: 0.82rem;
      font-weight: 760;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 1.1rem;
    }

    p {
      margin: 0 0 18px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    button {
      min-height: 36px;
      padding: 0 14px;
      border: 1px solid #05865c;
      border-radius: 6px;
      background: #05865c;
      color: white;
      font: inherit;
      font-weight: 720;
      cursor: pointer;
    }

    button.secondary {
      background: white;
      color: #111827;
      border-color: #d9e0ea;
    }
  `,
})
class ConfirmDialog {
  readonly message = input.required<string>();
  readonly call = injectCall<boolean, DemoRoot>();
}

type AlertProps = { title: string; message: string; action: string };

@Component({
  selector: 'demo-alert-dialog',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="alertdialog">
      <p class="example-kicker">Alert dialog</p>
      <h2>{{ title() }}</h2>
      <p>{{ message() }}</p>
      <div class="example-actions">
        <button type="button" class="example-primary" (click)="call.end(undefined)">
          {{ action() }}
        </button>
      </div>
    </section>
  `,
})
class AlertDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly action = input.required<string>();
  readonly call = injectCall<void, DemoRoot>();
}

type PromptProps = { label: string; initialValue: string };

@Component({
  selector: 'demo-prompt-dialog',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">Prompt</p>
      <h2>{{ label() }}</h2>
      <label class="example-field">
        <span>Value</span>
        <input [value]="value()" (input)="updateValue($event)" />
      </label>
      <div class="example-actions">
        <button type="button" class="example-secondary" (click)="call.end(null)">Cancel</button>
        <button type="button" class="example-primary" (click)="call.end(value())">Save</button>
      </div>
    </section>
  `,
})
class PromptDialog implements OnInit {
  readonly label = input.required<string>();
  readonly initialValue = input.required<string>();
  readonly value = signal('');
  readonly call = injectCall<string | null, DemoRoot>();

  ngOnInit(): void {
    this.value.set(this.initialValue());
  }

  updateValue(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}

type NestedProps = { depth: number };
let Nested!: Callable<NestedProps, number, DemoRoot>;

@Component({
  selector: 'demo-nested-dialog',
  standalone: true,
  template: `
    <section class="example-call example-dialog nested-dialog" role="dialog">
      <p class="example-kicker">Stack item {{ call.index() + 1 }} of {{ call.stackSize() }}</p>
      <h2>Nested level {{ depth() }}</h2>
      <p>Open another instance from this callable. Each instance owns its own promise.</p>
      <div class="example-actions">
        <button type="button" class="example-secondary" (click)="call.end(depth())">Close</button>
        <button type="button" class="example-primary" (click)="openChild()">Open child</button>
      </div>
    </section>
  `,
})
class NestedDialog {
  readonly depth = input.required<number>();
  readonly call = injectCall<number, DemoRoot>();

  async openChild(): Promise<void> {
    const depth = await Nested.call({ depth: this.depth() + 1 });
    this.call.end(depth);
  }
}

type ToastProps = { message: string; detail: string; tone: ToastTone };

@Component({
  selector: 'demo-toast',
  standalone: true,
  template: `
    <aside
      class="toast"
      [class.error]="tone() === 'error'"
      [class.warning]="tone() === 'warning'"
      [class.leaving]="call.ended()"
      role="status"
      [style.bottom.px]="24 + call.index() * 88"
    >
      <strong>{{ call.stackSize() > 1 ? 'Stacked call' : 'Notification' }}</strong>
      <span>{{ message() }}</span>
      <small>{{ detail() }}</small>
      <button type="button" aria-label="Dismiss" (click)="call.end(true)">Dismiss</button>
    </aside>
  `,
  styles: `
    .toast {
      position: fixed;
      z-index: 50;
      right: 24px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      width: min(380px, calc(100vw - 48px));
      padding: 14px 16px;
      border: 1px solid #b9e7d7;
      border-radius: 8px;
      background: #f0fdf4;
      color: #111827;
      box-shadow: 0 18px 54px rgb(5 134 92 / 16%);
      transition:
        opacity 180ms ease,
        transform 180ms ease;
    }

    .toast.error {
      border-color: #fecaca;
      background: #fff1f2;
      box-shadow: 0 18px 54px rgb(190 18 60 / 14%);
    }

    .toast.warning {
      border-color: #fed7aa;
      background: #fffbeb;
      box-shadow: 0 18px 54px rgb(217 119 6 / 14%);
    }

    .toast.leaving {
      opacity: 0;
      transform: translateX(16px);
    }

    strong,
    span,
    small {
      grid-column: 1;
    }

    small {
      color: #5c6675;
      line-height: 1.45;
    }

    button {
      grid-column: 2;
      grid-row: 1 / span 3;
      align-self: center;
      min-height: 32px;
      padding: 0 10px;
      border: 1px solid #05865c;
      border-radius: 6px;
      background: white;
      color: #05865c;
      font: inherit;
      font-weight: 720;
      cursor: pointer;
    }
  `,
})
class ToastMessage {
  readonly message = input.required<string>();
  readonly detail = input.required<string>();
  readonly tone = input.required<ToastTone>();
  readonly call = injectCall<boolean, DemoRoot>();
}

type AutoErrorProps = { message: string };

@Component({
  selector: 'demo-auto-error',
  standalone: true,
  template: `
    <aside
      class="example-banner"
      [class.leaving]="call.ended()"
      role="status"
      [style.top.px]="92 + call.index() * 74"
    >
      <strong>Upload failed</strong>
      <span>{{ message() }}</span>
    </aside>
  `,
})
class AutoErrorBanner {
  readonly message = input.required<string>();
  readonly call = injectCall<boolean, DemoRoot>();

  constructor() {
    globalThis.setTimeout(() => this.call.end(true), 2600);
  }
}

type MutationConfirmProps = {
  label: string;
  mutationFn: MutationFn<boolean>;
};

@Component({
  selector: 'demo-mutation-confirm',
  standalone: true,
  template: `
    <section class="dialog" role="dialog">
      <p class="dialog-kicker">{{ call.root().user }}</p>
      <h2>{{ label() }}</h2>
      <p>The async operation controls when this call closes.</p>
      <div class="dialog-actions">
        <button
          type="button"
          class="secondary"
          [disabled]="submit.pending()"
          (click)="call.end(false)"
        >
          Cancel
        </button>
        <button type="button" [disabled]="submit.pending()" (click)="submit.run()">
          {{ submit.pending() ? 'Working...' : 'Run mutation' }}
        </button>
      </div>
    </section>
  `,
  styles: `
    .dialog {
      position: fixed;
      z-index: 50;
      inset: auto auto 24px 24px;
      width: min(380px, calc(100vw - 48px));
      padding: 20px;
      border: 1px solid #d9e0ea;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgb(17 24 39 / 18%);
      color: #111827;
    }

    .dialog-kicker {
      margin: 0 0 8px;
      color: #6f49c7;
      font-size: 0.82rem;
      font-weight: 760;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 1.1rem;
    }

    p {
      margin: 0 0 18px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    button {
      min-height: 36px;
      padding: 0 14px;
      border: 1px solid #6f49c7;
      border-radius: 6px;
      background: #6f49c7;
      color: white;
      font: inherit;
      font-weight: 720;
      cursor: pointer;
    }

    button.secondary {
      background: white;
      color: #111827;
      border-color: #d9e0ea;
    }

    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  `,
})
class MutationConfirmDialog {
  readonly label = input.required<string>();
  readonly mutationFn = input.required<MutationFn<boolean>>();
  readonly call = injectCall<boolean, DemoRoot>();
  readonly submit = createMutationFlow<boolean>({
    call: this.call,
    mutationFn: (call) => this.mutationFn()(call, undefined),
  });
}

type OptionalConfirmProps = { label: string; mutationFn?: MutationFn<boolean> };

@Component({
  selector: 'demo-optional-confirm',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">Optional async</p>
      <h2>{{ label() }}</h2>
      <p>Without a mutation handler this closes through submit().orEnd(true).</p>
      <div class="example-actions">
        <button type="button" class="example-secondary" (click)="call.end(false)">Cancel</button>
        <button type="button" class="example-primary" [disabled]="pending()" (click)="submit()">
          {{ pending() ? 'Working...' : 'Continue' }}
        </button>
      </div>
    </section>
  `,
})
class OptionalConfirmDialog {
  readonly label = input.required<string>();
  readonly mutationFn = input<MutationFn<boolean> | undefined>(undefined);
  readonly pending = signal(false);
  readonly call = injectCall<boolean, DemoRoot>();
  readonly fallbackSubmit = createMutationFlow<boolean>({ call: this.call });

  submit(): void {
    const mutationFn = this.mutationFn();

    if (!mutationFn) {
      this.fallbackSubmit.run().orEnd(true);
      return;
    }

    this.pending.set(true);
    void mutationFn(this.call, undefined).finally(() => this.pending.set(false));
  }
}

type AccountDialogProps = { subject: string };

@Component({
  selector: 'demo-account-dialog',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">Root props</p>
      <h2>Hello, {{ call.root().user }}</h2>
      <p>{{ subject() }} was passed by the caller. The user came from the host root.</p>
      <div class="example-actions">
        <button type="button" class="example-primary" (click)="call.end(true)">Got it</button>
      </div>
    </section>
  `,
})
class AccountDialog {
  readonly subject = input.required<string>();
  readonly call = injectCall<boolean, DemoRoot>();
}

type ItemPickerProps = { items: readonly PickerItem[] };

@Component({
  selector: 'demo-item-picker',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">Picker</p>
      <h2>Choose an item</h2>
      <div class="choice-list">
        @for (item of items(); track item.id) {
          <button type="button" class="choice-row" (click)="call.end(item)">
            <strong>{{ item.name }}</strong>
            <span>{{ item.detail }}</span>
          </button>
        }
      </div>
      <div class="example-actions">
        <button type="button" class="example-secondary" (click)="call.end(null)">Cancel</button>
      </div>
    </section>
  `,
})
class ItemPickerDialog {
  readonly items = input.required<readonly PickerItem[]>();
  readonly call = injectCall<PickerItem | null, DemoRoot>();
}

type ColorPickerProps = { current: string; colors: readonly string[] };

@Component({
  selector: 'demo-color-picker',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">Picker</p>
      <h2>Choose a color</h2>
      <div class="swatch-grid">
        @for (color of colors(); track color) {
          <button
            type="button"
            class="swatch"
            [class.selected]="color === current()"
            [style.background]="color"
            [attr.aria-label]="'Choose ' + color"
            (click)="call.end(color)"
          ></button>
        }
      </div>
      <div class="example-actions">
        <button type="button" class="example-secondary" (click)="call.end(null)">Cancel</button>
      </div>
    </section>
  `,
})
class ColorPickerDialog {
  readonly current = input.required<string>();
  readonly colors = input.required<readonly string[]>();
  readonly call = injectCall<string | null, DemoRoot>();
}

type ContextMenuProps = { x: number; y: number };

@Component({
  selector: 'demo-context-menu',
  standalone: true,
  template: `
    <div class="menu-backdrop" (click)="call.end(null)">
      <div
        class="context-menu"
        role="menu"
        [style.left.px]="x()"
        [style.top.px]="y()"
        (click)="$event.stopPropagation()"
      >
        <button type="button" role="menuitem" (click)="call.end('Open')">Open</button>
        <button type="button" role="menuitem" (click)="call.end('Duplicate')">Duplicate</button>
        <button type="button" role="menuitem" (click)="call.end('Archive')">Archive</button>
      </div>
    </div>
  `,
})
class ContextMenuDialog {
  readonly x = input.required<number>();
  readonly y = input.required<number>();
  readonly call = injectCall<string | null, DemoRoot>();
}

type CommandAction = { id: string; label: string; hint: string };

@Component({
  selector: 'demo-command-palette',
  standalone: true,
  template: `
    <section class="example-call command-palette" role="dialog">
      <input
        aria-label="Search commands"
        placeholder="Search commands"
        [value]="query()"
        (input)="updateQuery($event)"
        (keydown)="handleKeydown($event)"
      />
      <div class="choice-list">
        @for (action of filteredActions(); track action.id; let index = $index) {
          <button
            type="button"
            class="choice-row"
            [class.active]="index === selectedIndex()"
            (click)="call.end(action.label)"
          >
            <strong>{{ action.label }}</strong>
            <span>{{ action.hint }}</span>
          </button>
        }
      </div>
    </section>
  `,
})
class CommandPaletteDialog {
  readonly call = injectCall<string | null, DemoRoot>();
  readonly query = signal('');
  readonly selectedIndex = signal(0);
  readonly actions: readonly CommandAction[] = [
    { id: 'new', label: 'Create project', hint: 'Start a blank workspace' },
    { id: 'invite', label: 'Invite teammate', hint: 'Send an email invite' },
    { id: 'export', label: 'Export report', hint: 'Download the current view' },
  ];
  readonly filteredActions = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.actions;
    return this.actions.filter((action) => action.label.toLowerCase().includes(query));
  });

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.selectedIndex.set(0);
  }

  handleKeydown(event: KeyboardEvent): void {
    const actions = this.filteredActions();

    if (event.key === 'Escape') {
      event.preventDefault();
      this.call.end(null);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.call.end(actions[this.selectedIndex()]?.label ?? null);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.set(Math.min(this.selectedIndex() + 1, Math.max(actions.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.set(Math.max(this.selectedIndex() - 1, 0));
    }
  }
}

type BottomSheetProps = { title: string; options: readonly string[] };

@Component({
  selector: 'demo-bottom-sheet',
  standalone: true,
  template: `
    <div class="sheet-backdrop" [class.leaving]="call.ended()" (click)="call.end(null)">
      <section class="bottom-sheet" role="dialog" (click)="$event.stopPropagation()">
        <h2>{{ title() }}</h2>
        <div class="choice-list">
          @for (option of options(); track option) {
            <button type="button" class="choice-row" (click)="call.end(option)">
              <strong>{{ option }}</strong>
              <span>Resolve the sheet with this choice</span>
            </button>
          }
        </div>
      </section>
    </div>
  `,
})
class BottomSheetDialog {
  readonly title = input.required<string>();
  readonly options = input.required<readonly string[]>();
  readonly call = injectCall<string | null, DemoRoot>();
}

type SettingsDrawerProps = { settings: SettingsValue };

@Component({
  selector: 'demo-settings-drawer',
  standalone: true,
  template: `
    <div class="drawer-backdrop" [class.leaving]="call.ended()" (click)="call.end(null)">
      <section class="settings-drawer" role="dialog" (click)="$event.stopPropagation()">
        <p class="example-kicker">Drawer</p>
        <h2>Settings</h2>
        <label class="check-row">
          <input type="checkbox" [checked]="email()" (change)="toggleEmail($event)" />
          <span>Email notifications</span>
        </label>
        <label class="example-field">
          <span>Density</span>
          <select [value]="density()" (change)="updateDensity($event)">
            <option>Compact</option>
            <option>Comfortable</option>
          </select>
        </label>
        <label class="example-field">
          <span>Theme</span>
          <select [value]="theme()" (change)="updateTheme($event)">
            <option>System</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </label>
        <div class="example-actions">
          <button type="button" class="example-secondary" (click)="call.end(null)">Cancel</button>
          <button type="button" class="example-primary" (click)="save()">Save</button>
        </div>
      </section>
    </div>
  `,
})
class SettingsDrawerDialog implements OnInit {
  readonly settings = input.required<SettingsValue>();
  readonly email = signal(true);
  readonly density = signal<SettingsValue['density']>('Comfortable');
  readonly theme = signal<SettingsValue['theme']>('System');
  readonly call = injectCall<SettingsValue | null, DemoRoot>();

  ngOnInit(): void {
    const settings = this.settings();
    this.email.set(settings.email);
    this.density.set(settings.density);
    this.theme.set(settings.theme);
  }

  toggleEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).checked);
  }

  updateDensity(event: Event): void {
    this.density.set((event.target as HTMLSelectElement).value as SettingsValue['density']);
  }

  updateTheme(event: Event): void {
    this.theme.set((event.target as HTMLSelectElement).value as SettingsValue['theme']);
  }

  save(): void {
    this.call.end({
      email: this.email(),
      density: this.density(),
      theme: this.theme(),
    });
  }
}

type LightboxProps = { title: string; imageUrl: string };

@Component({
  selector: 'demo-lightbox',
  standalone: true,
  template: `
    <div class="lightbox" role="dialog" (click)="call.end(undefined)">
      <figure (click)="$event.stopPropagation()">
        <img [src]="imageUrl()" [alt]="title()" />
        <figcaption>
          <span>{{ title() }}</span>
          <button type="button" (click)="call.end(undefined)">Close</button>
        </figcaption>
      </figure>
    </div>
  `,
})
class LightboxDialog {
  readonly title = input.required<string>();
  readonly imageUrl = input.required<string>();
  readonly call = injectCall<void, DemoRoot>();
}

@Component({
  selector: 'demo-wizard',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">Step {{ step() + 1 }} of 3</p>
      @if (step() === 0) {
        <h2>Create account</h2>
        <label class="example-field">
          <span>Email</span>
          <input [value]="email()" (input)="updateEmail($event)" />
        </label>
      } @else if (step() === 1) {
        <h2>Choose plan</h2>
        <div class="choice-list">
          @for (option of plans; track option) {
            <button
              type="button"
              class="choice-row"
              [class.active]="plan() === option"
              (click)="plan.set(option)"
            >
              <strong>{{ option }}</strong>
              <span>Stored inside the callable until finish</span>
            </button>
          }
        </div>
      } @else {
        <h2>Review</h2>
        <p>{{ email() }} will start on the {{ plan() }} plan.</p>
      }
      <div class="example-actions">
        <button type="button" class="example-secondary" (click)="backOrCancel()">
          {{ step() === 0 ? 'Cancel' : 'Back' }}
        </button>
        <button type="button" class="example-primary" (click)="nextOrFinish()">
          {{ step() === 2 ? 'Finish' : 'Next' }}
        </button>
      </div>
    </section>
  `,
})
class WizardDialog {
  readonly call = injectCall<WizardResult | null, DemoRoot>();
  readonly step = signal(0);
  readonly email = signal('ada@example.com');
  readonly plan = signal('Team');
  readonly plans = ['Starter', 'Team', 'Enterprise'] as const;

  updateEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  backOrCancel(): void {
    if (this.step() === 0) {
      this.call.end(null);
      return;
    }

    this.step.update((step) => step - 1);
  }

  nextOrFinish(): void {
    if (this.step() === 2) {
      this.call.end({ email: this.email(), plan: this.plan() });
      return;
    }

    this.step.update((step) => step + 1);
  }
}

type PermissionProps = { appName: string; scope: string };

@Component({
  selector: 'demo-permission',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">Permission</p>
      <h2>Allow {{ appName() }}?</h2>
      <p>This grants access to {{ scope() }}.</p>
      <div class="example-actions">
        <button type="button" class="example-secondary" (click)="call.end({ action: 'deny' })">
          Deny
        </button>
        <button type="button" class="example-primary" (click)="call.end({ action: 'allow' })">
          Allow
        </button>
      </div>
    </section>
  `,
})
class PermissionDialog {
  readonly appName = input.required<string>();
  readonly scope = input.required<string>();
  readonly call = injectCall<PermissionResponse, DemoRoot>();
}

type ApprovalProps = { message: string };

@Component({
  selector: 'demo-approval',
  standalone: true,
  template: `
    <section class="example-call example-dialog" role="dialog">
      <p class="example-kicker">End from caller</p>
      <h2>Waiting for caller</h2>
      <p>{{ message() }}</p>
      <div class="pending-strip">The caller will resolve this in 1.4 seconds.</div>
    </section>
  `,
})
class ApprovalDialog {
  readonly message = input.required<string>();
  readonly call = injectCall<boolean, DemoRoot>();
}

const Confirm = createCallable<ConfirmProps, boolean, DemoRoot>(ConfirmDialog, {
  inputs: ['message'],
  unmountingDelay: 180,
});

const Alert = createCallable<AlertProps, void, DemoRoot>(AlertDialog, {
  inputs: ['title', 'message', 'action'],
  unmountingDelay: 180,
});

const Prompt = createCallable<PromptProps, string | null, DemoRoot>(PromptDialog, {
  inputs: ['label', 'initialValue'],
  unmountingDelay: 180,
});

Nested = createCallable<NestedProps, number, DemoRoot>(NestedDialog, {
  inputs: ['depth'],
  unmountingDelay: 180,
});

const Toast = createCallable<ToastProps, boolean, DemoRoot>(ToastMessage, {
  inputs: ['message', 'detail', 'tone'],
  unmountingDelay: 180,
});

const AutoError = createCallable<AutoErrorProps, boolean, DemoRoot>(AutoErrorBanner, {
  inputs: ['message'],
  unmountingDelay: 180,
});

const MutationConfirm = createCallable<MutationConfirmProps, boolean, DemoRoot>(
  MutationConfirmDialog,
  {
    inputs: ['label', 'mutationFn'],
  },
);

const OptionalConfirm = createCallable<OptionalConfirmProps, boolean, DemoRoot>(
  OptionalConfirmDialog,
  {
    inputs: ['label', 'mutationFn'],
  },
);

const AccountDialogCall = createCallable<AccountDialogProps, boolean, DemoRoot>(AccountDialog, {
  inputs: ['subject'],
  unmountingDelay: 180,
});

const ItemPicker = createCallable<ItemPickerProps, PickerItem | null, DemoRoot>(ItemPickerDialog, {
  inputs: ['items'],
  unmountingDelay: 180,
});

const ColorPicker = createCallable<ColorPickerProps, string | null, DemoRoot>(ColorPickerDialog, {
  inputs: ['current', 'colors'],
  unmountingDelay: 180,
});

const ContextMenu = createCallable<ContextMenuProps, string | null, DemoRoot>(ContextMenuDialog, {
  inputs: ['x', 'y'],
  unmountingDelay: 120,
});

const CommandPalette = createCallable<string | null, DemoRoot>(CommandPaletteDialog, {
  unmountingDelay: 120,
});

const BottomSheet = createCallable<BottomSheetProps, string | null, DemoRoot>(BottomSheetDialog, {
  inputs: ['title', 'options'],
  unmountingDelay: 220,
});

const SettingsDrawer = createCallable<SettingsDrawerProps, SettingsValue | null, DemoRoot>(
  SettingsDrawerDialog,
  {
    inputs: ['settings'],
    unmountingDelay: 220,
  },
);

const Lightbox = createCallable<LightboxProps, void, DemoRoot>(LightboxDialog, {
  inputs: ['title', 'imageUrl'],
  unmountingDelay: 120,
});

const Wizard = createCallable<WizardResult | null, DemoRoot>(WizardDialog, {
  unmountingDelay: 180,
});

const Permission = createCallable<PermissionProps, PermissionResponse, DemoRoot>(PermissionDialog, {
  inputs: ['appName', 'scope'],
  unmountingDelay: 180,
});

const Approval = createCallable<ApprovalProps, boolean, DemoRoot>(ApprovalDialog, {
  inputs: ['message'],
  unmountingDelay: 180,
});

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgxCallHost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly Confirm = Confirm;
  readonly Alert = Alert;
  readonly Prompt = Prompt;
  readonly Nested = Nested;
  readonly Toast = Toast;
  readonly AutoError = AutoError;
  readonly MutationConfirm = MutationConfirm;
  readonly OptionalConfirm = OptionalConfirm;
  readonly AccountDialogCall = AccountDialogCall;
  readonly ItemPicker = ItemPicker;
  readonly ColorPicker = ColorPicker;
  readonly ContextMenu = ContextMenu;
  readonly CommandPalette = CommandPalette;
  readonly BottomSheet = BottomSheet;
  readonly SettingsDrawer = SettingsDrawer;
  readonly Lightbox = Lightbox;
  readonly Wizard = Wizard;
  readonly Permission = Permission;
  readonly Approval = Approval;

  readonly root = signal<DemoRoot>({ user: 'demo-user' });
  readonly lastResult = signal('No calls yet');
  readonly filters = exampleFilters;
  readonly selectedFilter = signal<ExampleFilter>('All');
  readonly examples = examples;
  readonly visibleExamples = computed(() => {
    const selectedFilter = this.selectedFilter();
    if (selectedFilter === 'All') return this.examples;
    return this.examples.filter((example) => example.category === selectedFilter);
  });
  readonly selectedColor = signal('#05865c');
  readonly pickerItems: readonly PickerItem[] = [
    { id: 'roadmap', name: 'Roadmap', detail: 'Planning board' },
    { id: 'release', name: 'Release notes', detail: 'Documentation draft' },
    { id: 'metrics', name: 'Metrics', detail: 'Weekly dashboard' },
  ];
  readonly lightboxImage =
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80';

  async askForConfirmation(): Promise<void> {
    const accepted = await Confirm.call({ message: 'Continue the demo flow?' });
    this.lastResult.set(`Confirm resolved with ${accepted}`);
  }

  async runExample(id: ExampleId, event?: MouseEvent): Promise<void> {
    switch (id) {
      case 'confirm-dialog':
        await this.askForConfirmation();
        return;
      case 'alert-dialog':
        await this.showAlert();
        return;
      case 'prompt-input':
        await this.askForPrompt();
        return;
      case 'nested-dialog':
        await this.openNestedDialog();
        return;
      case 'save-form':
        await this.runMutationFlow();
        return;
      case 'root-context':
        await this.openAccountDialog();
        return;
      case 'optional-mutation':
        await this.runOptionalAsyncConfirm();
        return;
      case 'progress-toast':
        this.showProgressToast();
        return;
      case 'error-banner':
        this.showAutoError();
        return;
      case 'live-status':
        this.showLiveStatus();
        return;
      case 'broadcast-update':
        this.showUploadBroadcast();
        return;
      case 'item-picker':
        await this.pickItem();
        return;
      case 'color-picker':
        await this.pickColor();
        return;
      case 'context-menu':
        await this.openContextMenu(event);
        return;
      case 'command-palette':
        await this.openCommandPalette();
        return;
      case 'bottom-sheet':
        await this.openBottomSheet();
        return;
      case 'side-drawer':
        await this.openSettingsDrawer();
        return;
      case 'image-lightbox':
        await this.openLightbox();
        return;
      case 'wizard':
        await this.openWizard();
        return;
      case 'permission-prompt':
        await this.requestPermission();
        return;
      case 'caller-resolve':
        await this.resolveFromCaller();
    }
  }

  async showAlert(): Promise<void> {
    await Alert.call({
      title: 'Import finished',
      message: 'The caller waited until the alert was acknowledged.',
      action: 'Done',
    });
    this.lastResult.set('Alert acknowledged');
  }

  async askForPrompt(): Promise<void> {
    const value = await Prompt.call({
      label: 'Rename workspace',
      initialValue: 'Design review',
    });
    this.lastResult.set(value ? `Prompt resolved with "${value}"` : 'Prompt cancelled');
  }

  async openNestedDialog(): Promise<void> {
    const depth = await Nested.call({ depth: 1 });
    this.lastResult.set(`Nested dialog resolved at depth ${depth}`);
  }

  showSingletonToast(): void {
    const promise = Toast.upsert({
      message: 'Saving preferences...',
      detail: 'upsert() keeps this as one active instance.',
      tone: 'info',
    });

    globalThis.setTimeout(() => {
      Toast.upsert({
        message: 'Preferences saved.',
        detail: 'The same toast instance received new props.',
        tone: 'success',
      });
    }, 600);
    globalThis.setTimeout(() => {
      Toast.end(promise, true);
    }, 1200);
  }

  showProgressToast(): void {
    const promise = Toast.upsert({
      message: 'Starting import...',
      detail: 'Step 0 of 3',
      tone: 'info',
    });
    let step = 0;
    const interval = globalThis.setInterval(() => {
      step += 1;
      if (step < 4) {
        Toast.upsert({
          message: `Import step ${step} of 3...`,
          detail: 'Consecutive calls mutate the singleton.',
          tone: 'info',
        });
        return;
      }

      globalThis.clearInterval(interval);
      Toast.update(promise, {
        message: 'Import complete.',
        detail: 'The caller ends the tracked promise.',
        tone: 'success',
      });
      globalThis.setTimeout(() => Toast.end(promise, true), 500);
    }, 500);
  }

  showAutoError(): void {
    void AutoError.call({ message: 'The banner will close itself after a short timeout.' });
    void AutoError.call({ message: 'A second error stacks independently.' });
  }

  showLiveStatus(): void {
    const promise = Toast.call({
      message: 'Connecting...',
      detail: 'The caller owns this promise identity.',
      tone: 'warning',
    });

    globalThis.setTimeout(() => {
      Toast.update(promise, {
        message: 'Syncing records...',
        detail: 'Targeted update: same open call.',
        tone: 'info',
      });
    }, 700);
    globalThis.setTimeout(() => {
      Toast.update(promise, {
        message: 'Online',
        detail: 'Done, then closed by the caller.',
        tone: 'success',
      });
    }, 1400);
    globalThis.setTimeout(() => Toast.end(promise, true), 2100);
  }

  showUploadBroadcast(): void {
    const first = Toast.call({
      message: 'Uploading',
      detail: 'report.pdf',
      tone: 'info',
    });
    const second = Toast.call({
      message: 'Uploading',
      detail: 'avatar.png',
      tone: 'info',
    });

    globalThis.setTimeout(() => {
      Toast.update({
        message: 'Connection restored',
        tone: 'success',
      });
    }, 700);
    globalThis.setTimeout(() => {
      Toast.end(first, true);
      Toast.end(second, true);
    }, 1800);
  }

  async runMutationFlow(): Promise<void> {
    const accepted = await MutationConfirm.call({
      label: 'Run async mutation',
      mutationFn: async (call) => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        call.end(true);
      },
    });

    this.lastResult.set(`Mutation flow resolved with ${accepted}`);
  }

  async runOptionalAsyncConfirm(): Promise<void> {
    const accepted = await OptionalConfirm.call({ label: 'Publish without async handler?' });
    this.lastResult.set(`Optional confirm resolved with ${accepted}`);
  }

  async openAccountDialog(): Promise<void> {
    const accepted = await AccountDialogCall.call({ subject: 'Per-call subject' });
    this.lastResult.set(`Root-prop dialog resolved with ${accepted}`);
  }

  async pickItem(): Promise<void> {
    const item = await ItemPicker.call({ items: this.pickerItems });
    this.lastResult.set(item ? `Picked ${item.name}` : 'Item picker cancelled');
  }

  async pickColor(): Promise<void> {
    const color = await ColorPicker.call({
      current: this.selectedColor(),
      colors: ['#05865c', '#2563eb', '#d97706', '#dc2626', '#6f49c7', '#111827'],
    });
    if (color) this.selectedColor.set(color);
    this.lastResult.set(color ? `Picked ${color}` : 'Color picker cancelled');
  }

  async openContextMenu(event?: MouseEvent): Promise<void> {
    const target = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const rect = target?.getBoundingClientRect();
    const x = event?.clientX ?? (rect ? rect.left + 24 : 240);
    const y = event?.clientY ?? (rect ? rect.bottom + 8 : 180);
    const action = await ContextMenu.call({ x, y });
    this.lastResult.set(action ? `Context menu: ${action}` : 'Context menu closed');
  }

  async openCommandPalette(): Promise<void> {
    const action = await CommandPalette.call();
    this.lastResult.set(action ? `Command palette: ${action}` : 'Command palette closed');
  }

  async openBottomSheet(): Promise<void> {
    const choice = await BottomSheet.call({
      title: 'Quick actions',
      options: ['Share link', 'Copy ID', 'Archive'],
    });
    this.lastResult.set(choice ? `Bottom sheet: ${choice}` : 'Bottom sheet closed');
  }

  async openSettingsDrawer(): Promise<void> {
    const settings = await SettingsDrawer.call({
      settings: {
        email: true,
        density: 'Comfortable',
        theme: 'System',
      },
    });
    this.lastResult.set(settings ? `Settings saved: ${settings.theme}` : 'Settings drawer closed');
  }

  async openLightbox(): Promise<void> {
    await Lightbox.call({
      title: 'Workspace preview',
      imageUrl: this.lightboxImage,
    });
    this.lastResult.set('Lightbox closed');
  }

  async openWizard(): Promise<void> {
    const result = await Wizard.call();
    this.lastResult.set(result ? `Wizard finished for ${result.email}` : 'Wizard cancelled');
  }

  async requestPermission(): Promise<void> {
    const result = await Permission.call({
      appName: 'Reports Bot',
      scope: 'project activity and exports',
    });
    this.lastResult.set(`Permission response: ${result.action}`);
  }

  async resolveFromCaller(): Promise<void> {
    const promise = Approval.call({
      message: 'No in-dialog button will resolve this call.',
    });
    globalThis.setTimeout(() => Approval.end(promise, false), 1400);
    const accepted = await promise;
    this.lastResult.set(`Caller resolved approval with ${accepted}`);
  }
}
