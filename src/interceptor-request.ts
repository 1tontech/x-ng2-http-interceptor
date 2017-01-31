import { Request, RequestOptionsArgs } from '@angular/http';

import { InterceptorRequestBuilder } from './interceptor-request-builder';
import { InterceptorUtils } from './interceptor-utils';

export class InterceptorRequest {

  /**
   * url which will be cascaded to the final {@code Http} call
   */
  protected _url: string | Request;

  /**
   * Request options to be passed to the final {@code Http} call
   */
  protected _options?: RequestOptionsArgs;

  /**
   * Data that gets shared between all interceptors; across request & response cycles<br />
   * i.e before interceptor 1, before interceptor 2, actual http call, after interceptor 2, after interceptor 1 <br />
   * Data should accumulated on the same shared state;\
   *  so be cautious & always make sure that you do neccessary checks such as ${@code sharedData || {}}
   */
  protected _sharedData?: any;

  /**
   * <p>Indicates that subsequent interceptors in the interceptor chain along with actual http call to be skipped\
   *  & proceed with onShortcuit(..)/Observable.complete().</p>
   * <p>If {@code alsoForceRequestCompletion} is set true to true,\
   *  the interceptor chain would invoke onCompleted() on to the subscriber,\
   *  else onShortcuit(..) method would be invoked on the interceptors whose beforeIntercept(..) was called prior to short circuit,\
   *  in the reverse order</p>
   */
  protected _shortCircuitAtCurrentStep?: boolean;

  /**
   * Flag to inform interceptor service to skip all futher steps in the interceptor chain & invoke onCompleted() on the subscriber
   */
  protected _alsoForceRequestCompletion?: boolean;

  /**
   * Indicates that the skip was performed by a ancetor intercetor in the chain, not the last interceptor
   */
  protected _alreadyShortCircuited?: boolean;

  /**
   * Represents the index of the interceptor step that triggered the short circuit.
   * This value is zero indexed, meaning, if first interceptor in the chain has shorted the circuit, this value will be 0
   */
  protected _shortCircuitTriggeredBy?: number;

  /**
   * Any error encountered during processing
   */
  protected _err?: any;

  /**
   * Index of the interceptor that raise err;
   * This value is zero indexed, meaning, if first interceptor throws an err before http request is sent; this value will be 0
   * If error occurs in the actual http request, the value would be set to `interceptors.length`
   */
  protected _errEncounteredAt?: number;

  constructor(builder: InterceptorRequestBuilder) {
    InterceptorUtils.assign(this, builder);
  }

  get url(): string | Request {
    return this._url;
  }

  get options(): RequestOptionsArgs | undefined {
    return this._options;
  }

  get sharedData(): any {
    return this._sharedData;
  }

}
