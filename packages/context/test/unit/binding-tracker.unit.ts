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
    expect(bindingTracker.bindings).to.not.containEql(abcBinding);
    expect(await bindingTracker.values()).to.eql(['BAR', 'XYZ', 'FOO']);
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

  class MyController {
    @inject.filter(Context.bindingTagFilter('foo'))
    getter: Getter<string[]>;
  }

  class MyControllerWithValues {
    @inject.filter(Context.bindingTagFilter('foo'))
    values: string[];
  }

  class MyControllerWithTracker {
    @inject.filter(Context.bindingTagFilter('foo'))
    tracker: BindingTracker<string[]>;
  }

  it('injects as getter', async () => {
    ctx.bind('my-controller').toClass(MyController);
    const inst = await ctx.get<MyController>('my-controller');
    expect(inst.getter).to.be.a.Function();
    expect(await inst.getter()).to.eql(['BAR', 'FOO']);
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
