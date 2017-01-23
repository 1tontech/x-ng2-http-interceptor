import {
  ConnectionBackend,
  Headers,
  Http,
  Request,
  Response,
  ResponseOptions,
  RequestMethod,
  RequestOptions,
  RequestOptionsArgs
} from '@angular/http';

import { Observable } from 'rxjs/Rx';

import { HttpDirect } from './http-direct';
import { InterceptorRequest } from './interceptor-request';
import { InterceptorResponseWrapper } from './interceptor-response-wrapper';
import { Interceptor } from './interceptor';
import { InterceptorRequestOptionsArgs } from './interceptor-request-options-args';
import { InterceptorRequestBuilder } from './interceptor-request-builder';
import { InterceptorResponseWrapperBuilder } from './interceptor-response-wrapper-builder';
import { InterceptorUtils } from './interceptor-utils';
import { RealResponseObservableTransformer } from './real-response-observable-transformer';

/**
 * Wrapper around native angular `Http` service.
 * Allows you to add `Interceptor`s that lets you do
 * 1. Transform request before it reaches the actual request, such as, add headers transparently
 * 2. Transform response, such as stripout the top level object & return the payload (or) raise errors if `response.status` is not `ok`
 * 3. To short circuit the request flow based on runtime data
 * 4. To selective caching/log request/responses
 * 5. Augment the real `Observable<Response>` that native angular `http.request(..)` returns
 * 6. Store intermediate data that can be shared across the interceptors
 * 7. Generate handcrafted response incase of error/base of your runtime decision
 *
 * The service executes methods in the interceptor chain in the following manner
 * 1. For each of the listed interceptor, tranforms the request by invoking `beforeRequest(..)` on each interceptor in the same order they are added
 * 2. Invokes native angular `http.request(..)` with the result of last interceptor's `beforeRequest(..)` response
 * 3. Invokes `onResponse(..)` on each interceptor in the reverse order they are added
 * 4. The response from `onResponse(..)` of the final interceptor in the chain would be sent to subscriber
 */
export class InterceptorService extends Http {

  private interceptors: Array<Interceptor>;
  private _realResponseObservableTransformer: RealResponseObservableTransformer;

  constructor(backend: ConnectionBackend, defaultOptions: RequestOptions) {
    super(backend, defaultOptions);
    this.interceptors = [];
  }

  /** Parent overrides **/
  request(url: string | Request, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    let interceptorOptions: InterceptorRequestOptionsArgs;
    if (options) {
      interceptorOptions = {};
    } else if (this.representsInterceptorFlavor(options)) {
      interceptorOptions = options;
    } else {
      interceptorOptions = InterceptorUtils.from(options);
    }
    interceptorOptions.headers = interceptorOptions.headers || new Headers();

    const request = InterceptorService._InterceptorRequestBuilder.new()
      .url(url)
      .options(interceptorOptions)
      .sharedData(interceptorOptions.sharedData || {})
      .build();
    return this.httpRequest(request);
  }

  /**
   * Performs a request with `get` http method.
   */
  get(url: string, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    options = options || {};
    options.method = RequestMethod.Get;
    options.url = options.url || url;
    return this.request(url, options);
  }

  /**
   * Performs a request with `post` http method.
   */
  post(url: string, body: any, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    options = options || {};
    options.method = RequestMethod.Post;
    options.url = options.url || url;
    options.body = options.body || body;
    return this.request(url, options);
  }

  /**
   * Performs a request with `put` http method.
   */
  put(url: string, body: any, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    options = options || {};
    options.method = RequestMethod.Put;
    options.url = options.url || url;
    options.body = options.body || body;
    return this.request(url, options);
  }

  /**
   * Performs a request with `delete` http method.
   */
  delete(url: string, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    options = options || {};
    options.method = RequestMethod.Delete;
    options.url = options.url || url;
    return this.request(url, options);
  }

  /**
   * Performs a request with `patch` http method.
   */
  patch(url: string, body: any, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    options = options || {};
    options.method = RequestMethod.Patch;
    options.url = options.url || url;
    options.body = options.body || body;
    return this.request(url, options);
  }

