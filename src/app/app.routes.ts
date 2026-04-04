import { Routes } from '@angular/router';

import { OrderCreate } from './order-create/order-create';
import { OrderDetail } from './order-detail/order-detail';
import { Orders } from './orders/orders';

export const routes: Routes = [
  {
    path: '',
    component: Orders,
  },
  {
    path: 'orders/create',
    component: OrderCreate,
  },
  {
    path: 'orders/:number/detail',
    component: OrderDetail,
  },
];
