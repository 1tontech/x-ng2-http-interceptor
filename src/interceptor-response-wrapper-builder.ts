import { Request, RequestOptionsArgs, Response } from '@angular/http';

import { InterceptorRequestOptionsArgs } from './interceptor-request-options-args';
import { InterceptorResponseWrapper } from './interceptor-response-wrapper';
import { InterceptorUtils } from './interceptor-utils';

/**
 * Utility builder for creating a new instance of InterceptorResponseWrapper
 * Use InterceptorResponseBuilder.new() to instantiate the builder
 */
export class InterceptorResponseWrapperBuilder {

  protected _url: string | Request;
  protected _options?: RequestOptionsArgs | InterceptorRequestOptionsArgs;
  protected _response: Response;
  protected _sharedData?: any;
  protected _shortCircuitTriggeredBy?: number;
  protected _forceReturnResponse?: boolean;
  protected _forceRequestCompletion?: boolean;
  protected _responseGeneratedByShortCircuitHandler?: boolean;
  protected _err?: any;
  protected _errEncounteredAt?: number;
  protected _errEncounteredInRequestCycle?: boolean;

  static new(response: Response | InterceptorResponseWrapper): InterceptorResponseWrapperBuilder {
    const builder = new InterceptorResponseWrapperBuilder();
    if (response instanceof Response) {
      builder._response = response;
    } else if (response) {
      InterceptorUtils.assign(builder, <InterceptorResponseWrapper>response);
    }
    return builder;
  }

  /**
   * Use InterceptorResponseBuilder.new() to instantiate the builder
   */
  protected constructor() { }

  response(response: Response): InterceptorResponseWrapperBuilder {
    this._response = response;
    return this;
  }

  sharedData(sharedData: any): InterceptorResponseWrapperBuilder {
    this._sharedData = sharedData;
    return this;
  }

  forceReturnResponse(forceReturnResponse: boolean): InterceptorResponseWrapperBuilder {
    this._forceReturnResponse = forceReturnResponse;
    return this;
  }

  forceRequestCompletion(forceRequestCompletion: boolean): InterceptorResponseWrapperBuilder {
    this._forceRequestCompletion = forceRequestCompletion;
    return this;
  }

  err(err: any): InterceptorResponseWrapperBuilder {
    this._err = err;
    return this;
  }

  build(): InterceptorResponseWrapper {
    this._sharedData = this._sharedData || {};
    return new InterceptorResponseWrapper(this);
  }

}
