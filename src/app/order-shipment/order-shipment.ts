import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type ShipmentDetailResponse = Partial<{
  item: string | null;
  quantity: string | null;
  unit: string | null;
  shipper: string | null;
  por: string | null;
  pod: string | null;
  trackingNumber: string | null;
  shippingMethod: string | null;
  status: string | null;
  note: string | null;
}>;

type ShipmentOrderResponse = Partial<{
  id: number | string;
  orderNumber: number | string;
  number: number | string;
  shipperMethod: string | null;
  status: string | null;
  note: string | null;
  routes:
    | Array<
        Partial<{
          id: number | string | null;
          routeNumber: number | string | null;
          fromLocation: string | null;
          toLocation: string | null;
          item: string | null;
          quantity: string | null;
          unit: string | null;
          logistics: string | null;
          carrier: string | null;
          status: string | null;
        }>
      >
    | null;
  detail: ShipmentDetailResponse | null;
}>;

type CargoLine = {
  routeId: number;
  routeNumber: number;
  fromLocation: string;
  toLocation: string;
  item: string;
  quantity: string;
  unit: string;
  logistics: string;
  carrier: string;
  status: string;
};

@Component({
  selector: 'app-order-shipment',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-shipment.html',
  styleUrl: './order-shipment.scss',
})
export class OrderShipment {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = false;
  protected isSaving = false;
  protected errorMessage = '';
  protected orderNumber = '';
  protected trackingNumber = '';
  protected shippingMethod = '';
  protected status = '';
  protected note = '';
  protected por = '';
  protected pod = '';
  protected item = '';
  protected quantity = '1';
  protected unit = '件';
  protected carrier = '';
  protected cargoLines: CargoLine[] = [];
  protected relayStops: string[] = [];
  protected readonly defaultQuantity = '1';
  protected readonly defaultUnit = '件';
  protected actionMessage = '';
  private initialCargoLines: CargoLine[] = [];
  private initialRelayStops: string[] = [];

  constructor() {
    const trackingNumber = this.route.snapshot.paramMap.get('trackingNumber');
    const number = this.route.snapshot.paramMap.get('number');
    if (!trackingNumber && !number) {
      this.errorMessage = 'Tracking number or order number not found in route.';
      return;
    }

    if (trackingNumber) {
      this.trackingNumber = decodeURIComponent(trackingNumber);
      void this.loadShipmentByTracking(this.trackingNumber);
      return;
    }

    this.orderNumber = decodeURIComponent(number as string);
    void this.loadShipmentByOrder(this.orderNumber);
  }

