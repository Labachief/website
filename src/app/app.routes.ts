import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';
import { Login } from './login/login';
import { OrderCreate } from './order-create/order-create';
import { OrderDetail } from './order-detail/order-detail';
import { OrderShipment } from './order-shipment/order-shipment';
import { Orders } from './orders/orders';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: '',
    component: Orders,
    canActivate: [authGuard],
  },
  {
    path: 'orders/create',
    component: OrderCreate,
    canActivate: [authGuard],
  },
  {
    path: 'orders/:number/detail',
    component: OrderDetail,
    canActivate: [authGuard],
  },
  {
    path: 'orders/:number/shipment',
    component: OrderShipment,
    canActivate: [authGuard],
  },
  {
    path: 'shipments/:trackingNumber',
    component: OrderShipment,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