  /**
   * Performs a request with `head` http method.
   */
  head(url: string, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    options = options || {};
    options.method = RequestMethod.Head;
    options.url = options.url || url;
    return this.request(url, options);
  }

  /**
   * Performs a request with `options` http method.
   */
  options(url: string, options?: RequestOptionsArgs | InterceptorRequestOptionsArgs): Observable<Response> {
    options = options || {};
    options.method = RequestMethod.Options;
    options.url = options.url || url;
    return this.request(url, options);
  }

  /**
   * Appends this interceptor to the list of interceptors
   */
  addInterceptor(interceptor: Interceptor) {
    this.interceptors.push(interceptor);
  }

  /**
   * Sets response transformer
   */
  set realResponseObservableTransformer(value: RealResponseObservableTransformer) {
    this._realResponseObservableTransformer = value;
  }

  /** Private functions **/
  private httpRequest(request: InterceptorRequest): Observable<Response> {
    return this.runBeforeInterceptors(request)
      .flatMap<InterceptorRequest, InterceptorResponseWrapper>((request: InterceptorRequest, _: number) => {
        let interceptorRequestInternal = new InterceptorService._InterceptorRequestBuilder(request);

        if (interceptorRequestInternal.err || interceptorRequestInternal.alreadyShortCircuited) {
          return Observable.of(request);
        } else if (interceptorRequestInternal.shortCircuitAtCurrentStep) {
          if (interceptorRequestInternal.alsoForceRequestCompletion) {
            return Observable.empty();
          } else if (!interceptorRequestInternal.alreadyShortCircuited) {
            let requestBuilder = InterceptorService._InterceptorRequestBuilder.new(request)
              .shortCircuitAtCurrentStep(false)
              .shortCircuitTriggeredBy(this.interceptors.length - 1) // since the last interceptor in the chain asked for short circuiting
              .alreadyShortCircuited(true);
            return Observable.of(requestBuilder.build());
          } else {
            return Observable.of(request);
          }
        }

        let response$ = super.request(request.url, request.options);
        if (this._realResponseObservableTransformer) {
          response$ = this._realResponseObservableTransformer.tranform(response$, request, new this.HttpDirect(), this);
        }

        return response$.map((response: Response) => {
          return InterceptorService._InterceptorResponseWrapperBuilder.new(request)
            .response(response)
            .build();
        }).catch(err => {
          let responseBuilder = InterceptorService._InterceptorResponseWrapperBuilder.new(request)
            .err(err)
            .errEncounteredAt(this.interceptors.length)
            .errEncounteredInRequestCycle(true);
          return Observable.of(responseBuilder.build());
        });
      })
      .flatMap((responseWrapper: InterceptorResponseWrapper, index: number) => {
        return this.runAfterInterceptors(responseWrapper);
      })
      .flatMap((responseWrapper: InterceptorResponseWrapper, index: number) => {
        if (!responseWrapper.response) {
          if (responseWrapper.err) {
            return Observable.throw(responseWrapper.err);
          } else if (responseWrapper.isShortCircuited()) {
            return Observable.throw(new Error('Short circuit was triggered, but no short circuit handlers generated any resonse'));
          } else {
            return Observable.throw(new Error('Response is empty'));
          }
        }
        return Observable.of(responseWrapper.response);
      });
  }

