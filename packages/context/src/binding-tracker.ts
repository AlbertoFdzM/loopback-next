// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Context, BindingFilter} from './context';
import {Binding} from './binding';
import {ResolutionSession} from './resolution-session';
import {resolveList, ValueOrPromise} from './value-promise';
import {Getter} from './inject';

/**
 * Tracking a given context chain to maintain a live list of matching bindings
 * and their resolved values within the context hierarchy.
 *
 * This class is the key utility to implement dynamic extensions for extension
 * points. For example, the RestServer can react to `controller` bindings even
 * they are added/removed/updated after the application starts.
 *
 */
export class BindingTracker<T = unknown> {
  private _cachedBindings: Readonly<Binding<T>>[] | undefined;
  private _cachedValues: ValueOrPromise<T[]> | undefined;

  constructor(private ctx: Context, private filter: BindingFilter) {
    // TODO: [rfeng] We need to listen/observe events emitted by the context
    // chain so that the cache can be refreshed if necessary
  }

  /**
   * Get the list of matched bindings. If they are not cached, it tries to find
   * them from the context.
   */
  get bindings(): Readonly<Binding<T>>[] {
    if (this._cachedBindings == null) {
      this._cachedBindings = this.findBindings();
    }
    return this._cachedBindings;
  }

  /**
   * Find matching bindings and refresh the cache
   */
  findBindings() {
    this._cachedBindings = this.ctx.find(this.filter);
    return this._cachedBindings;
  }

  /**
   * Invalidate the cache
   */
  reset() {
    this._cachedBindings = undefined;
    this._cachedValues = undefined;
  }

  /**
   * Resolve values for the matching bindings
   * @param session
   */
  resolve(session?: ResolutionSession) {
    this._cachedValues = resolveList(this.bindings, b => {
      return b.getValue(this.ctx, ResolutionSession.fork(session));
    });
    return this._cachedValues;
  }

  /**
   * Get the list of resolved values. If they are not cached, it tries tp find
   * and resolve them.
   */
  async values() {
    if (this._cachedValues == null) {
      this._cachedValues = this.resolve();
    }
    return await this._cachedValues;
  }

  /**
   * As a `Getter` function
   */
  asGetter(): Getter<T[]> {
    return () => this.values();
  }
}
