import { Request, RequestOptionsArgs } from '@angular/http';

import { InterceptorRequest } from './interceptor-request';
import { InterceptorRequestBuilder } from './interceptor-request-builder';
import { InterceptorUtils } from './interceptor-utils';

export class InterceptorRequestInternal extends InterceptorRequest {

  get shortCircuitAtCurrentStep(): boolean {
    return this._shortCircuitAtCurrentStep;
  }

  get alsoForceRequestCompletion(): boolean {
    return this._alsoForceRequestCompletion;
  }

  get alreadyShortCircuited(): boolean {
    return this._alreadyShortCircuited;
  }

  get shortCircuitTriggeredBy(): number {
    return this._shortCircuitTriggeredBy;
  }

  get err(): any {
    return this._err;
  }

  get errEncounteredAt(): number {
    return this._errEncounteredAt;
  }

}
