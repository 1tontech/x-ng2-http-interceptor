import { Request, RequestOptionsArgs, Response } from '@angular/http';

import { InterceptorRequest } from './interceptor-request';
import { InterceptorUtils } from './interceptor-utils';
import { InterceptorRequestBuilder } from './interceptor-request-builder';

/**
 * !!INTERNAL USE ONLY!!
 * Utility builder for creating a new instance of _InterceptorRequest with additional ability to set internal properties aswell
 * Use InterceptorRequestBuilderInternal.new() to instantiate the builder
 */
export class InterceptorRequestBuilderInternal extends InterceptorRequestBuilder {

  static new(request?: InterceptorRequest) {
    const builder = new InterceptorRequestBuilderInternal();
    InterceptorUtils.assign(builder, <InterceptorRequest>request);
    return builder;
  }

  /**
   * Use InterceptorRequestBuilderInternal.new() to instantiate the builder
   */
  protected constructor() {
    super();
  }

  url(url: string | Request) {
    super.url(url);
    return this;
  }

  options(options: RequestOptionsArgs) {
    super.options(options);
    return this;
  }

  sharedData(sharedData: any) {
    super.sharedData(sharedData);
    return this;
  }

  shortCircuitAtCurrentStep(shortCircuitAtCurrentStep: boolean) {
    super.shortCircuitAtCurrentStep(shortCircuitAtCurrentStep);
    return this;
  }

  alsoForceRequestCompletion(alsoForceRequestCompletion: boolean) {
    super.alsoForceRequestCompletion(alsoForceRequestCompletion);
    return this;
  }

  alreadyShortCircuited(alreadyShortCircuited: boolean) {
    this._alreadyShortCircuited = alreadyShortCircuited;
    return this;
  }

  shortCircuitTriggeredBy(shortCircuitTriggeredBy: number) {
    this._shortCircuitTriggeredBy = shortCircuitTriggeredBy;
    return this;
  }

  err(err: any) {
    this._err = err;
    return this;
  }

  errEncounteredAt(errEncounteredAt: number) {
    this._errEncounteredAt = errEncounteredAt;
    return this;
  }

  getUrl(): string | Request {
    return this._url;
  }

  getOptions(): RequestOptionsArgs {
    return this._options;
  }

  getSharedData(): any {
    return this._sharedData;
  }

  getShortCircuitAtCurrentStep(): boolean {
    return this._shortCircuitAtCurrentStep;
  }

  getAlsoForceRequestCompletion(): boolean {
    return this._alsoForceRequestCompletion;
  }

  getAlreadyShortCircuited(): boolean {
    return this._alreadyShortCircuited;
  }

  getShortCircuitTriggeredBy(): number {
    return this._shortCircuitTriggeredBy;
  }

  getErr(): any {
    return this._err;
  }

  getErrEncounteredAt(): number {
    return this._errEncounteredAt;
  }

}
