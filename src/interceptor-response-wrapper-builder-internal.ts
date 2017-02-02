import { InterceptorRequestInternal } from './interceptor-request-internal';
import { Request, RequestOptionsArgs, Response } from '@angular/http';

import { InterceptorRequest } from './interceptor-request';
import { InterceptorRequestOptionsArgs } from './interceptor-request-options-args';
import { InterceptorResponseWrapper } from './interceptor-response-wrapper';
import { InterceptorResponseWrapperBuilder } from './interceptor-response-wrapper-builder';
import { InterceptorUtils } from './interceptor-utils';

/**
 * !!INTERNAL USE ONLY!!
 * Utility builder for creating a new instance of InterceptorResponseWrapper with additional ability to set internal properties aswell
 * Use InterceptorResponseWrapperBuilderInternal.new() to instantiate the builder
 */
export class InterceptorResponseWrapperBuilderInternal extends InterceptorResponseWrapperBuilder {

  static newInternal(interceptorStep: number, from?: Response | InterceptorResponseWrapper | InterceptorRequestInternal) {
    const builder = new InterceptorResponseWrapperBuilderInternal();
    if (from instanceof Response) {
      builder._response = from;
    } else if (from instanceof InterceptorResponseWrapper) {
      InterceptorUtils.assign(builder, <InterceptorResponseWrapper>from);
    } else {
      const request: InterceptorRequestInternal = new InterceptorRequestInternal();
      InterceptorUtils.assign(request, from);
      InterceptorUtils.assign(builder, from);
      if (request.getShortCircuitAtCurrentStep()) {
        builder.shortCircuitTriggeredBy(interceptorStep - 1)
          .forceRequestCompletion(request.getAlsoForceRequestCompletion());
      }
    }
    return builder;
  }

  /**
   * Use InterceptorResponseWrapperBuilderInternal.new() to instantiate the builder
   */
  protected constructor() {
    super();
  }

  url(url: string | Request) {
    this._url = url;
    return this;
  }

  options(options: RequestOptionsArgs | InterceptorRequestOptionsArgs) {
    this._options = options;
    return this;
  }

  response(response: Response | undefined) {
    if (response) {
      super.response(response);
    }
    return this;
  }

  sharedData(sharedData: any) {
    super.sharedData(sharedData);
    return this;
  }

  shortCircuitTriggeredBy(shortCircuitTriggeredBy: number) {
    this._shortCircuitTriggeredBy = shortCircuitTriggeredBy;
    return this;
  }

  forceReturnResponse(forceReturnResponse: boolean) {
    super.forceReturnResponse(forceReturnResponse);
    return this;
  }

  forceRequestCompletion(forceRequestCompletion: boolean) {
    super.forceRequestCompletion(forceRequestCompletion);
    return this;
  }

  responseGeneratedByShortCircuitHandler(responseGeneratedByShortCircuitHandler: boolean) {
    this._responseGeneratedByShortCircuitHandler = responseGeneratedByShortCircuitHandler;
    return this;
  }

  err(err: any) {
    super.err(err);
    return this;
  }

  errEncounteredAt(errEncounteredAt: number) {
    this._errEncounteredAt = errEncounteredAt;
    return this;
  }

  errEncounteredInRequestCycle(errEncounteredInRequestCycle: boolean) {
    this._errEncounteredInRequestCycle = errEncounteredInRequestCycle;
    return this;
  }

}
