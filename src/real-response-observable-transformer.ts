import { Response } from '@angular/http';

import { Observable } from 'rxjs/Rx';

import { HttpDirect } from './http-direct';
import { InterceptorRequest } from './interceptor-request';
import { InterceptorService } from './interceptor-service';

/**
 * Gives access to the `Observable<Response>` returned by tha angular `Http` api.
 * Can be used augment the real observable
 * Sample Use cases:
 * 1. OAuth2 requires request to be retried with new access token if existing token is expired
 * 2. Allows user to retry the request if the requets is expired due to connection timeout using `Observable.retry`/`Observable.retryWhen`
 */
export interface RealResponseObservableTransformer {
  transform(response$: Observable<Response>,
    request: InterceptorRequest,
    http: HttpDirect,
    interceptorService: InterceptorService): Observable<Response>;
}
