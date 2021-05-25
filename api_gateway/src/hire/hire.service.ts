import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HireService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  sendHireMail(address: string, name: string, letter: string): Promise<any> {
    const msg = `
      <p><b>\nNew job request from ${name}</b></p>
      <p>\nEmail: ${address}</p>
      <p>\nCover letter:</p>
      <p>\n${letter}</p>
      <p>\n</p>
      <p>\nTime: ${new Date().toString()}</p>
    `;

    const data = {
      from: this.configService.get<string>('MAIL_HIRE_FROM'), // sender address
      to: this.configService.get<string>('MAIL_HIRE_TO'), // list of receivers
      subject: 'Job request from website',
      title: 'Job request from website',
      text: msg, // plaintext body
      html: msg, // HTML body content
    };
    return this.mailerService.sendMail(data);
  }
}
