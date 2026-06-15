import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCallable, injectCall, NgxCallHost } from './ngx-call';

type DialogRoot = { user: string };

@Component({
  selector: 'test-dialog',
  standalone: true,
  template: `
    <section
      role="dialog"
      [attr.aria-label]="message()"
      [attr.data-ended]="call.ended()"
      [attr.data-index]="call.index()"
      [attr.data-stack-size]="call.stackSize()"
    >
      <p data-testid="message">{{ message() }}</p>
      <p data-testid="root">Hi {{ call.root().user }}</p>
      <button type="button" (click)="call.end(true)">Yes</button>
      <button type="button" (click)="call.end(false)">No</button>
    </section>
  `,
})
class TestDialog {
  readonly message = input.required<string>();
  readonly call = injectCall<boolean, DialogRoot>();
}

@Component({
  selector: 'test-void-dialog',
  standalone: true,
  template: `<button type="button" (click)="call.end()">Done</button>`,
})
class TestVoidDialog {
  readonly call = injectCall<void, undefined>();
}

function text(fixture: ComponentFixture<unknown>, selector: string): string {
  return fixture.nativeElement.querySelector(selector).textContent.trim();
}

describe('createCallable + NgxCallHost', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('throws when call() runs without a host', () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
    });

    expect(() => Confirm.call({ message: 'Continue?' })).toThrowError('No <ngx-call-host> found!');
  });

  it('renders a call and resolves its promise from the injected call context', async () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
    });

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `<ngx-call-host [callable]="Confirm" [root]="root()" />`,
    })
    class HostFixture {
      readonly Confirm = Confirm;
      readonly root = signal<DialogRoot>({ user: 'Ada' });
    }

    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();

    const promise = Confirm.call({ message: 'Continue?' });
    fixture.detectChanges();

    expect(text(fixture, '[data-testid="message"]')).toBe('Continue?');
    expect(text(fixture, '[data-testid="root"]')).toBe('Hi Ada');

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    await expect(promise).resolves.toBe(true);
  });

  it('updates targeted call props and root props through signals', () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
    });

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `<ngx-call-host [callable]="Confirm" [root]="root()" />`,
    })
    class HostFixture {
      readonly Confirm = Confirm;
      readonly root = signal<DialogRoot>({ user: 'Ada' });
    }

    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();

    const promise = Confirm.call({ message: 'One' });
    fixture.detectChanges();

    Confirm.update(promise, { message: 'Two' });
    fixture.componentInstance.root.set({ user: 'Grace' });
    fixture.detectChanges();

    expect(text(fixture, '[data-testid="message"]')).toBe('Two');
    expect(text(fixture, '[data-testid="root"]')).toBe('Hi Grace');
  });

  it('updates all active calls when update() is called without a target', () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
    });

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `<ngx-call-host [callable]="Confirm" [root]="root()" />`,
    })
    class HostFixture {
      readonly Confirm = Confirm;
      readonly root = signal<DialogRoot>({ user: 'Ada' });
    }

    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();

    Confirm.call({ message: 'One' });
    Confirm.call({ message: 'Two' });
    fixture.detectChanges();

    Confirm.update({ message: 'Updated' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[aria-label="Updated"]')).toHaveLength(2);
  });

  it('upsert creates one singleton call and updates it until it ends', async () => {
    const Toast = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
    });

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `<ngx-call-host [callable]="Toast" [root]="root()" />`,
    })
    class HostFixture {
      readonly Toast = Toast;
      readonly root = signal<DialogRoot>({ user: 'Ada' });
    }

    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();

    const first = Toast.upsert({ message: 'Loading' });
    fixture.detectChanges();
    const second = Toast.upsert({ message: 'Almost done' });
    fixture.detectChanges();

    expect(second).toBe(first);
    expect(fixture.nativeElement.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(text(fixture, '[data-testid="message"]')).toBe('Almost done');

    Toast.end(true);
    fixture.detectChanges();
    await first;

    const third = Toast.upsert({ message: 'Done' });
    fixture.detectChanges();

    expect(third).not.toBe(first);
    Toast.end(third, true);
  });

  it('marks a call as ended before removing it after the unmounting delay', async () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
      unmountingDelay: 5,
    });

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `<ngx-call-host [callable]="Confirm" [root]="root()" />`,
    })
    class HostFixture {
      readonly Confirm = Confirm;
      readonly root = signal<DialogRoot>({ user: 'Ada' });
    }

    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();

    Confirm.call({ message: 'Exit' });
    fixture.detectChanges();
    Confirm.end(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]').dataset.ended).toBe('true');

    await new Promise((resolve) => setTimeout(resolve, 10));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps calls created after end-all in the same tick', () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
      unmountingDelay: 5,
    });

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `<ngx-call-host [callable]="Confirm" [root]="root()" />`,
    })
    class HostFixture {
      readonly Confirm = Confirm;
      readonly root = signal<DialogRoot>({ user: 'Ada' });
    }

    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();

    Confirm.call({ message: 'Before' });
    Confirm.end(false);
    Confirm.call({ message: 'After' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Before"]').dataset.ended).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="After"]').dataset.ended).toBe('false');
  });

  it('throws when more than one host is mounted for a callable', () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
    });

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `
        <ngx-call-host [callable]="Confirm" [root]="root()" />
        <ngx-call-host [callable]="Confirm" [root]="root()" />
      `,
    })
    class MultiHostFixture {
      readonly Confirm = Confirm;
      readonly root = signal<DialogRoot>({ user: 'Ada' });
    }

    const fixture = TestBed.createComponent(MultiHostFixture);
    fixture.detectChanges();

    expect(() => Confirm.call({ message: 'Duplicate' })).toThrowError(
      'Multiple <ngx-call-host> instances found!',
    );
  });

  it('supports void props and void response callables', async () => {
    const Done = createCallable<void, void>(TestVoidDialog);

    @Component({
      standalone: true,
      imports: [NgxCallHost],
      template: `<ngx-call-host [callable]="Done" />`,
    })
    class HostFixture {
      readonly Done = Done;
    }

    const fixture = TestBed.createComponent(HostFixture);
    fixture.detectChanges();

    const promise = Done.call();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    await expect(promise).resolves.toBeUndefined();
  });

  it('throws a client-only error when call() runs without a browser document', () => {
    const Confirm = createCallable<{ message: string }, boolean, DialogRoot>(TestDialog, {
      inputs: ['message'],
    });

    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);

    expect(() => Confirm.call({ message: 'Server' })).toThrowError('call() is client-only');
  });
});
