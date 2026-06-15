import { Component, type Signal } from '@angular/core';
import { describe, expectTypeOf, it } from 'vitest';
import { createCallable, type CallContext, type Callable, type MutationFn } from './ngx-call';

@Component({
  standalone: true,
  template: '',
})
class TypeOnlyComponent {}

describe('public types', () => {
  it('types callables with props, response, and root props', () => {
    const Confirm = createCallable<{ message: string }, boolean, { user: string }>(
      TypeOnlyComponent,
      { inputs: ['message'] },
    );

    expectTypeOf(Confirm).toEqualTypeOf<Callable<{ message: string }, boolean, { user: string }>>();
    expectTypeOf(Confirm.call).toEqualTypeOf<(props: { message: string }) => Promise<boolean>>();
    expectTypeOf(Confirm.upsert).toEqualTypeOf<(props: { message: string }) => Promise<boolean>>();

    Confirm.end(true);
    Confirm.end(Promise.resolve(true), false);
    Confirm.update({ message: 'Updated' });
    Confirm.update(Promise.resolve(true), { message: 'Updated' });
  });

  it('types void props as a zero-argument call', () => {
    const Done = createCallable<void, void>(TypeOnlyComponent);

    expectTypeOf(Done.call).toEqualTypeOf<() => Promise<void>>();
    expectTypeOf(Done.upsert).toEqualTypeOf<() => Promise<void>>();

    expectTypeOf(Done.call).toBeCallableWith();
    expectTypeOf(Done.upsert).toBeCallableWith();
    Done.end();
  });

  it('does not expose promise lifecycle internals on CallContext', () => {
    const context = {} as CallContext<boolean, { user: string }>;
    type ForbiddenKeys = Extract<
      keyof CallContext<boolean, { user: string }>,
      'promise' | 'resolve' | 'props'
    >;

    expectTypeOf(context.key).toEqualTypeOf<string>();
    expectTypeOf(context.end).toEqualTypeOf<(response: boolean) => void>();
    expectTypeOf(context.ended).toEqualTypeOf<Signal<boolean>>();
    expectTypeOf(context.root).toEqualTypeOf<Signal<{ user: string }>>();
    expectTypeOf(context.index).toEqualTypeOf<Signal<number>>();
    expectTypeOf(context.stackSize).toEqualTypeOf<Signal<number>>();

    expectTypeOf<ForbiddenKeys>().toEqualTypeOf<never>();
  });

  it('types mutation flow handlers', () => {
    const mutation: MutationFn<boolean, { id: string }> = async (call, payload) => {
      expectTypeOf(payload).toEqualTypeOf<{ id: string }>();
      call.end(true);
    };

    expectTypeOf(mutation).toEqualTypeOf<
      (call: { end: (response: boolean) => void }, payload: { id: string }) => Promise<void>
    >();
  });
});
