import { Request, RequestOptionsArgs, Response } from '@angular/http';

import { InterceptorRequest } from "./interceptor-request";
import { InterceptorUtils } from './interceptor-utils';
import { InterceptorRequestBuilder } from './interceptor-request-builder';

/**
 * !!INTERNAL USE ONLY!!
 * Utility builder for creating a new instance of _InterceptorRequest with additional ability to set internal properties aswell
 * Use _InterceptorRequestBuilder.new() to instantiate the builder
 */
export class _InterceptorRequestBuilder extends InterceptorRequestBuilder {

  /**
   * Use _InterceptorRequestBuilder.new() to instantiate the builder
   */
  protected constructor() {
    super();
  }

  static new(request?: InterceptorRequest) {
    const builder = new _InterceptorRequestBuilder();
    InterceptorUtils.assign(builder, <InterceptorRequest>request);
    return builder;
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

}
