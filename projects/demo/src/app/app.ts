import { Component, input, signal } from '@angular/core';
import {
  createCallable,
  createMutationFlow,
  injectCall,
  type MutationFn,
  NgxCallHost,
} from 'ngx-call';

type DemoRoot = { user: string };

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

type ToastProps = { message: string };

@Component({
  selector: 'demo-toast',
  standalone: true,
  template: `
    <aside
      class="toast"
      [class.leaving]="call.ended()"
      role="status"
      [style.bottom.px]="24 + call.index() * 76"
    >
      <strong>{{ call.stackSize() > 1 ? 'Stacked call' : 'Notification' }}</strong>
      <span>{{ message() }}</span>
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
      width: min(360px, calc(100vw - 48px));
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

    .toast.leaving {
      opacity: 0;
      transform: translateX(16px);
    }

    strong,
    span {
      grid-column: 1;
    }

    button {
      grid-column: 2;
      grid-row: 1 / span 2;
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
  readonly call = injectCall<boolean, DemoRoot>();
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

const Confirm = createCallable<ConfirmProps, boolean, DemoRoot>(ConfirmDialog, {
  inputs: ['message'],
  unmountingDelay: 180,
});

const Toast = createCallable<ToastProps, boolean, DemoRoot>(ToastMessage, {
  inputs: ['message'],
  unmountingDelay: 180,
});

const MutationConfirm = createCallable<MutationConfirmProps, boolean, DemoRoot>(
  MutationConfirmDialog,
  {
    inputs: ['label', 'mutationFn'],
  },
);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgxCallHost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly Confirm = Confirm;
  readonly Toast = Toast;
  readonly MutationConfirm = MutationConfirm;
  readonly root = signal<DemoRoot>({ user: 'demo-user' });
  readonly lastResult = signal('No calls yet');

  async askForConfirmation(): Promise<void> {
    const accepted = await Confirm.call({ message: 'Continue the demo flow?' });
    this.lastResult.set(`Confirm resolved with ${accepted}`);
  }

  showSingletonToast(): void {
    const promise = Toast.upsert({ message: 'Saving preferences...' });

    globalThis.setTimeout(() => {
      Toast.upsert({ message: 'Preferences saved.' });
    }, 600);
    globalThis.setTimeout(() => {
      Toast.end(promise, true);
    }, 1200);
  }

  showProgressToast(): void {
    const promise = Toast.call({ message: 'Starting import...' });
    let step = 0;
    const interval = globalThis.setInterval(() => {
      step += 1;
      if (step < 4) {
        Toast.update(promise, { message: `Import step ${step} of 3...` });
        return;
      }

      globalThis.clearInterval(interval);
      Toast.update(promise, { message: 'Import complete.' });
      globalThis.setTimeout(() => Toast.end(promise, true), 500);
    }, 500);
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
}
