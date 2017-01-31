import { RequestOptionsArgs } from '@angular/http';
import { InterceptorRequestOptionsArgs } from './interceptor-request-options-args';

export class InterceptorUtils {

  static from(options: RequestOptionsArgs): InterceptorRequestOptionsArgs {
    const interceptorRequestOptionsArgs: InterceptorRequestOptionsArgs = {};
    InterceptorUtils.assign(interceptorRequestOptionsArgs, options);
    interceptorRequestOptionsArgs.sharedData = {};
    return interceptorRequestOptionsArgs;
  }

  static assign(target: any, ...args: any[]) {
    if (!target) {
      throw TypeError('Cannot convert undefined or null to object');
    }
    for (const source of args) {
      if (source) {
        Object.keys(source).forEach(key => target[key] = source[key]);
      }
    }
    return target;
  }

  /**
   * Forcing the user to use static methods, as this is a utility class
   */
  private constructor() {
  }

}
