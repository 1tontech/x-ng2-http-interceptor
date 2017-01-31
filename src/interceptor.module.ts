import { ConnectionBackend, RequestOptions } from '@angular/http';
import { NgModule, ModuleWithProviders } from '@angular/core';

import { InterceptorService } from './interceptor-service';

export function provideInterceptorService(backend: ConnectionBackend, defaultOptions: RequestOptions) {
  return new InterceptorService(backend, defaultOptions);
}

@NgModule({
  providers: [
    {
      provide: InterceptorService,
      useFactory: provideInterceptorService,
      deps: [ConnectionBackend, RequestOptions]
    }
  ]
})
export class InterceptorModule { }
