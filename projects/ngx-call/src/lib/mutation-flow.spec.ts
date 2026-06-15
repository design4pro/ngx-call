import { describe, expect, it, vi } from 'vitest';
import { createMutationFlow, type MutationFn } from './ngx-call';

describe('createMutationFlow', () => {
  it('sets pending while the mutation is in flight and forwards payload', async () => {
    let finish!: () => void;
    const call = { end: vi.fn<(response: boolean) => void>() };
    const mutationFn: MutationFn<boolean, { choice: string }> = vi.fn(
      async (mutationCall, payload) => {
        expect(payload).toEqual({ choice: 'A' });
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        mutationCall.end(true);
      },
    );

    const submit = createMutationFlow({ call, mutationFn });

    submit.run({ choice: 'A' });

    expect(submit.pending()).toBe(true);
    expect(mutationFn).toHaveBeenCalledTimes(1);

    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submit.pending()).toBe(false);
    expect(call.end).toHaveBeenCalledWith(true);
  });

  it('drops re-entrant submissions while pending', () => {
    const call = { end: vi.fn<(response: boolean) => void>() };
    const mutationFn: MutationFn<boolean> = vi.fn(() => new Promise<void>(() => undefined));
    const submit = createMutationFlow({ call, mutationFn });

    submit.run();
    submit.run();

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(submit.pending()).toBe(true);
  });

  it('uses .orEnd fallback only when no mutationFn is provided', async () => {
    const call = { end: vi.fn<(response: boolean) => void>() };
    const submit = createMutationFlow<boolean>({ call });

    submit.run().orEnd(true);

    expect(call.end).toHaveBeenCalledWith(true);
    expect(submit.pending()).toBe(false);
  });

  it('ignores .orEnd fallback when a mutationFn is provided', async () => {
    const call = { end: vi.fn<(response: boolean) => void>() };
    const mutationFn: MutationFn<boolean> = vi.fn(async (mutationCall) => {
      mutationCall.end(false);
    });
    const submit = createMutationFlow({ call, mutationFn });

    submit.run().orEnd(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(call.end).toHaveBeenCalledTimes(1);
    expect(call.end).toHaveBeenCalledWith(false);
  });

  it('clears pending and leaves the call open when mutationFn rejects', async () => {
    const call = { end: vi.fn<(response: boolean) => void>() };
    const mutationFn: MutationFn<boolean> = vi.fn(async () => {
      throw new Error('failed');
    });
    const submit = createMutationFlow({ call, mutationFn });

    submit.run();
    await Promise.resolve();
    await Promise.resolve();

    expect(submit.pending()).toBe(false);
    expect(call.end).not.toHaveBeenCalled();
  });

  it('clears pending and allows another run when mutationFn throws synchronously', async () => {
    const call = { end: vi.fn<(response: boolean) => void>() };
    const mutationFn: MutationFn<boolean> = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('failed');
      })
      .mockResolvedValueOnce(undefined);
    const submit = createMutationFlow({ call, mutationFn });

    submit.run();
    await Promise.resolve();
    await Promise.resolve();

    expect(submit.pending()).toBe(false);

    submit.run();
    await Promise.resolve();
    await Promise.resolve();

    expect(mutationFn).toHaveBeenCalledTimes(2);
    expect(submit.pending()).toBe(false);
  });
});