  private runBeforeInterceptors(params: InterceptorRequest): Observable<InterceptorRequest> {
    let request$: Observable<InterceptorRequest> = Observable.of(params);

    for (let i: number = 0; i < this.interceptors.length; i++) {
      let interceptor: Interceptor = this.interceptors[i];
      if (!interceptor.beforeRequest) {
        continue;
      }

      request$ = request$
        .flatMap<InterceptorRequest, InterceptorRequest>((request: InterceptorRequest, index: number) => {
          let requestInternal = new InterceptorService._InterceptorRequestBuilder(request);

          if (requestInternal.err || requestInternal.alreadyShortCircuited) {
            return Observable.of(request);
          } else if (requestInternal.shortCircuitAtCurrentStep) {
            if (requestInternal.alsoForceRequestCompletion) {
              return Observable.empty();
            } else if (!requestInternal.alreadyShortCircuited) {
              let requestBuilder = InterceptorService._InterceptorRequestBuilder.new(request)
                .shortCircuitAtCurrentStep(false)
                .shortCircuitTriggeredBy(this.interceptors.length - 1) // since the last interceptor in the chain asked for short circuiting
                .alreadyShortCircuited(true);
              return Observable.of(requestBuilder.build());
            } else {
              return Observable.of(request);
            }
          }

          let processedRequest = interceptor.beforeRequest(request);
          let processedRequest$: Observable<InterceptorRequest>;

          if (!processedRequest) { // if no request is returned; just proceed with the original request
            processedRequest$ = Observable.of(request);
          } else if (processedRequest instanceof Observable) {
            processedRequest$ = <Observable<InterceptorRequest>>processedRequest;
          } else {
            processedRequest$ = Observable.of(<InterceptorRequest>processedRequest);
          }
          return processedRequest$
            .catch((err: any, caught: Observable<InterceptorRequest>) => {
              let responseBuilder = InterceptorService._InterceptorRequestBuilder.new(request)
                .err(err)
                .errEncounteredAt(i);
              return Observable.of(responseBuilder.build());
            });
        });
    }

    return request$;
  }

  private runAfterInterceptors(responseWrapper: InterceptorResponseWrapper): Observable<InterceptorResponseWrapper> {
    let responseWrapper$: Observable<InterceptorResponseWrapper> = Observable.of(responseWrapper);

    let startFrom: number;
    if (responseWrapper.err) {
      startFrom = responseWrapper.errEncounteredAt;
    } else if (responseWrapper.isShortCircuited()) {
      startFrom = responseWrapper.shortCircuitTriggeredBy;
    } else {
      this.interceptors.length - 1;
    }

    for (let index = startFrom; index >= 0; index--) {
      let interceptor: Interceptor = this.interceptors[index];
      if (!interceptor.onResponse) {
        continue;
      }

      responseWrapper$ = responseWrapper$
        .flatMap<InterceptorResponseWrapper, InterceptorResponseWrapper>((responseWrapper: InterceptorResponseWrapper, _: any) => {
          if (responseWrapper.forceRequestCompletion) {
            return Observable.empty();
          } else if (responseWrapper.forceReturnResponse) {
            return Observable.of(responseWrapper);
          }

          let processedResponse;

          const invokeErrHandler = responseWrapper.err && !responseWrapper.response;
          const invokeShortCircuitHandler = responseWrapper.isShortCircuited() && !responseWrapper.response;

          if (invokeErrHandler) {
            processedResponse = interceptor.onErr(responseWrapper);
          } else if (invokeShortCircuitHandler) {
            processedResponse = interceptor.onShortCircuit(responseWrapper, index);
          } else {
            processedResponse = interceptor.onResponse(responseWrapper, index);
          }

          let procesedResponseWrapper$: Observable<InterceptorResponseWrapper>;

          if (!processedResponse) {
            procesedResponseWrapper$ = Observable.of(responseWrapper);
          } else if (processedResponse instanceof InterceptorResponseWrapper) {
            procesedResponseWrapper$ = Observable.of(processedResponse as InterceptorResponseWrapper);
          } else {
            procesedResponseWrapper$ = processedResponse as Observable<InterceptorResponseWrapper>;
          }

          return procesedResponseWrapper$
            .catch((err: any, _: Observable<InterceptorResponseWrapper>) => {
              let responseBuilder = InterceptorService._InterceptorResponseWrapperBuilder.new(responseWrapper)
                .response(undefined)
                .err(err)
                .errEncounteredAt(index)
                .errEncounteredInRequestCycle(false);
              return Observable.of(responseBuilder.build());
            })
        });
    }

    return responseWrapper$;
  }

