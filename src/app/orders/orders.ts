import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type OrderRecord = {
  id: number;
  number: string;
  businessType: string;
  orderType: string;
  status: string;
  createdDate: string;
  updatedDate: string;
};

type OrdersApiItem = Partial<{
  id: number | string;
  number: number | string;
  orderNumber: number | string;
  typeOfBusiness: string;
  businessType: string;
  typeOfOrder: string;
  orderType: string;
  status: string;
  createdDate: string | null;
  createDate: string | null;
  created_at: string | null;
  updatedDate: string | null;
  updateDate: string | null;
  updated_at: string | null;
}>;

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  protected readonly pageSizeOptions = [10, 20, 50];

  protected pageSize = 10;
  protected isLoading = false;
  protected isDeleting = false;
  protected showDeleteDialog = false;
  protected loadError = '';
  protected searchKeyword = '';
  protected appliedKeyword = '';
  protected selectedOrderId: number | null = null;
  protected orders: OrderRecord[] = [];

  constructor() {
    void this.loadOrders();
  }

  protected get visibleOrders(): OrderRecord[] {
    const keyword = this.appliedKeyword.trim().toLowerCase();
    const filtered = keyword
      ? this.orders.filter((order) => this.matchesKeyword(order, keyword))
      : this.orders;

    return filtered.slice(0, this.pageSize);
  }

  protected createOrder(): void {
    if (this.selectedOrderId !== null) {
      this.loadError = 'Please clear selected order before creating a new one.';
      return;
    }

    void this.router.navigate(['/orders/create']);
  }

  protected updateOrder(): void {
    if (this.selectedOrderId === null) {
      this.loadError = 'Please select one order before update.';
      return;
    }

    const selectedOrder = this.orders.find(
      (order) => order.id === this.selectedOrderId,
    );

    if (!selectedOrder?.number) {
      this.loadError = 'Selected order number was not found.';
      return;
    }

    void this.router.navigate([
      '/orders',
      encodeURIComponent(selectedOrder.number),
      'detail',
    ]);
  }

  protected deleteOrder(): void {
    if (this.selectedOrderId === null) {
      this.loadError = 'Please select one order before delete.';
      return;
    }
    this.showDeleteDialog = true;
  }

  protected cancelDelete(): void {
    this.showDeleteDialog = false;
  }

  protected async confirmDelete(): Promise<void> {
    if (this.selectedOrderId === null) {
      this.showDeleteDialog = false;
      return;
    }

    const selectedOrder = this.orders.find(
      (order) => order.id === this.selectedOrderId,
    );
    if (!selectedOrder) {
      this.loadError = 'Selected order was not found.';
      this.showDeleteDialog = false;
      return;
    }

    this.isDeleting = true;
    this.showDeleteDialog = false;
    this.loadError = '';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const encodedNumber = encodeURIComponent(selectedOrder.number);
      const response = await fetch(`/api/orders/delete/${encodedNumber}`, {
        method: 'POST',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      this.orders = this.orders.filter(
        (order) => order.id !== this.selectedOrderId,
      );
      this.selectedOrderId = null;
    } catch (error) {
      console.error('Delete order failed:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.loadError =
          'Delete request timeout. Data may already be deleted, please refresh list.';
      } else {
        this.loadError = 'Delete failed. Please check API and selected number.';
      }
    } finally {
      window.clearTimeout(timeoutId);
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  protected applySearch(): void {
    this.appliedKeyword = this.searchKeyword;
  }

  protected clearSearch(): void {
    this.searchKeyword = '';
    this.appliedKeyword = '';
  }

  protected onKeywordInputChange(keyword: string): void {
    if (!keyword.trim()) {
      this.appliedKeyword = '';
    }
  }

  protected retryLoadOrders(): void {
    void this.loadOrders();
  }

  protected toggleSelection(orderId: number): void {
    this.selectedOrderId = this.selectedOrderId === orderId ? null : orderId;
  }

  private matchesKeyword(order: OrderRecord, keyword: string): boolean {
    return (
      order.number.toLowerCase().includes(keyword) ||
      order.businessType.toLowerCase().includes(keyword) ||
      order.orderType.toLowerCase().includes(keyword) ||
      order.status.toLowerCase().includes(keyword) ||
      order.createdDate.toLowerCase().includes(keyword) ||
      order.updatedDate.toLowerCase().includes(keyword)
    );
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async loadOrders(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    const controller = new AbortController();
    let settled = false;

    const forceStopId = window.setTimeout(() => {
      if (!settled) {
        this.loadError = 'Load timeout. Please click retry.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 10000);

    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`/api/orders?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      const items = this.extractOrders(payload);
      this.orders = items.map((item, index) => this.normalizeOrder(item, index));
      this.selectedOrderId = null;
      settled = true;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Order API request failed:', error);
      this.orders = [];
      this.selectedOrderId = null;
      this.loadError =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Load timeout. Please click retry.'
          : 'Failed to load orders. Please check API and proxy.';
      settled = true;
      this.cdr.detectChanges();
    } finally {
      window.clearTimeout(timeoutId);
      window.clearTimeout(forceStopId);
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private normalizeOrder(item: OrdersApiItem, index: number): OrderRecord {
    const fallbackId = index + 1;
    const id = Number(item.id);
    const resolvedId = Number.isFinite(id) && id > 0 ? id : fallbackId;

    return {
      id: resolvedId,
      number: this.toText(item.number ?? item.orderNumber ?? `Number${resolvedId}`),
      businessType: this.toText(item.typeOfBusiness ?? item.businessType ?? ''),
      orderType: this.toText(item.typeOfOrder ?? item.orderType ?? ''),
      status: this.toText(item.status ?? item.status ?? ''),
      createdDate: this.toText(
        item.createdDate ?? item.createDate ?? item.created_at ?? '',
      ),
      updatedDate: this.toText(
        item.updatedDate ?? item.updateDate ?? item.updated_at ?? '',
      ),
    };
  }

  private extractOrders(response: unknown): OrdersApiItem[] {
    if (Array.isArray(response)) {
      return response as OrdersApiItem[];
    }

    if (response && typeof response === 'object') {
      const wrapped = response as {
        value?: unknown;
        data?: unknown;
        items?: unknown;
        content?: unknown;
      };

      const candidate =
        wrapped.value ?? wrapped.data ?? wrapped.items ?? wrapped.content;

      if (Array.isArray(candidate)) {
        return candidate as OrdersApiItem[];
      }
    }

    return [];
  }

  private toText(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }
}
