import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentOrderStatus,
  SubscriptionStatus,
  type PaymentOrder,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { UsersService } from '../users/users.service.js';
import type { CheckoutDto } from './dto/checkout.dto.js';

type PlategaCreateResponse = {
  transactionId?: string;
  status?: string;
  url?: string;
  expiresIn?: string;
  rate?: number;
  [key: string]: unknown;
};

type PlategaCallbackBody = {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentMethod?: number;
  payload?: string;
  [key: string]: unknown;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const { merchantId, secret, apiBase } = this.plategaCredentials();

    const user = await this.usersService.findEntityById(userId);
    const product = await this.prisma.subscriptionProduct.findUnique({
      where: { code: dto.plan },
    });
    if (!product) {
      throw new NotFoundException('Subscription product not found');
    }

    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        plan: dto.plan,
        amountRub: product.priceRub,
        currency: 'RUB',
        status: PaymentOrderStatus.PENDING,
      },
    });

    const frontendUrl = this.frontendBaseUrl();
    const returnUrl = `${frontendUrl}/dashboard/subscription?payment=success&orderId=${order.id}`;
    const failedUrl = `${frontendUrl}/dashboard/subscription?payment=failed&orderId=${order.id}`;

    const requestBody = {
      paymentDetails: {
        amount: product.priceRub,
        currency: 'RUB',
      },
      description: product.title,
      return: returnUrl,
      failedUrl,
      orderId: order.id,
      payload: order.id,
      metadata: {
        user_email: user.email,
        userId: user.id,
        userName: user.username,
      },
    };

    const response = await fetch(`${apiBase}/v2/transaction/process`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-MerchantId': merchantId,
        'X-Secret': secret,
      },
      body: JSON.stringify(requestBody),
    });

    const payload = (await response
      .json()
      .catch(() => ({}))) as PlategaCreateResponse;

    if (!response.ok) {
      this.logger.warn(
        `Platega create failed: status=${response.status} orderId=${order.id}`,
      );
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentOrderStatus.FAILED,
          failedAt: new Date(),
          rawMeta: payload as object,
        },
      });
      throw new BadRequestException('Failed to create payment');
    }

    const transactionId =
      typeof payload.transactionId === 'string' ? payload.transactionId : null;
    const paymentUrl = typeof payload.url === 'string' ? payload.url : null;

    if (!transactionId || !paymentUrl) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentOrderStatus.FAILED,
          failedAt: new Date(),
          rawMeta: payload as object,
        },
      });
      throw new BadRequestException('Invalid response from payment provider');
    }

    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        plategaTransactionId: transactionId,
        paymentUrl,
        rawMeta: payload as object,
      },
    });

    return { paymentUrl, orderId: order.id };
  }

  async handlePlategaWebhook(
    merchantIdHeader: string | undefined,
    secretHeader: string | undefined,
    body: PlategaCallbackBody,
  ) {
    const { merchantId, secret } = this.plategaCredentials();

    if (
      !merchantIdHeader ||
      !secretHeader ||
      merchantIdHeader !== merchantId ||
      secretHeader !== secret
    ) {
      throw new UnauthorizedException('Invalid Platega webhook credentials');
    }

    const status = typeof body.status === 'string' ? body.status : '';
    const order = await this.findOrderForCallback(body);
    if (!order) {
      this.logger.warn(
        `Payment order not found for Platega callback id=${String(body.id ?? '')} payload=${String(body.payload ?? '')}`,
      );
      return { ok: true, missingOrder: true };
    }

    if (status === 'CONFIRMED') {
      return this.fulfillPaidOrder(order, body);
    }

    if (status === 'CANCELED') {
      if (order.status === PaymentOrderStatus.PAID) {
        return { ok: true, idempotent: true };
      }
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentOrderStatus.CANCELLED,
          failedAt: order.failedAt ?? new Date(),
          rawMeta: body as object,
        },
      });
      return { ok: true };
    }

    if (status === 'CHARGEBACKED') {
      await this.handleChargeback(order, body);
      return { ok: true };
    }

    if (status === 'DISPUTED' || status === 'PARTIALLY_REFUNDED') {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { rawMeta: body as object },
      });
      this.logger.warn(
        `Platega ${status} for order ${order.id} (no auto-revoke)`,
      );
      return { ok: true, noted: true };
    }

    return { ok: true, ignored: true };
  }

  private async findOrderForCallback(
    body: PlategaCallbackBody,
  ): Promise<PaymentOrder | null> {
    const transactionId =
      typeof body.id === 'string' && body.id.length > 0 ? body.id : null;
    if (transactionId) {
      const byTx = await this.prisma.paymentOrder.findUnique({
        where: { plategaTransactionId: transactionId },
      });
      if (byTx) {
        return byTx;
      }
    }

    const payloadId =
      typeof body.payload === 'string' && body.payload.length > 0
        ? body.payload
        : null;
    if (payloadId) {
      return this.prisma.paymentOrder.findUnique({ where: { id: payloadId } });
    }

    return null;
  }

  private async fulfillPaidOrder(
    order: PaymentOrder,
    meta: Record<string, unknown>,
  ) {
    if (order.status === PaymentOrderStatus.PAID) {
      return { ok: true, idempotent: true };
    }

    const existingSub = await this.prisma.userSubscription.findFirst({
      where: { paymentOrderId: order.id },
    });
    if (existingSub) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentOrderStatus.PAID,
          paidAt: order.paidAt ?? new Date(),
          rawMeta: meta as object,
        },
      });
      return {
        ok: true,
        idempotent: true,
        subscription: this.subscriptionsService.toPublic(existingSub),
      };
    }

    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.paymentOrder.findUnique({
        where: { id: order.id },
      });
      if (!fresh || fresh.status === PaymentOrderStatus.PAID) {
        return;
      }

      await this.subscriptionsService.grant(fresh.userId, fresh.plan, null, {
        paymentOrderId: fresh.id,
        tx,
      });

      await tx.paymentOrder.update({
        where: { id: fresh.id },
        data: {
          status: PaymentOrderStatus.PAID,
          paidAt: new Date(),
          rawMeta: meta as object,
        },
      });
    });

    const subscription = await this.prisma.userSubscription.findFirst({
      where: { paymentOrderId: order.id },
    });

    return {
      ok: true,
      subscription: subscription
        ? this.subscriptionsService.toPublic(subscription)
        : undefined,
    };
  }

  private async handleChargeback(
    order: PaymentOrder,
    meta: Record<string, unknown>,
  ) {
    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { rawMeta: meta as object },
    });

    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        paymentOrderId: order.id,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!subscription) {
      return;
    }

    await this.subscriptionsService.revoke(subscription.id);
    this.logger.warn(
      `Revoked subscription ${subscription.id} after Platega CHARGEBACKED order ${order.id}`,
    );
  }

  private plategaCredentials() {
    const merchantId = this.config
      .get<string>('PLATEGA_MERCHANT_ID', '')
      .trim();
    const secret = this.config.get<string>('PLATEGA_SECRET', '').trim();
    const apiBase = this.config
      .get<string>('PLATEGA_API_BASE', 'https://app.platega.io')
      .replace(/\/$/, '');

    if (!merchantId || !secret) {
      throw new ServiceUnavailableException(
        'Payment provider is not configured (PLATEGA_MERCHANT_ID / PLATEGA_SECRET)',
      );
    }

    return { merchantId, secret, apiBase };
  }

  private frontendBaseUrl(): string {
    return this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }
}
