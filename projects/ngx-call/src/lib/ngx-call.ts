import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  computed,
  DestroyRef,
  effect,
  inject,
  InjectionToken,
  Injector,
  input,
  inputBinding,
  type Signal,
  signal,
  type Type,
  type WritableSignal,
  ViewContainerRef,
} from '@angular/core';

type InputName<Props> = Extract<keyof Props, string>;
type CallArgs<Props> = [Props] extends [void] ? [] : [props: Props];
type EndArgs<Response> = [Response] extends [void]
  ?
      | []
      | [response: Response]
      | [promise: Promise<Response>]
      | [promise: Promise<Response>, response: Response]
  : [response: Response] | [promise: Promise<Response>, response: Response];
type UpdateArgs<Props, Response> = [Props] extends [void]
  ?
      | []
      | [props: Partial<Props>]
      | [promise: Promise<Response>]
      | [promise: Promise<Response>, props: Partial<Props>]
  : [props: Partial<Props>] | [promise: Promise<Response>, props: Partial<Props>];

export type CallFunction<Props, Response> = (...args: CallArgs<Props>) => Promise<Response>;

export type UpsertFunction<Props, Response> = (...args: CallArgs<Props>) => Promise<Response>;

export type EndFunction<Response> = (...args: EndArgs<Response>) => void;

export type UpdateFunction<Props, Response> = (...args: UpdateArgs<Props, Response>) => void;

export interface CallContext<Response = void, RootProps = undefined> {
  readonly key: string;
  readonly ended: Signal<boolean>;
  readonly root: Signal<RootProps>;
  readonly index: Signal<number>;
  readonly stackSize: Signal<number>;
  end(response: Response): void;
}

export interface CallStackItem<Props = void, Response = void, RootProps = undefined> {
  readonly key: string;
  readonly props: Signal<Props>;
  readonly context: CallContext<Response, RootProps>;
}

export interface Callable<Props = void, Response = void, RootProps = undefined> {
  readonly stack: Signal<readonly CallStackItem<Props, Response, RootProps>[]>;
  call: CallFunction<Props, Response>;
  upsert: UpsertFunction<Props, Response>;
  end: EndFunction<Response>;
  update: UpdateFunction<Props, Response>;
}

export interface CreateCallableOptions<Props> {
  readonly inputs?: readonly InputName<Props>[];
  readonly unmountingDelay?: number;
}

interface InternalCallItem<Props, Response, RootProps> extends CallStackItem<
  Props,
  Response,
  RootProps
> {
  readonly promise: Promise<Response>;
  readonly resolve: (response: Response) => void;
  readonly endedState: WritableSignal<boolean>;
  readonly propsState: WritableSignal<Props>;
}

interface InternalCallable<Props, Response, RootProps> extends Callable<
  Props,
  Response,
  RootProps
> {
  readonly _component: Type<unknown>;
  readonly _inputNames: readonly InputName<Props>[];
  readonly _stack: Signal<readonly InternalCallItem<Props, Response, RootProps>[]>;
  _registerHost(root: Signal<RootProps>): () => void;
}

const CALL_CONTEXT = new InjectionToken<CallContext<unknown, unknown>>('NgxCallContext');

export function injectCall<Response = void, RootProps = undefined>(): CallContext<
  Response,
  RootProps
> {
  return inject(CALL_CONTEXT) as CallContext<Response, RootProps>;
}

