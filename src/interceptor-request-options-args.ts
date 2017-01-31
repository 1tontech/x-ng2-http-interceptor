import { RequestOptionsArgs } from '@angular/http';

/**
 * Adds additional data required to be used by the interceptors along the chain
 */
export interface InterceptorRequestOptionsArgs extends RequestOptionsArgs {
  sharedData?: any;
}
