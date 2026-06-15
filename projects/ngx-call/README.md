# ngx-call

Call Angular components like async functions. The component renders in a host and
resolves a promise with the value selected by the user.

Good fits: confirmations, dialogs, form modals, toasts, notifications, context
menus, pickers, and short wizards.

## Install

```bash
npm install @design4pro/ngx-call
```

Peer dependency:

```json
{
  "@angular/core": ">=20.0.0 <23.0.0"
}
```

`ngx-call` does not depend on React, RxJS, Angular CDK, or an overlay package.

## Declare -> Host -> Call

### 1. Declare a callable component

```ts
import { Component, input } from '@angular/core';
import { createCallable, injectCall } from '@design4pro/ngx-call';

type ConfirmProps = { message: string };
type ConfirmResponse = boolean;

@Component({
  standalone: true,
  template: `
    <section role="dialog" [class.leaving]="call.ended()">
      <p>{{ message() }}</p>
      <button type="button" (click)="call.end(false)">Cancel</button>
      <button type="button" (click)="call.end(true)">Continue</button>
    </section>
  `,
})
class ConfirmDialog {
  readonly message = input.required<string>();
  readonly call = injectCall<ConfirmResponse>();
}

export const Confirm = createCallable<ConfirmProps, ConfirmResponse>(ConfirmDialog, {
  inputs: ['message'],
  unmountingDelay: 200,
});
```

`inputs` is explicit on purpose. Angular does not expose a stable public API for
discovering signal inputs from a component type, so `ngx-call` avoids private
metadata.

### 2. Mount one host

```ts
import { Component, signal } from '@angular/core';
import { NgxCallHost } from '@design4pro/ngx-call';
import { Confirm } from './confirm-dialog';

@Component({
  standalone: true,
  imports: [NgxCallHost],
  template: `
    <button type="button" (click)="run()">Open</button>
    <ngx-call-host [callable]="Confirm" [root]="root()" />
  `,
})
export class App {
  readonly Confirm = Confirm;
  readonly root = signal({ user: 'Ada' });

  async run() {
    const accepted = await Confirm.call({ message: 'Continue?' });
    console.log(accepted);
  }
}
```

There must be exactly one live `<ngx-call-host>` per callable when `call()` or
`upsert()` runs. Missing or duplicate hosts throw at the call site.

### 3. Call and await

```ts
const accepted = await Confirm.call({ message: 'Continue?' });
```

## API

```ts
const promise = Confirm.call(props);
const singletonPromise = Toast.upsert(props);

Confirm.update(promise, partialProps);
Confirm.update(partialProps);

Confirm.end(promise, response);
Confirm.end(response);
```

`call()` creates a new stack item every time. `upsert()` creates one singleton
item and updates it on later calls until it ends.

`CallContext` from `injectCall()` exposes:

```ts
{
  key: string;
  ended: Signal<boolean>;
  root: Signal<RootProps>;
  index: Signal<number>;
  stackSize: Signal<number>;
  end(response): void;
}
```

It does not expose the internal promise or resolver.

## Mutation flow

Use `createMutationFlow` when the call submits async work and should stay open on
failure.

```ts
import { createMutationFlow, type MutationFn } from '@design4pro/ngx-call';

type Props = {
  mutationFn: MutationFn<boolean>;
};

class DeleteDialog {
  readonly mutationFn = input.required<MutationFn<boolean>>();
  readonly call = injectCall<boolean>();
  readonly submit = createMutationFlow<boolean>({
    call: this.call,
    mutationFn: (call) => this.mutationFn()(call, undefined),
  });
}
```

`submit.pending()` is a signal. `submit.run(payload)` starts the handler. If no
handler is provided, `submit.run().orEnd(value)` can close with a fallback value.

## SSR

Creating a callable and rendering an empty host are SSR-safe. Calling `call()` or
`upsert()` is client-only because it requires a browser document and a live host.

## Build and test

```bash
ng test ngx-call
ng build ngx-call
```
