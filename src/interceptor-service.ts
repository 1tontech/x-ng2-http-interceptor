import { InterceptorRequestInternal } from './interceptor-request-internal';
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

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/mergeMap';

import { HttpDirect } from './http-direct';
import { InterceptorRequest } from './interceptor-request';
import { InterceptorResponseWrapper } from './interceptor-response-wrapper';
import { Interceptor } from './interceptor';
import { InterceptorRequestOptionsArgs } from './interceptor-request-options-args';
import { InterceptorRequestBuilderInternal } from './interceptor-request-builder-internal';
import { InterceptorRequestBuilder } from './interceptor-request-builder';
import { InterceptorResponseWrapperBuilderInternal } from './interceptor-response-wrapper-builder-internal';
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
 * 1. For each of the listed interceptor, tranforms the request by invoking\
 *  `beforeRequest(..)` on each interceptor in the same order they are added
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
    if (!options) {
      interceptorOptions = {};
    } else if (this.representsInterceptorFlavor(options)) {
      interceptorOptions = options;
    } else {
      interceptorOptions = InterceptorUtils.from(options);
    }
    interceptorOptions.headers = interceptorOptions.headers || new Headers();

    const request = InterceptorRequestBuilderInternal.new()
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
      .flatMap<InterceptorRequest, InterceptorResponseWrapper>((transformedRequest: InterceptorRequest, _: number) => {
        const transformedRequestInternal = <InterceptorRequestInternal>transformedRequest;
        const interceptorRequestInternalBuilder = InterceptorRequestBuilderInternal.new(transformedRequestInternal);

        if (interceptorRequestInternalBuilder.getErr() || interceptorRequestInternalBuilder.getAlreadyShortCircuited()) {
          const responseWrapper = InterceptorResponseWrapperBuilderInternal
            .newInternal(this.interceptors.length, transformedRequestInternal)
            .build();
          return Observable.of(responseWrapper);
        } else if (interceptorRequestInternalBuilder.getShortCircuitAtCurrentStep()) {
          const responseWrapper = InterceptorResponseWrapperBuilderInternal
            .newInternal(this.interceptors.length, transformedRequestInternal)
            .build();
          return Observable.of(responseWrapper);
        }

        let response$ = super.request(transformedRequest.url, transformedRequest.options);
        if (this._realResponseObservableTransformer) {
          response$ = this._realResponseObservableTransformer.tranform(response$, transformedRequest, new this.HttpDirect(), this);
        }

        return response$.map((response: Response) => {
          return InterceptorResponseWrapperBuilderInternal
            .newInternal(this.interceptors.length, transformedRequestInternal)
            .response(response)
            .build();
        }).catch(err => {
          const responseBuilder = InterceptorResponseWrapperBuilderInternal
            .newInternal(this.interceptors.length, transformedRequestInternal)
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

    for (let index = 0; index < this.interceptors.length; index++) {
      const interceptor: Interceptor = this.interceptors[index];

      request$ = request$
        .flatMap<InterceptorRequest, InterceptorRequest>((request: InterceptorRequest, _: number) => {
          const requestInternalBuilder = InterceptorRequestBuilderInternal.new(request);

          if (requestInternalBuilder.getErr() || requestInternalBuilder.getAlreadyShortCircuited()) {
            return Observable.of(request);
          } else if (requestInternalBuilder.getShortCircuitAtCurrentStep()) {
            const requestBuilder = InterceptorRequestBuilderInternal.new(request)
              .shortCircuitAtCurrentStep(false)
              .shortCircuitTriggeredBy(index - 1) // since the last interceptor requested for short circuit
              .alreadyShortCircuited(true);
            return Observable.of(requestBuilder.build());
          }

          if (interceptor.beforeRequest !== undefined) {
            const processedRequest = interceptor.beforeRequest(request, index);
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
                const responseBuilder = InterceptorRequestBuilderInternal.new(request)
                  .err(err)
                  .errEncounteredAt(index);
                return Observable.of(responseBuilder.build());
              });
          }
          return Observable.of(request);
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
      startFrom = this.interceptors.length - 1;
    }

    // If error occurred when making actual server call, lets start from last interceptor in the chain
    if (startFrom === this.interceptors.length) {
      startFrom = this.interceptors.length - 1;
    }

    for (let index = startFrom; index >= 0; index--) {
      const interceptor: Interceptor = this.interceptors[index];

      responseWrapper$ = responseWrapper$
        .flatMap<InterceptorResponseWrapper, InterceptorResponseWrapper>(
        (transformedResponseWrapper: InterceptorResponseWrapper, _: any) => {
          if (transformedResponseWrapper.forceRequestCompletion) {
            if (interceptor.onForceCompleteOrForceReturn !== undefined) {
              interceptor.onForceCompleteOrForceReturn(transformedResponseWrapper, index);
            }
            if (index === 0) { // complete the observable, since this is the first interceptor (last in the response chain)
              return Observable.empty();
            } else { // let `onForceCompleteOrForceReturn` on the interceptors be run
              return Observable.of(transformedResponseWrapper);
            }
          } else if (transformedResponseWrapper.forceReturnResponse) {
            if (interceptor.onForceCompleteOrForceReturn !== undefined) {
              interceptor.onForceCompleteOrForceReturn(transformedResponseWrapper, index);
            }
            return Observable.of(transformedResponseWrapper);
          }

          let processedResponse: void | InterceptorResponseWrapper | Observable<InterceptorResponseWrapper>;

          if (transformedResponseWrapper.err) {
            if (interceptor.onErr !== undefined) {
              processedResponse = interceptor.onErr(transformedResponseWrapper, index);
            }
          } else if (transformedResponseWrapper.isShortCircuited()) {
            if (interceptor.onShortCircuit !== undefined) {
              processedResponse = interceptor.onShortCircuit(transformedResponseWrapper, index);
            }
          } else if (interceptor.onResponse !== undefined) {
            processedResponse = interceptor.onResponse(transformedResponseWrapper, index);
          }

          let procesedResponseWrapper$: Observable<InterceptorResponseWrapper>;

          if (!processedResponse) {
            procesedResponseWrapper$ = Observable.of(transformedResponseWrapper);
          } else if (processedResponse instanceof InterceptorResponseWrapper) {
            procesedResponseWrapper$ = Observable.of(processedResponse as InterceptorResponseWrapper);
          } else {
            procesedResponseWrapper$ = processedResponse as Observable<InterceptorResponseWrapper>;
          }

          return procesedResponseWrapper$
            .catch((err: any, __: Observable<InterceptorResponseWrapper>) => {
              const responseBuilder = InterceptorResponseWrapperBuilderInternal.newInternal(index, transformedResponseWrapper)
                .err(err)
                .errEncounteredAt(index)
                .errEncounteredInRequestCycle(false);
              return Observable.of(responseBuilder.build());
            });
        });
    }

    return responseWrapper$;
  }

  /**
   * Tests whether the passed in object represents interceptor version/native request options
   */
  private representsInterceptorFlavor(options: RequestOptionsArgs | InterceptorRequestOptionsArgs):
    options is InterceptorRequestOptionsArgs {
    return (<InterceptorRequestOptionsArgs>options).sharedData !== undefined
      && (<InterceptorRequestOptionsArgs>options).sharedData !== null;
  }

  /**
   * Returns an implementation that mirrors angular `Http` interface;
   * This interface allows the response transformers to make calls directly to HTTP calls
   * without being interceted by {@code InterceptorService}; i.e `this`
   */
  private get HttpDirect() {
    const interceptorService = this;

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
