// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  BindingTracker,
  Context,
  Binding,
  BindingScope,
  inject,
  Getter,
} from '../..';
import {expect} from '@loopback/testlab';

describe('BindingTracker', () => {
  let ctx: Context;
  let bindings: Binding<unknown>[];
  let bindingTracker: BindingTracker;

  beforeEach(givenBindingTracker);

  it('tracks bindings', () => {
    expect(bindingTracker.bindings).to.eql(bindings);
  });

  it('resolves bindings', async () => {
    expect(await bindingTracker.resolve()).to.eql(['BAR', 'FOO']);
    expect(await bindingTracker.values()).to.eql(['BAR', 'FOO']);
  });

  it('resolves bindings as a getter', async () => {
    expect(await bindingTracker.asGetter()()).to.eql(['BAR', 'FOO']);
  });

  it('reloads bindings after reset', async () => {
    bindingTracker.reset();
    const abcBinding = ctx
      .bind('abc')
      .to('ABC')
      .tag('abc');
    const xyzBinding = ctx
      .bind('xyz')
      .to('XYZ')
      .tag('foo');
    expect(bindingTracker.bindings).to.containEql(xyzBinding);
    // `abc` does not have the matching tag
    expect(bindingTracker.bindings).to.not.containEql(abcBinding);
    expect(await bindingTracker.values()).to.eql(['BAR', 'XYZ', 'FOO']);
  });

  it('reloads bindings if context bindings are added', async () => {
    bindingTracker.watch();
    const abcBinding = ctx
      .bind('abc')
      .to('ABC')
      .tag('abc');
    const xyzBinding = ctx
      .bind('xyz')
      .to('XYZ')
      .tag('foo');
    expect(bindingTracker.bindings).to.containEql(xyzBinding);
    // `abc` does not have the matching tag
    expect(bindingTracker.bindings).to.not.containEql(abcBinding);
    expect(await bindingTracker.values()).to.eql(['BAR', 'XYZ', 'FOO']);
  });

  it('reloads bindings if context bindings are removed', async () => {
    bindingTracker.watch();
    ctx.unbind('bar');
    expect(await bindingTracker.values()).to.eql(['FOO']);
  });

  it('reloads bindings if context bindings are rebound', async () => {
    bindingTracker.watch();
    ctx.bind('bar').to('BAR'); // No more tagged with `foo`
    expect(await bindingTracker.values()).to.eql(['FOO']);
  });

  it('reloads bindings if parent context bindings are added', async () => {
    bindingTracker.watch();
    const xyzBinding = ctx
      .parent!.bind('xyz')
      .to('XYZ')
      .tag('foo');
    expect(bindingTracker.bindings).to.containEql(xyzBinding);
    expect(await bindingTracker.values()).to.eql(['BAR', 'FOO', 'XYZ']);
  });

  it('reloads bindings if parent context bindings are removed', async () => {
    bindingTracker.watch();
    ctx.parent!.unbind('foo');
    expect(await bindingTracker.values()).to.eql(['BAR']);
  });

  function givenBindingTracker() {
    bindings = [];
    ctx = givenContext(bindings);
    bindingTracker = new BindingTracker(ctx, Context.bindingTagFilter('foo'));
  }
});

describe('@inject.filter', async () => {
  let ctx: Context;
  beforeEach(() => (ctx = givenContext()));

  class MyControllerWithGetter {
    @inject.filter(Context.bindingTagFilter('foo'), {watch: true})
    getter: Getter<string[]>;
  }

  class MyControllerWithValues {
    constructor(
      @inject.filter(Context.bindingTagFilter('foo'))
      public values: string[],
    ) {}
  }

  class MyControllerWithTracker {
    @inject.filter(Context.bindingTagFilter('foo'))
    tracker: BindingTracker<string[]>;
  }

  it('injects as getter', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithGetter);
    const inst = await ctx.get<MyControllerWithGetter>('my-controller');
    const getter = inst.getter;
    expect(getter).to.be.a.Function();
    expect(await getter()).to.eql(['BAR', 'FOO']);
    // Add a new binding that matches the filter
    ctx
      .bind('xyz')
      .to('XYZ')
      .tag('foo');
    // The getter picks up the new binding
    expect(await getter()).to.eql(['BAR', 'XYZ', 'FOO']);
  });

  it('injects as values', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithValues);
    const inst = await ctx.get<MyControllerWithValues>('my-controller');
    expect(inst.values).to.eql(['BAR', 'FOO']);
  });

  it('injects as a tracker', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithTracker);
    const inst = await ctx.get<MyControllerWithTracker>('my-controller');
    expect(inst.tracker).to.be.instanceOf(BindingTracker);
    expect(await inst.tracker.values()).to.eql(['BAR', 'FOO']);
    // Add a new binding that matches the filter
    ctx
      .bind('xyz')
      .to('XYZ')
      .tag('foo');
    // The tracker picks up the new binding
    expect(await inst.tracker.values()).to.eql(['BAR', 'XYZ', 'FOO']);
  });
});

function givenContext(bindings: Binding[] = []) {
  const parent = new Context('app');
  const ctx = new Context(parent, 'server');
  bindings.push(
    ctx
      .bind('bar')
      .toDynamicValue(() => Promise.resolve('BAR'))
      .tag('foo', 'bar')
      .inScope(BindingScope.SINGLETON),
  );
  bindings.push(
    parent
      .bind('foo')
      .to('FOO')
      .tag('foo', 'bar'),
  );
  return ctx;
}
