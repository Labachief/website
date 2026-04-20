import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

type CreateOrderModel = {
  order: {
    number: string;
    typeOfBusiness: 'B2B' | 'B2C';
    typeOfOrder: string;
    status: string;
  };
  detail: {
    item: string;
    descriptionOfGoods: string;
    shipper: string;
    por: string;
    shipperPhone: string;
    shipperEmail: string;
    consignee: string;
    pod: string;
    consigneePhone: string;
    consigneeEmail: string;
    trackingNumber: string;
    shippingMethod: string;
    eta: string;
    note: string;
    container: boolean;
    category: string;
    twoWay: boolean;
  };
};

type CreateOrderRequest = {
  createdDate: null;
  detail: {
    consignee: string | null;
    consigneeEmail: string | null;
    consigneePhone: string | null;
    container?: boolean;
    category?: string | null;
    twoWay?: boolean;
    createdDate: null;
    descriptionOfGoods: string | null;
    eta: string | null;
    item: string | null;
    note: string | null;
    orderNumber: number;
    pod: string | null;
    por: string | null;
    shipper: string | null;
    shipperEmail: string | null;
    shipperPhone: string | null;
    shippingMethod: string | null;
    trackingNumber: string | null;
    updatedDate: null;
  };
  invalid: false;
  number: number;
  typeOfBusiness: 'B2B' | 'B2C';
  typeOfOrder: string | null;
  status: string | null;
  updatedDate: null;
};

@Component({
  selector: 'app-order-create',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-create.html',
  styleUrl: './order-create.scss',
})
export class OrderCreate {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  protected submitted = false;
  protected creating = false;
  protected submitError = '';
  protected submitSuccess = '';
  protected payloadPreview = '';

  protected form: CreateOrderModel = this.createInitialForm();

  protected async submit(): Promise<void> {
    console.log('Create order submit clicked. Current form:', this.form);
    this.submitError = '';
    this.submitSuccess = '';

    const orderNumber = Number(this.form.order.number);
    if (!Number.isFinite(orderNumber) || orderNumber <= 0) {
      this.submitError = 'order number 必須是正整數。';
      console.warn('Create order blocked: invalid order number.', this.form.order.number);
      return;
    }

    const payload = this.buildCreateRequest(orderNumber);
    this.payloadPreview = JSON.stringify(payload, null, 2);
    console.log('Create order payload:', payload);

    this.creating = true;
    try {
      const response = await fetch('/api/orders/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      this.submitted = true;
      this.submitSuccess = '建立成功。';
      this.cdr.detectChanges();
      await this.router.navigate(['/orders', orderNumber, 'detail']);
      return;
    } catch (error) {
      console.error('Create order failed:', error);
      this.submitError = '建立失敗，請確認 API 與欄位內容。';
      this.cdr.detectChanges();
    } finally {
      this.creating = false;
      this.cdr.detectChanges();
    }
  }

  protected onBusinessTypeChange(type: 'B2B' | 'B2C'): void {
    if (type === 'B2B') {
      this.form.detail.category = '';
      this.form.detail.container = this.form.detail.container || false;
      this.form.detail.twoWay = false;
      return;
    }

    this.form.detail.container = false;
    this.form.detail.twoWay = this.form.detail.twoWay || false;
  }

  protected reset(): void {
    this.form = this.createInitialForm();
    this.payloadPreview = '';
    this.submitted = false;
    this.submitError = '';
    this.submitSuccess = '';
  }

  protected finish(): void {
    void this.router.navigate(['/']);
  }

  private buildCreateRequest(orderNumber: number): CreateOrderRequest {
    const commonDetail: CreateOrderRequest['detail'] = {
      consignee: this.nullIfEmpty(this.form.detail.consignee),
      consigneeEmail: this.nullIfEmpty(this.form.detail.consigneeEmail),
      consigneePhone: this.nullIfEmpty(this.form.detail.consigneePhone),
      createdDate: null,
      descriptionOfGoods: this.nullIfEmpty(this.form.detail.descriptionOfGoods),
      eta: this.nullIfEmpty(this.form.detail.eta),
      item: this.nullIfEmpty(this.form.detail.item),
      note: this.nullIfEmpty(this.form.detail.note),
      orderNumber,
      pod: this.nullIfEmpty(this.form.detail.pod),
      por: this.nullIfEmpty(this.form.detail.por),
      shipper: this.nullIfEmpty(this.form.detail.shipper),
      shipperEmail: this.nullIfEmpty(this.form.detail.shipperEmail),
      shipperPhone: this.nullIfEmpty(this.form.detail.shipperPhone),
      shippingMethod: this.nullIfEmpty(this.form.detail.shippingMethod),
      trackingNumber: this.nullIfEmpty(this.form.detail.trackingNumber),
      updatedDate: null,
    };

    const detail: CreateOrderRequest['detail'] =
      this.form.order.typeOfBusiness === 'B2B'
        ? {
            ...commonDetail,
            container: this.form.detail.container,
          }
        : {
            ...commonDetail,
            category: this.nullIfEmpty(this.form.detail.category),
            twoWay: this.form.detail.twoWay,
          };

    return {
      createdDate: null,
      detail,
      invalid: false,
      number: orderNumber,
      typeOfBusiness: this.form.order.typeOfBusiness,
      typeOfOrder: this.nullIfEmpty(this.form.order.typeOfOrder),
      status: this.nullIfEmpty(this.form.order.status),
      updatedDate: null,
    };
  }

  private nullIfEmpty(value: string): string | null {
    const v = value.trim();
    return v ? v : null;
  }

  private createInitialForm(): CreateOrderModel {
    return {
      order: {
        number: '',
        typeOfBusiness: 'B2B',
        typeOfOrder: '',
        status: 'Pending', // Default status
      },
      detail: {
        item: '',
        descriptionOfGoods: '',
        shipper: '',
        por: '',
        shipperPhone: '',
        shipperEmail: '',
        consignee: '',
        pod: '',
        consigneePhone: '',
        consigneeEmail: '',
        trackingNumber: '',
        shippingMethod: '',
        eta: '',
        note: '',
        container: false,
        category: '',
        twoWay: false,
      },
    };
  }
}