export function createCallable<Response = void, RootProps = undefined>(
  component: Type<unknown>,
  options?: CreateCallableOptions<void>,
): Callable<void, Response, RootProps>;
export function createCallable<Props extends object, Response = void, RootProps = undefined>(
  component: Type<unknown>,
  options: CreateCallableOptions<Props> & {
    readonly inputs: readonly InputName<Props>[];
  },
): Callable<Props, Response, RootProps>;
export function createCallable<Props, Response, RootProps>(
  component: Type<unknown>,
  options: CreateCallableOptions<Props> = {},
): Callable<Props, Response, RootProps> {
  const inputNames = options.inputs ?? [];
  const unmountingDelay = options.unmountingDelay ?? 0;
  const stack = signal<InternalCallItem<Props, Response, RootProps>[]>([]);
  const hostRoots = new Set<Signal<RootProps>>();
  const publicStack = computed(() =>
    stack().map(({ key, props, context }) => ({ key, props, context })),
  );
  let activeRoot: Signal<RootProps> | null = null;
  let nextKey = 0;
  let upsertPromise: Promise<Response> | null = null;

  const registerHost = (root: Signal<RootProps>) => {
    hostRoots.add(root);
    activeRoot = root;

    return () => {
      hostRoots.delete(root);
      activeRoot = activeRoot === root ? (hostRoots.values().next().value ?? null) : activeRoot;

      if (!hostRoots.size) {
        nextKey = 0;
        upsertPromise = null;
        stack.set([]);
      }
    };
  };

  const assertSingleHost = () => {
    if (!isBrowser()) {
      throw new Error('call() is client-only; no browser document is available.');
    }
    if (!hostRoots.size) throw new Error('No <ngx-call-host> found!');
    if (hostRoots.size > 1) {
      throw new Error('Multiple <ngx-call-host> instances found!');
    }
  };

  const createEnd = (promise: Promise<Response> | null) => (response: Response) => {
    const ending = new Set<Promise<Response>>();

    stack.update((items) =>
      items.map((item) => {
        if (promise && item.promise !== promise) return item;

        item.resolve(response);
        item.endedState.set(true);
        ending.add(item.promise);
        return item;
      }),
    );

    globalThis.setTimeout(() => {
      stack.update((items) => items.filter((item) => !ending.has(item.promise)));
    }, unmountingDelay);
  };

  const createItem = (
    props: Props,
    configureEnd?: (promise: Promise<Response>) => (response: Response) => void,
  ) => {
    let resolve!: (response: Response) => void;
    const promise = new Promise<Response>((res) => {
      resolve = res;
    });
    const key = String(nextKey++);
    const endedState = signal(false);
    const propsState = signal(props);
    const end = (configureEnd ?? createEnd)(promise);
    const context: CallContext<Response, RootProps> = {
      key,
      ended: endedState.asReadonly(),
      root: computed(() => activeRoot?.() as RootProps),
      index: computed(() => stack().findIndex((item) => item.key === key)),
      stackSize: computed(() => stack().length),
      end,
    };

    return {
      key,
      promise,
      resolve,
      endedState,
      propsState,
      props: propsState.asReadonly(),
      context,
    } satisfies InternalCallItem<Props, Response, RootProps>;
  };

  const call = ((...args: CallArgs<Props>) => {
    assertSingleHost();

    const item = createItem(args[0] as Props);
    stack.update((items) => [...items, item]);
    return item.promise;
  }) as CallFunction<Props, Response>;

  const upsert = ((...args: CallArgs<Props>) => {
    assertSingleHost();

    if (upsertPromise) {
      updateProps(upsertPromise, args[0] as Partial<Props>);
      return upsertPromise;
    }

    const item = createItem(args[0] as Props, (promise) => (response) => {
      if (upsertPromise === promise) upsertPromise = null;
      createEnd(promise)(response);
    });
    upsertPromise = item.promise;
    stack.update((items) => [...items, item]);
    return item.promise;
  }) as UpsertFunction<Props, Response>;

  const end = ((...args: EndArgs<Response>) => {
    const targeted = isPromiseLike(args[0]);
    const promise = targeted ? (args[0] as Promise<Response>) : null;
    const response = (targeted ? args[1] : args[0]) as Response;

    if (!targeted || promise === upsertPromise) upsertPromise = null;

    createEnd(promise)(response);
  }) as EndFunction<Response>;

  const update = ((...args: UpdateArgs<Props, Response>) => {
    const targeted = isPromiseLike(args[0]);
    const promise = targeted ? (args[0] as Promise<Response>) : null;
    const props = (targeted ? args[1] : args[0]) as Partial<Props>;

    updateProps(promise, props);
  }) as UpdateFunction<Props, Response>;

  const updateProps = (promise: Promise<Response> | null, patch: Partial<Props> | undefined) => {
    const safePatch = (patch ?? {}) as Partial<Props>;

    stack.update((items) =>
      items.map((item) => {
        if (promise && item.promise !== promise) return item;

        item.propsState.set(mergeProps(item.propsState(), safePatch));
        return item;
      }),
    );
  };

  const callable = {
    stack: publicStack,
    call,
    upsert,
    end,
    update,
    _component: component,
    _inputNames: inputNames,
    _stack: stack.asReadonly(),
    _registerHost: registerHost,
  } satisfies InternalCallable<Props, Response, RootProps>;

  return callable;
}

