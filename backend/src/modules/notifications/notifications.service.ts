import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async notifyLeadStatusChange(opts: {
    partnerEmail: string;
    partnerName: string;
    leadName: string;
    oldStatus: string;
    newStatus: string;
    leadId: string;
  }) {
    const subject = `[Portalon] Tu lead ${opts.leadName} avanzó a ${opts.newStatus}`;
    const html = `
      <p>Hola ${opts.partnerName},</p>
      <p>Tu lead <strong>${opts.leadName}</strong> ha cambiado de estado:</p>
      <p><strong>${opts.oldStatus}</strong> → <strong>${opts.newStatus}</strong></p>
      <p>Accede a la plataforma para ver los detalles y el historial completo.</p>
      <hr/>
      <p style="font-size:12px;color:#666">Portalon Private Network · No respondas a este correo</p>
    `;
    await this.sendMail({ to: opts.partnerEmail, subject, html });
  }

  async notifyCommissionCreated(opts: {
    partnerEmail: string;
    partnerName: string;
    leadName: string;
    triggerType: string;
    amount: number;
    currency?: string;
  }) {
    const currency = opts.currency ?? 'EUR';
    const subject = `[Portalon] Nueva comisión pendiente: ${opts.amount.toLocaleString('es-ES')} ${currency}`;
    const html = `
      <p>Hola ${opts.partnerName},</p>
      <p>Se ha registrado una nueva comisión para tu lead <strong>${opts.leadName}</strong>:</p>
      <ul>
        <li>Tipo: <strong>${opts.triggerType}</strong></li>
        <li>Importe: <strong>${opts.amount.toLocaleString('es-ES', { style: 'currency', currency })}</strong></li>
        <li>Estado: <strong>PENDIENTE de aprobación</strong></li>
      </ul>
      <p>Accede a la plataforma para consultar el estado de tus comisiones.</p>
      <hr/>
      <p style="font-size:12px;color:#666">Portalon Private Network · No respondas a este correo</p>
    `;
    await this.sendMail({ to: opts.partnerEmail, subject, html });
  }

  private async sendMail(opts: { to: string; subject: string; html: string }) {
    if (!this.transporter) {
      this.logger.debug(`[Email skipped — SMTP not configured] To: ${opts.to} | ${opts.subject}`);
      return;
    }
    try {
      const from = this.config.get<string>('SMTP_FROM', 'Portalon <noreply@portalon.com>');
      await this.transporter.sendMail({ from, ...opts });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err.message}`);
    }
  }
}
