# x-ng4-http-interceptor

[![travis build](https://img.shields.io/travis/1tontech/ngx-http-validators.svg?style=flat-square)](https://travis-ci.org/1tontech/ngx-http-validators)
[![codecov coverage](https://img.shields.io/codecov/c/github/1tontech/ngx-http-validators.svg?style=flat-square)](https://codecov.io/github/1tontech/ngx-http-validators)
[![version](https://img.shields.io/npm/v/ngx-http-validators.svg?style=flat-square)](http://npm.im/ngx-http-validators)
[![downloads](https://img.shields.io/npm/dm/ngx-http-validators.svg?style=flat-square)](http://npm-stat.com/charts.html?package=ngx-http-validators&from=2015-08-01)
[![MIT License](https://img.shields.io/npm/l/ngx-http-validators.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

This package adds the intercepting capabilities to `http` module of Latest version of Angular, by extending the @angular/http class. For concept behind Interceptor, take a look at the [wiki](https://github.com/1tontech/x-ng4-http-interceptor/wiki/Concept)

# Installation

To install, just run in your angular project:

```
npm install x-ng4-http-interceptor --save
```

And it should be importable with webpack out of the box

# Usage
## Set up InterceptorService
Interceptors are registered when the service is created (to avoid any race-condition). To do so, you have to provide the instance of the service by yourself. So on your module declaration, you should put a provider like:

```ts
import { XHRBackend, RequestOptions } from '@angular/http';

import { InterceptorService } from 'x-ng4-http-interceptor';

export function interceptorFactory(xhrBackend: XHRBackend, requestOptions: RequestOptions) {
  let service = new InterceptorService(xhrBackend, requestOptions);
  // Add interceptors here with service.addInterceptor(interceptor)
  return service;
}

@NgModule({
  declarations: [
    ...
  ],
  imports: [
    ...,
    HttpModule
  ],
  providers: [
    {
      provide: InterceptorService,
      useFactory: interceptorFactory,
      deps: [XHRBackend, RequestOptions]
    }
  ],
  bootstrap: [AppComponent]
})
```

## Using InterceptorService
Once we have it set up, we can use it in our Controllers as if we were using the default Angular `Http` service:
```ts
import { Component } from '@angular/core';
import { InterceptorService } from 'x-ng4-http-interceptor';

@Component({
  selector: 'my-component',
  templateUrl: 'my-component.html',
  moduleId: 'my-module'
})
export class MyComponent {

  constructor(
     private http: InterceptorService) {
  }

  ngOnInit(){
    this.http.get("http://www.example.com/").subscribe(
      (res) => console.log(res),
      (err) => console.error(err),
      () => console.log("Yay"));
  }
}
```

We can also "cheat" the Injector so that every time we ask for the `Http` we get the `InterceptorService` instead. All we have to do is replace `InterceptorService` on the provider definition for `Http`, and then we can get our service when we use `private http: Http`:
```ts
{
  provide: Http,
  useFactory: interceptorFactory,
  deps: [XHRBackend, RequestOptions]
}
```

## Creating your own Interceptor
Basically, an interceptor has the option to selectively implement one more of the following methods depending on what part of the flow it wants to intercept. i.e modify flow/take action.

Here is the interceptor interface that details which method is invoked in what part of the flow

```ts
/**
 * Represents an intermediary in the interceptor chain that intercept both HTTP request & response flow
 *
 * Implementors will have the ability to
 * 1. Modify the request the along the chain/perform operations such as logging/caching/tranformations; such as adding a header
 * 2. Modify the response along the chain
 * 3. Intercept errors; Can chose to cascade/generate responses
 * 4. Short circuit complete request flow dynamically based on the dynamic conditions without affecting the actual controller/service
 * 5. Ability to perform custom logic; such as redirecting the users to login page, if the server returns 401, transparantly without polluting all your services
 *
 * NOTE: Never store any data that's request specific as properties on the Interceptor implementation, as the interceptor instance is shared across all http requests within the application. Instead use `InterceptorRequestOptionsArgs.sharedData` (or) `InterceptorRequest.sharedData` (or) `InterceptorResponseWrapper.sharedData` as request private storage
 */
export interface Interceptor {

  /**
   * Invoked once for each of the interceptors in the chain; in the order defined in the chain, unless any of the earlier interceptors asked to complete the flow/return response/throw error to subscriber
   *
   * Gives the ability to transform the request
   */
  beforeRequest?(request: InterceptorRequest, interceptorStep?: number): Observable<InterceptorRequest> | InterceptorRequest | void;

  /**
   * Invoked once for each of the interceptors in the chain; in the reverse order of chain, unless any of the earlier interceptors asked to complete the flow/return response/throw error to subscriber
   *
   * Gives the ability to transform the response in each of the following scenarios
   * 1. For normal response flow; i.e no errors along the chain/no interceptor wanted to short the circuit
   * 2. One of the interceptor indicated to short the circuit & one of the earlier interceptor in chain returned a InterceptorResponseWrapper when its onShortCircuit(..) method is invoked
   * 3. One of the interceptor threw error & one of the earlier interceptor in chain returned a `InterceptorResponseWrapper` when its onErr(..) method is invoked
   *
   * Set any of the following properties of `InterceptorResponseWrapper` to be able to change the way response to sent to subscriber
   * a. `forceReturnResponse` - will send the `Response` to the subscriber directly by skipping all intermediate steps
   * b. `forceRequestCompletion` - will send completion event, so that complete(..) will be invoked on the subscriber
   *
   * You can know if the respons is generated by short circuit handler/err handler, by looking at the `responseGeneratedByShortCircuitHandler` & `responseGeneratedByErrHandler` flags
   */
  onResponse?(response: InterceptorResponseWrapper, interceptorStep?: number): Observable<InterceptorResponseWrapper> | InterceptorResponseWrapper | void;

  /**
   * Invoked once for each of the interceptors in the chain; in the reverse order of chain, if any of the `beforeRequest(..)` responded by setting `shortCircuitAtCurrentStep` property of `InterceptorRequest`
   * Use this method to generate a response that gets sent to the subscriber.
   * If you return nothing, the `onShortCircuit(..) will be cascaded along the interceptor chain
   * If you return an Observable<InterceptorResponseWrapper> | InterceptorResponseWrapper, this rest of the flow would be continued on `onResponse(..)` instead of `onErr(..)` on the next interceptor in the chain & the final result would be sent to the subscriber via next(..) callback
   * If no `onShortCircuit(..)` handlers before this handler returns any response, an error will be thrown back to the subscriber
   */
  onShortCircuit?(response: InterceptorResponseWrapper, interceptorStep?: number): Observable<InterceptorResponseWrapper> | InterceptorResponseWrapper | void;

  /**
   * Invoked when the flow encounters any error along the interceptor chain.
   * Use this method to generate a response that gets sent to the subscriber.
   * If you return nothing, the `onErr(..) will be cascaded along the interceptor chain
   * If you return an Observable<InterceptorResponseWrapper> | InterceptorResponseWrapper, this rest of the flow would be continued on `onResponse(..)` instead of `onErr(..)` on the next interceptor in the chain & the final result would be sent to the subscriber via next(..) callback
   * If no `onErr(..)` handlers before this handler returns any response, the error will be thrown back to the subscriber
   */
  onErr?(err: any): Observable<InterceptorResponseWrapper> | InterceptorResponseWrapper | void;

}
```

One that will get the request that's about to be sent to the server, and another that will get the response that the server just sent. For that, we just need to create a new class that implements Interceptor:

```ts
import { Interceptor, InterceptorRequest, InterceptorResponseWrapper } from 'x-ng4-http-interceptor';

export class ServerURLInterceptor implements Interceptor {
    beforeRequest(request: InterceptorRequest): Observable<InterceptorRequest> | InterceptorRequest | void {
        // Do whatever with request, such as chaing request by adding additional headers such as `Content-Type` (or) `Authorization`
        // refer to jsdoc of each of 'InterceptorRequest' to know the significance of return values & additional features such as short circuiting the whole flow
        let modifiedOptions: RequestOptionsArgs = addHeaders(request.options);
        return InterceptorRequestBuilder.from(request)
          .options(modifiedOptions)
          .build();
    }

    onResponse(responseWrapper: InterceptorResponseWrapper, interceptorStep?: number): Observable<InterceptorResponseWrapper> | InterceptorResponseWrapper | void {
        // Do whatever with responseWrapper: get/edit response
        // refer to jsdoc of each of 'InterceptorResponseWrapper' to know the significance of return values & additional features such as short circuiting the whole flow

        return InterceptorResponseWrapperBuilder.from(responseWrapper)
          .forceReturnResponse(true)
          .build();
    }

    // can chose to seletively implement any of the four hooks mentioned in the Interceptor interface
}
```

All four methods are optional, so you can implement the callback method depending on whether you want to augment the request/response/handling exceptions/handling short circuits

Notice how there's a different object of `InterceptorRequest` and `InterceptedResponseWrapper`.

`InterceptorRequest` is a modification of angular's Http `Request` & `InterceptedResponseWrapper.response` is angular's Http `Response`.

Use `sharedData` to share data across the interceptors for this request. Each http request flow will have its own instance of shared data.
One usecase for this `sharedData` is to store a flag to enable caching for a specific requests, which the cahching interceptor will adhere to.

the API is:

```ts
class InterceptorRequest {
    url: string,
    options?: RequestOptionsArgs, // Angular's HTTP Request options
    sharedData?: any,
    // a lot more properties; refer to jsdoc
}

class InterceptedResponseWrapper {
    response: Response, // Angular's HTTP Response
    sharedData?: any,
    // a lot more properties; refer to jsdoc
}
```
`sharedData` on `InterceptorRequest` is guaranteed to be the same of that one of `InterceptedResponseWrapper` for the same call: The stuff you put in `interceptorOptions` while in `interceptBefore` will be available when you get `onResponse(..)` called.

## Creating one Injectable Interceptor
Interceptors are usually pure classes with pure functions: Given a call, they return a modified one, but sometimes we need these Interceptors to be actual Services to be used all around our application.

For instance, an interceptor that shows a loading spinner every time we have a call has -in some way- to comunicate with the `LoadingComponent` to make the spinner appear/disappear from the screen.

To do that you have to do some steps in the module/factory declaration file:
1. Create a Service (`@Injectable()` annotation) that implements `Interceptor` and the interceptor methods.
2. Define his provider before `InterceptorService`
3. Add it as a parameter to the factory function
4. Add it to the `deps` array. Note that the order of the elements have to match the one on the factory function.
5. Add it to the pipeline

If you are using the `provideInterceptorService` option (without AoT Compiler support), then you can skip steps 2-4.

If our `ServerURLInterceptor` were a Service, we would have a module declaration like:
```ts
import { InterceptorService } from 'x-ng4-http-interceptor';
import { ServerURLInterceptor } from './services/serverURLInterceptor';
import { XHRBackend, RequestOptions } from '@angular/http';

export function interceptorFactory(xhrBackend: XHRBackend, requestOptions: RequestOptions, serverURLInterceptor:ServerURLInterceptor){ // Add it here
  let service = new InterceptorService(xhrBackend, requestOptions);
  service.addInterceptor(serverURLInterceptor); // Add it here
  return service;
}

@NgModule({
  declarations: [
    ...
  ],
  imports: [
    ...,
    HttpModule
  ],
  providers: [
    ServerURLInterceptor, // Add it here
    {
      provide: InterceptorService,
      useFactory: interceptorFactory,
      deps: [XHRBackend, RequestOptions, ServerURLInterceptor] // Add it here, in the same order as the signature of interceptorFactory
    }
  ],
  bootstrap: [AppComponent]
})
```
