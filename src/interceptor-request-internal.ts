import { Request, RequestOptionsArgs } from '@angular/http';

import { InterceptorRequest } from './interceptor-request';
import { InterceptorRequestBuilder } from './interceptor-request-builder';
import { InterceptorUtils } from './interceptor-utils';

export class InterceptorRequestInternal extends InterceptorRequest {

  /**
   * Hack
   * TODO: Point to typescript bug
   */
  constructor() {
    super(null);
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
