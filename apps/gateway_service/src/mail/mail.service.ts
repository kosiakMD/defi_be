import { MailerService } from '@nestjs-modules/mailer';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  sendHireMail(email: string, name: string, letter: string): Promise<any> {
    const msg = `
      <p><b>\nNew job request from ${name}</b></p>
      <p>\nEmail: ${email}</p>
      <p>\nCover letter:</p>
      <p>\n${letter}</p>
      <p>\n</p>
      <p>\nTime: ${new Date().toString()}</p>
    `;

    const data = {
      from: this.configService.get<string>('MAIL_HIRE_FROM'),
      to: this.configService.get<string>('MAIL_HIRE_TO'),
      subject: 'Job request from website',
      text: msg,
      html: msg,
    };
    return this.mailerService.sendMail(data);
  }

  sendQuestionMail(email: string, name: string, letter: string): Promise<any> {
    const msg = `
      <p><b>\nQuestion about Safe</b></p>
      <p>\nFrom: ${name}</p>
      <p>\nEmail: ${email}</p>
      <p>\nQuestion:</p>
      <p>\n${letter}</p>
      <p>\n</p>
      <p>\nTime: ${new Date().toString()}</p>
    `;

    const data = {
      from: this.configService.get<string>('MAIL_QUESTION_FROM'),
      to: this.configService.get<string>('MAIL_QUESTION_TO'),
      subject: 'Question about Safe',
      text: msg,
      html: msg,
    };
    return this.mailerService.sendMail(data);
  }
}
