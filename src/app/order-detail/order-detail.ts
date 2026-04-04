import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type DetailResponse = Partial<{
  item: string | null;
  descriptionOfGoods: string | null;
  shipper: string | null;
  por: string | null;
  shipperPhone: string | null;
  shipperEmail: string | null;
  consignee: string | null;
  pod: string | null;
  consigneePhone: string | null;
  consigneeEmail: string | null;
  trackingNumber: string | null;
  shippingMethod: string | null;
  eta: string | null;
  note: string | null;
  container: boolean | null;
  category: string | null;
  twoWay: boolean | string | null;
}>;

type OrderDetailResponse = Partial<{
  number: number | string;
  typeOfBusiness: 'B2B' | 'B2C' | string | null;
  typeOfOrder: string | null;
  detail: DetailResponse | null;
}>;

type DetailViewModel = {
  order: {
    number: string;
    typeOfBusiness: 'B2B' | 'B2C';
    typeOfOrder: string;
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

@Component({
  selector: 'app-order-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = false;
  protected isUpdating = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected orderNumber = '';
  protected form: DetailViewModel = this.createEmptyForm();
  private originalForm: DetailViewModel = this.createEmptyForm();

  constructor() {
    const number = this.route.snapshot.paramMap.get('number');
    if (number) {
      this.orderNumber = decodeURIComponent(number);
      void this.loadDetail(this.orderNumber);
      return;
    }
    this.errorMessage = 'Order number not found in route.';
  }

  protected async update(): Promise<void> {
    const orderNumber = Number(this.form.order.number);
    if (!Number.isFinite(orderNumber) || orderNumber <= 0) {
      this.errorMessage = 'Order number must be a positive integer.';
      this.successMessage = '';
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.buildUpdateRequest(orderNumber);
    console.log('Update order payload:', payload);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('/api/orders/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      this.successMessage = 'Update success.';
      this.originalForm = this.cloneForm(this.form);
    } catch (error) {
      console.error('Update order failed:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.errorMessage =
          'Update request timeout. Data may already be saved, please verify in list.';
      } else {
        this.errorMessage = 'Update failed. Please check API and field values.';
      }
      this.successMessage = '';
    } finally {
      window.clearTimeout(timeoutId);
      this.isUpdating = false;
      this.cdr.detectChanges();
    }
  }

  protected reset(): void {
    this.form = this.cloneForm(this.originalForm);
    this.errorMessage = '';
    this.successMessage = '';
  }

  protected finish(): void {
    void this.router.navigate(['/']);
  }

  private async loadDetail(number: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(number)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const payload = (await response.json()) as OrderDetailResponse;
      this.form = this.mapResponseToForm(payload, number);
      this.originalForm = this.cloneForm(this.form);
    } catch (error) {
      console.error('Load order detail failed:', error);
      this.errorMessage = 'Load detail failed. Please check API and order number.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private mapResponseToForm(
    response: OrderDetailResponse,
    fallbackNumber: string,
  ): DetailViewModel {
    const detail = response.detail ?? {};
    const businessType =
      response.typeOfBusiness === 'B2C' ? ('B2C' as const) : ('B2B' as const);

    return {
      order: {
        number: this.toText(response.number, fallbackNumber),
        typeOfBusiness: businessType,
        typeOfOrder: this.toText(response.typeOfOrder),
      },
      detail: {
        item: this.toText(detail.item),
        descriptionOfGoods: this.toText(detail.descriptionOfGoods),
        shipper: this.toText(detail.shipper),
        por: this.toText(detail.por),
        shipperPhone: this.toText(detail.shipperPhone),
        shipperEmail: this.toText(detail.shipperEmail),
        consignee: this.toText(detail.consignee),
        pod: this.toText(detail.pod),
        consigneePhone: this.toText(detail.consigneePhone),
        consigneeEmail: this.toText(detail.consigneeEmail),
        trackingNumber: this.toText(detail.trackingNumber),
        shippingMethod: this.toText(detail.shippingMethod),
        eta: this.toText(detail.eta),
        note: this.toText(detail.note),
        container: Boolean(detail.container),
        category: this.toText(detail.category),
        twoWay:
          typeof detail.twoWay === 'boolean'
            ? detail.twoWay
            : String(detail.twoWay ?? '').toLowerCase() === 'yes',
      },
    };
  }

  private buildUpdateRequest(orderNumber: number): object {
    const commonDetail = {
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

    const detail =
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
      updatedDate: null,
    };
  }

  private createEmptyForm(): DetailViewModel {
    return {
      order: {
        number: '',
        typeOfBusiness: 'B2B',
        typeOfOrder: '',
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

  private cloneForm(form: DetailViewModel): DetailViewModel {
    return {
      order: { ...form.order },
      detail: { ...form.detail },
    };
  }

  private toText(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) {
      return fallback;
    }
    return String(value);
  }

  private nullIfEmpty(value: string): string | null {
    const v = value.trim();
    return v ? v : null;
  }
}