  private async loadShipmentByTracking(trackingNumber: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await fetch(
        `/api/shipments/${encodeURIComponent(trackingNumber)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const payload = (await response.json()) as ShipmentOrderResponse;
      this.applyShipmentPayload(payload);
    } catch (error) {
      console.error('Load shipment by tracking failed:', error);
      this.errorMessage = '讀取貨運單失敗，請確認 tracking number。';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async loadShipmentByOrder(number: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(number)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const payload = (await response.json()) as ShipmentOrderResponse;
      this.applyShipmentPayload(payload);
    } catch (error) {
      console.error('Load shipment failed:', error);
      this.errorMessage = '讀取貨運單失敗，請確認 API。';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private applyShipmentPayload(payload: ShipmentOrderResponse): void {
    const detail = payload.detail ?? {};
    this.orderNumber = this.toText(payload.orderNumber ?? payload.number);
    this.trackingNumber = this.toText(
      payload.id ?? detail.trackingNumber ?? this.trackingNumber,
    );
    this.shippingMethod = this.toText(
      payload.shipperMethod ?? detail.shippingMethod,
    );
    this.status = this.toText(payload.status ?? detail.status);
    this.note = this.toText(payload.note ?? detail.note);
    this.por = this.toText(detail.por);
    this.pod = this.toText(detail.pod);
    this.item = this.toText(detail.item);
    this.quantity = this.toText(detail.quantity, this.defaultQuantity);
    this.unit = this.toText(detail.unit, this.defaultUnit);
    this.carrier = this.toText(detail.shipper);

    if (Array.isArray(payload.routes) && payload.routes.length > 0) {
      const normalizedRoutes = [...payload.routes].sort((a, b) => {
        const aNo = Number(a.routeNumber ?? 0);
        const bNo = Number(b.routeNumber ?? 0);
        return aNo - bNo;
      });

      this.cargoLines = normalizedRoutes.map((route, index) => ({
        routeId: Number(route.id ?? route.routeNumber ?? index + 1),
        routeNumber: Number(route.routeNumber ?? index + 1),
        fromLocation: this.toText(route.fromLocation),
        toLocation: this.toText(route.toLocation),
        item: this.toText(route.item, '-'),
        quantity: this.toText(route.quantity, this.defaultQuantity),
        unit: this.toText(route.unit, this.defaultUnit),
        logistics: this.toText(route.logistics, this.shippingMethod || '-'),
        carrier: this.toText(route.carrier, this.carrier || '-'),
        status: this.toText(route.status, '-'),
      }));

      const firstRoute = normalizedRoutes[0];
      const lastRoute = normalizedRoutes[normalizedRoutes.length - 1];
      this.por = this.toText(firstRoute.fromLocation, this.por);
      this.pod = this.toText(lastRoute.toLocation, this.pod);
      this.relayStops = this.extractRelayStops(normalizedRoutes);
      this.relayStops = this.mergeMissingRelayStopsFromCargoLines(
        this.relayStops,
        this.cargoLines,
      );
    } else {
      this.cargoLines = this.buildCargoLines(
        this.item,
        this.shippingMethod,
        this.carrier,
        this.quantity,
        this.unit,
      );
      this.relayStops = [];
    }

    this.initialCargoLines = this.cloneCargoLines(this.cargoLines);
    this.initialRelayStops = [...this.relayStops];
  }

  private toText(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) {
      return fallback;
    }
    return String(value);
  }

  private buildCargoLines(
    rawItems: string,
    logistics: string,
    carrier: string,
    quantity: string,
    unit: string,
  ): CargoLine[] {
    const items = rawItems
      .split(/\r?\n|,|，|、|;/)
      .map((v) => v.trim())
      .filter(Boolean);

    const normalizedItems = items;
    const logisticsText = logistics || '-';
    const carrierText = carrier || '-';
    const quantityText = quantity || this.defaultQuantity;
    const unitText = unit || this.defaultUnit;

    const seedLines = normalizedItems.map((item, index) => ({
      routeId: index + 1,
      routeNumber: index + 1,
      fromLocation: '',
      toLocation: '',
      item,
      quantity: quantityText,
      unit: unitText,
      logistics: logisticsText,
      carrier: carrierText,
      status: '-',
    }));

    // On first dispatch to shipment page (no routes yet), keep one blank editable row.
    if (seedLines.length === 0) {
      return [
        {
          routeId: 1,
          routeNumber: 1,
          fromLocation: '',
          toLocation: '',
          item: '',
          quantity: quantityText,
          unit: unitText,
          logistics: logisticsText,
          carrier: carrierText,
          status: '-',
        },
      ];
    }

    return seedLines;
  }

  protected addCargoLine(fromLocation: string): void {
    const normalizedFrom = fromLocation.trim();
    this.cargoLines = [
      ...this.cargoLines,
      {
        routeId: this.getNextRouteId(),
        routeNumber: this.getNextRouteNumber(),
        fromLocation: normalizedFrom,
        toLocation: this.resolveNextLocation(normalizedFrom),
        item: '',
        quantity: this.defaultQuantity,
        unit: this.defaultUnit,
        logistics: this.shippingMethod || '-',
        carrier: this.carrier || '-',
        status: '-',
      },
    ];
  }

  protected removeCargoLine(routeNumber: number): void {
    if (this.cargoLines.length <= 1) {
      return;
    }

    if (!this.cargoLines.some((line) => line.routeNumber === routeNumber)) {
      return;
    }

    this.cargoLines = this.cargoLines.filter(
      (line) => line.routeNumber !== routeNumber,
    );
  }

  protected addRelayStop(): void {
    if (this.isDirectShipping()) {
      return;
    }

    const newStop = `中繼站${this.relayStops.length + 1}`;
    this.relayStops = [...this.relayStops, newStop];

    this.cargoLines = [
      ...this.cargoLines,
      {
        routeId: this.getNextRouteId(),
        routeNumber: this.getNextRouteNumber(),
        fromLocation: newStop,
        toLocation: this.pod,
        item: '',
        quantity: this.defaultQuantity,
        unit: this.defaultUnit,
        logistics: this.shippingMethod || '-',
        carrier: this.carrier || '-',
        status: '-',
      },
    ];
  }

  protected isDirectShipping(): boolean {
    return this.shippingMethod.trim() === '直送';
  }

  protected onPorChange(value: string): void {
    const previous = this.por.trim();
    const next = value.trim();
    this.por = value;

    if (!previous || previous === next) {
      return;
    }

    this.cargoLines = this.cargoLines.map((line) =>
      line.fromLocation.trim() === previous
        ? { ...line, fromLocation: next }
        : line,
    );
  }

  protected onPodChange(value: string): void {
    const previous = this.pod.trim();
    const next = value.trim();
    this.pod = value;

    if (!previous || previous === next) {
      return;
    }

    this.cargoLines = this.cargoLines.map((line) =>
      line.toLocation.trim() === previous
        ? { ...line, toLocation: next }
        : line,
    );
  }

  protected onRelayStopChange(index: number, value: string): void {
    if (index < 0 || index >= this.relayStops.length) {
      return;
    }

    const previous = this.relayStops[index].trim();
    const next = value.trim();
    this.relayStops = this.relayStops.map((stop, i) => (i === index ? value : stop));

    if (!previous || previous === next) {
      return;
    }

    this.cargoLines = this.cargoLines.map((line) => {
      const updates: Partial<CargoLine> = {};
      if (line.fromLocation.trim() === previous) {
        updates.fromLocation = next;
      }
      if (line.toLocation.trim() === previous) {
        updates.toLocation = next;
      }
      return Object.keys(updates).length > 0 ? { ...line, ...updates } : line;
    });
  }

  protected removeRelayStop(index: number): void {
    if (index < 0 || index >= this.relayStops.length) {
      return;
    }

    const removedStop = this.relayStops[index];
    const nextStop = this.relayStops[index + 1] ?? this.pod;

    // Remove cargo lines that depart from the removed relay stop.
    // For lines arriving at that stop, reconnect them to the next hop.
    this.cargoLines = this.cargoLines
      .filter((line) => line.fromLocation.trim() !== removedStop.trim())
      .map((line) =>
        line.toLocation.trim() === removedStop.trim()
          ? { ...line, toLocation: nextStop }
          : line,
      );

    this.relayStops = this.relayStops.filter((_, i) => i !== index);
    this.renumberCargoLines();
  }

  protected async saveShipment(): Promise<void> {
    const shipmentId = Number(this.trackingNumber);
    const orderNumber = Number(this.orderNumber);
    if (
      this.trackingNumber.trim() &&
      (!Number.isFinite(shipmentId) || shipmentId <= 0)
    ) {
      this.errorMessage = 'Tracking Number 無效，無法儲存。';
      this.actionMessage = '';
      return;
    }
    if (!Number.isFinite(orderNumber) || orderNumber <= 0) {
      this.errorMessage = 'Order Number 無效，無法儲存。';
      this.actionMessage = '';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.actionMessage = '';

    const visibleCargoLines = this.getVisibleCargoLines();
    this.cargoLines = this.cloneCargoLines(visibleCargoLines);
    if (this.cargoLines.length === 0) {
      this.cargoLines = [
        {
          routeId: 1,
          routeNumber: 1,
          fromLocation: this.por.trim(),
          toLocation: this.pod.trim(),
          item: this.item || '',
          quantity: this.quantity || this.defaultQuantity,
          unit: this.unit || this.defaultUnit,
          logistics: this.shippingMethod || '-',
          carrier: this.carrier || '-',
          status: '-',
        },
      ];
    }
    this.renumberCargoLines();

    const routes = [...this.cargoLines]
      .sort((a, b) => a.routeNumber - b.routeNumber)
      .map((line, index) => ({
        fromLocation: this.nullIfEmpty(this.resolveFromLocation(line)),
        toLocation: this.nullIfEmpty(this.resolveToLocation(line)),
        carrier: this.nullIfEmpty(line.carrier),
        createdDate: null,
        item: this.nullIfEmpty(line.item),
        logistics: this.nullIfEmpty(line.logistics),
        quantity: this.nullIfEmpty(line.quantity),
        routeNumber: index + 1,
        shipmentId: Number.isFinite(shipmentId) && shipmentId > 0 ? shipmentId : null,
        status: this.nullIfEmpty(line.status),
        unit: this.nullIfEmpty(line.unit),
        updatedDate: null,
      }));

    const transferHubs = this.buildTransferHubs();

    const payload: {
      createdDate: null;
      id?: number;
      note: string | null;
      orderNumber: number;
      routes: Array<{
        fromLocation: string | null;
        toLocation: string | null;
        carrier: string | null;
        createdDate: null;
        item: string | null;
        logistics: string | null;
        quantity: string | null;
        routeNumber: number;
        shipmentId: number | null;
        status: string | null;
        unit: string | null;
        updatedDate: null;
      }>;
      shipperMethod: string | null;
      status: string | null;
      transferHubs: string[];
      updatedDate: null;
    } = {
      createdDate: null,
      note: this.nullIfEmpty(this.note),
      orderNumber,
      routes,
      shipperMethod: this.nullIfEmpty(this.shippingMethod),
      status: this.nullIfEmpty(this.status),
      transferHubs,
      updatedDate: null,
    };

    if (Number.isFinite(shipmentId) && shipmentId > 0) {
      payload.id = shipmentId;
    }

    const hasTracking = Number.isFinite(shipmentId) && shipmentId > 0;
    const saveApi = hasTracking
      ? '/api/shipments/update'
      : '/api/shipments/create';

    console.log('Saving shipment with payload:', payload);

    try {
      const response = await fetch(saveApi, {
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

      const raw = await response.text();
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<{
            id: number | string | null;
            trackingNumber: number | string | null;
          }>;
          const generatedTracking = this.toText(
            saved.id ?? saved.trackingNumber ?? '',
          ).trim();
          if (generatedTracking) {
            this.trackingNumber = generatedTracking;
          }
        } catch {
          // ignore non-JSON response body
        }
      }

      this.isSaving = false;
      this.initialCargoLines = this.cloneCargoLines(this.cargoLines);
      this.initialRelayStops = [...this.relayStops];
      this.actionMessage = '已儲存到後端。';
      console.log('Shipment update payload:', payload);
    } catch (error) {
      this.isSaving = false;
      console.error('Save shipment failed:', error);
      this.errorMessage = '儲存失敗，請檢查 API 與欄位內容。';
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected resetShipment(): void {
    this.cargoLines = this.cloneCargoLines(this.initialCargoLines);
    this.relayStops = [...this.initialRelayStops];
    this.actionMessage = '已重置。';
  }

  protected finish(): void {
    void this.router.navigate(['/']);
  }

  private cloneCargoLines(lines: CargoLine[]): CargoLine[] {
    return lines.map((line) => ({ ...line }));
  }

  protected cargoLinesForFrom(fromLocation: string): CargoLine[] {
    const normalized = fromLocation.trim();
    if (!normalized) {
      const emptyFromLines = this.cargoLines.filter(
        (line) => !line.fromLocation.trim(),
      );
      return emptyFromLines.length > 0 ? emptyFromLines : this.cargoLines;
    }

    const hasFromLocation = this.cargoLines.some((line) => line.fromLocation.trim());
    if (!hasFromLocation) {
      return this.cargoLines;
    }

    return this.cargoLines.filter(
      (line) => line.fromLocation.trim() === normalized,
    );
  }

  private extractRelayStops(
    routes: Array<
      Partial<{
        routeNumber: number | string | null;
        fromLocation: string | null;
        toLocation: string | null;
      }>
    >,
  ): string[] {
    if (routes.length < 2) {
      return [];
    }

    const route1 = routes[0];
    const route2 = routes[1];
    const r1From = this.toText(route1.fromLocation).trim();
    const r1To = this.toText(route1.toLocation).trim();
    const r2From = this.toText(route2.fromLocation).trim();
    const r2To = this.toText(route2.toLocation).trim();

    // Rule requested: if route #1 and #2 from/to are exactly the same, no relay stop.
    if (r1From && r1To && r1From === r2From && r1To === r2To) {
      return [];
    }

    const firstFrom = this.toText(routes[0].fromLocation).trim();
    const path: string[] = firstFrom ? [firstFrom] : [];

    for (const route of routes) {
      const to = this.toText(route.toLocation).trim();
      if (!to) {
        continue;
      }
      if (path[path.length - 1] !== to) {
        path.push(to);
      }
    }

    if (path.length <= 2) {
      return [];
    }

    return path.slice(1, -1);
  }

  private getNextRouteNumber(): number {
    const max = this.cargoLines.reduce(
      (acc, line) => Math.max(acc, line.routeNumber),
      0,
    );
    return max + 1;
  }

  private getNextRouteId(): number {
    const max = this.cargoLines.reduce(
      (acc, line) => Math.max(acc, line.routeId),
      0,
    );
    return max + 1;
  }

  private resolveNextLocation(fromLocation: string): string {
    if (!fromLocation) {
      return this.pod;
    }

    if (fromLocation === this.por) {
      return this.relayStops[0] ?? this.pod;
    }

    const relayIndex = this.relayStops.findIndex((stop) => stop === fromLocation);
    if (relayIndex < 0) {
      return this.pod;
    }

    return this.relayStops[relayIndex + 1] ?? this.pod;
  }

  private nullIfEmpty(value: string): string | null {
    const v = value.trim();
    return v ? v : null;
  }

  private renumberCargoLines(): void {
    const sorted = [...this.cargoLines].sort(
      (a, b) => a.routeNumber - b.routeNumber,
    );
    this.cargoLines = sorted.map((line, index) => ({
      ...line,
      routeNumber: index + 1,
    }));
  }

  private getVisibleCargoLines(): CargoLine[] {
    const visibleFroms = new Set(
      [this.por, ...this.relayStops]
        .map((v) => v.trim())
        .filter(Boolean),
    );

    // Fallback: if location data is incomplete, keep original list to avoid accidental data loss.
    if (visibleFroms.size === 0) {
      return [...this.cargoLines];
    }

    return this.cargoLines.filter((line) =>
      visibleFroms.has(line.fromLocation.trim()),
    );
  }

  private buildTransferHubs(): string[] {
    const path = [this.por, ...this.relayStops, this.pod]
      .map((v) => v.trim())
      .filter(Boolean);
    return Array.from(new Set(path));
  }

  private resolveFromLocation(line: CargoLine): string {
    const from = line.fromLocation.trim();
    return from || this.por.trim();
  }

  private resolveToLocation(line: CargoLine): string {
    const from = this.resolveFromLocation(line);
    const path = [this.por, ...this.relayStops, this.pod]
      .map((v) => v.trim())
      .filter(Boolean);

    const currentIndex = path.findIndex((stop) => stop === from);
    if (currentIndex >= 0 && currentIndex + 1 < path.length) {
      return path[currentIndex + 1];
    }

    return line.toLocation.trim() || this.pod.trim();
  }

  private mergeMissingRelayStopsFromCargoLines(
    relayStops: string[],
    cargoLines: CargoLine[],
  ): string[] {
    const known = new Set(
      [this.por, ...relayStops].map((v) => v.trim()).filter(Boolean),
    );
    const extras: string[] = [];

    for (const line of cargoLines) {
      const from = line.fromLocation.trim();
      if (!from) {
        continue;
      }
      if (from === this.por.trim() || from === this.pod.trim()) {
        continue;
      }
      if (!known.has(from)) {
        known.add(from);
        extras.push(from);
      }
    }

    return [...relayStops, ...extras];
  }
}