  /**
   * Tests whether the passed in object represents interceptor version/native request options
   */
  private representsInterceptorFlavor(options: RequestOptionsArgs | InterceptorRequestOptionsArgs): options is InterceptorRequestOptionsArgs {
    return (<InterceptorRequestOptionsArgs>options).sharedData !== undefined;
  }

  /**
   * Class that exposes internal variables of InterceptorRequest for internal use
   */
  private static _InterceptorRequest = class extends InterceptorRequest {

    constructor(request: InterceptorRequest) {
      super(InterceptorRequestBuilder.new(request));
    }

    shortCircuitAtCurrentStep(shortCircuitAtCurrentStep: boolean): boolean {
      return this._shortCircuitAtCurrentStep;
    }

    alsoForceRequestCompletion(alsoForceRequestCompletion: boolean): boolean {
      return this._alsoForceRequestCompletion;
    }

    alreadyShortCircuited(alreadyShortCircuited: boolean): boolean {
      return this._alreadyShortCircuited;
    }

    shortCircuitTriggeredBy(shortCircuitTriggeredBy: number): number {
      return this._shortCircuitTriggeredBy;
    }

    err(err: any): any {
      return this._err;
    }

    errEncounteredAt(errEncounteredAt: number): number {
      return this._errEncounteredAt;
    }

  }

  /**
   * Utility builder for creating a new instance of _InterceptorRequest with additional ability to set internal properties aswell
   * Use _InterceptorRequestBuilder.new() to instantiate the builder
   */
  private static _InterceptorRequestBuilder = class extends InterceptorRequestBuilder {

    /**
     * Use _InterceptorRequestBuilder.new() to instantiate the builder
     */
    protected constructor() {
      super();
    }

    static new(request?: InterceptorRequest) {
      const builder = new InterceptorService._InterceptorRequestBuilder();
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

  /**
   * Utility builder for creating a new instance of InterceptorResponseWrapper with additional ability to set internal properties aswell
   * Use _InterceptorResponseWrapperBuilder.new() to instantiate the builder
   */
  private static _InterceptorResponseWrapperBuilder = class extends InterceptorResponseWrapperBuilder {

    /**
     * Use _InterceptorResponseWrapperBuilder.new() to instantiate the builder
     */
    protected constructor() {
      super();
    }

    static new(from?: Response | InterceptorResponseWrapper | InterceptorRequest) {
      const builder = new InterceptorService._InterceptorResponseWrapperBuilder();
      if (from instanceof Response) {
        builder._response = from;
      } else if (from instanceof InterceptorResponseWrapper) {
        InterceptorUtils.assign(builder, <InterceptorResponseWrapper>from);
      } else {
        InterceptorUtils.assign(builder, <InterceptorRequest>from);
      }
      return builder;
    }

    url(url: string | Request) {
      this._url = url;
      return this;
    }

    options(options: RequestOptionsArgs | InterceptorRequestOptionsArgs) {
      this._options = options;
      return this;
    }

    response(response: Response) {
      super.response(response);
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

  /**
   * Returns an implementation that mirrors angular `Http` interface;
   * This interface allows the response transformers to make calls directly to HTTP calls without being interceted by {@code InterceptorService}; i.e `this`
   */
  private get HttpDirect() {
    let interceptorService = this;

    return class implements HttpDirect {

      request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.requestNative(url, options);
      }

      get(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.getNative(url, options);
      }

      post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.postNative(url, body, options);
      }

      put(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.putNative(url, body, options);
      }

      delete(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.deleteNative(url, options);
      }

      patch(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.patchNative(url, body, options);
      }

      head(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.headNative(url, options);
      }

      options(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return interceptorService.optionsNative(url, options);
      }

    };
  }

  private requestNative(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    return super.request(url, options);
  }

  private getNative(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return super.get(url, options);
  }

  private postNative(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
    return super.post(url, body, options);
  }

  private putNative(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
    return super.put(url, body, options);
  }

  private deleteNative(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return super.delete(url, options);
  }

  private patchNative(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
    return super.patch(url, body, options);
  }

  private headNative(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return super.head(url, options);
  }

  private optionsNative(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return super.options(url, options);
  }

}