@Component({
  selector: 'ngx-call-host',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxCallHost {
  readonly callable = input<Callable<any, any, any> | null>(null);
  readonly root = input<unknown>(undefined);

  private readonly viewContainer = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rootSignal = computed(() => this.root());
  private readonly refs = new Map<string, ComponentRef<unknown>>();
  private activeCallable: InternalCallable<unknown, unknown, unknown> | null = null;
  private unregisterHost: (() => void) | null = null;

  constructor() {
    effect(() => {
      const callable = this.callable() as InternalCallable<unknown, unknown, unknown> | null;

      if (callable !== this.activeCallable) this.bind(callable);

      this.sync(callable, callable?._stack() ?? []);
    });

    this.destroyRef.onDestroy(() => this.dispose());
  }

  private bind(callable: InternalCallable<unknown, unknown, unknown> | null): void {
    this.unregisterHost?.();
    this.clearRefs();

    this.activeCallable = callable;
    this.unregisterHost = callable?._registerHost(this.rootSignal) ?? null;
  }

  private sync(
    callable: InternalCallable<unknown, unknown, unknown> | null,
    stack: readonly InternalCallItem<unknown, unknown, unknown>[],
  ): void {
    if (!callable) {
      this.clearRefs();
      return;
    }

    const activeKeys = new Set(stack.map((item) => item.key));
    for (const [key, ref] of this.refs) {
      if (!activeKeys.has(key)) {
        const index = this.viewContainer.indexOf(ref.hostView);
        if (index >= 0) this.viewContainer.remove(index);
        else ref.destroy();
        this.refs.delete(key);
      }
    }

    stack.forEach((item, index) => {
      let ref = this.refs.get(item.key);
      if (!ref) {
        ref = this.viewContainer.createComponent(callable._component, {
          index,
          injector: Injector.create({
            parent: this.injector,
            providers: [{ provide: CALL_CONTEXT, useValue: item.context }],
          }),
          bindings: callable._inputNames.map((inputName) =>
            inputBinding(inputName, () => readInput(item.props(), inputName)),
          ),
        });
        this.refs.set(item.key, ref);
      }

      ref.changeDetectorRef.detectChanges();
    });
  }

  private dispose(): void {
    this.unregisterHost?.();
    this.unregisterHost = null;
    this.clearRefs();
    this.activeCallable = null;
  }

  private clearRefs(): void {
    for (const ref of this.refs.values()) ref.destroy();
    this.refs.clear();
    this.viewContainer.clear();
  }
}

export interface MutationCall<Response = void> {
  end(response: Response): void;
}

export type MutationFn<Response, Payload = void> = (
  call: MutationCall<Response>,
  payload: Payload,
) => Promise<void>;

export interface MutationChain<Response> {
  orEnd(response: Response): void;
}

export interface MutationFlow<Response, Payload = void> {
  readonly pending: Signal<boolean>;
  run(...args: CallArgs<Payload>): MutationChain<Response>;
}

export interface CreateMutationFlowOptions<Response, Payload = void> {
  readonly call: MutationCall<Response>;
  readonly mutationFn?: MutationFn<Response, Payload>;
}

const noopChain: MutationChain<never> = { orEnd: () => undefined };

export function createMutationFlow<Response, Payload = void>({
  call,
  mutationFn,
}: CreateMutationFlowOptions<Response, Payload>): MutationFlow<Response, Payload> {
  const pending = signal(false);
  let inFlight = false;

  const run = ((...args: CallArgs<Payload>) => {
    if (inFlight) return noopChain as MutationChain<Response>;

    const payload = args[0] as Payload;
    if (!mutationFn) {
      return {
        orEnd: (response: Response) => call.end(response),
      };
    }

    inFlight = true;
    pending.set(true);

    void Promise.resolve(mutationFn(call, payload))
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
        pending.set(false);
      });

    return noopChain as MutationChain<Response>;
  }) as MutationFlow<Response, Payload>['run'];

  return {
    pending: pending.asReadonly(),
    run,
  };
}

function isBrowser(): boolean {
  return typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined';
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<unknown>).then === 'function'
  );
}

function mergeProps<Props>(props: Props, patch: Partial<Props>): Props {
  if (isObjectRecord(props) && isObjectRecord(patch)) {
    return { ...props, ...patch };
  }

  return (patch ?? props) as Props;
}

function readInput(props: unknown, inputName: string): unknown {
  if (isObjectRecord(props)) return props[inputName];
  return undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
