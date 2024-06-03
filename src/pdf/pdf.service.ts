import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { degrees, PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ICoords,
  IDocumentWithInitials,
  IPDFSettings,
  IUserWithCoords,
} from './interfaces/pdf.interface';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createInitials(
    pdfBuffer: Buffer,
    users: User[],
  ): Promise<IDocumentWithInitials> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    pdfDoc.getPages().map((page) => page.setRotation(degrees(0)));

    const numberOfPages = pdfDoc.getPages().length;
    const pageSize = pdfDoc.getPages()[numberOfPages - 1].getSize();
    const heightGap = 70;
    const pageHeight = pageSize.height;
    const lastContentElementY = await this.findLowestLine(
      pdfDoc,
      pageSize.height,
    );

    const pdfSettings = await this.calculateTextCoordinates({
      users,
      numberOfPages,
      lastContentElementY,
      heightGap,
      pageHeight,
    });

    for (let i = 0; i < pdfSettings.newPagesCount; i++) {
      pdfDoc.addPage();
    }

    const pdfWithInitials = await this.insertInitials(pdfDoc, pdfSettings);

    return {
      file: Buffer.from(await pdfWithInitials.save()),
      usersWithCoords: pdfSettings.result,
    };
  }

  async findLowestLine(
    pdfDoc: PDFDocument,
    pageHeight: number,
  ): Promise<number> {
    const data = await pdfDoc.save();
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(doc.numPages);

    const textContent = await page.getTextContent();

    if (!textContent) {
      return pageHeight;
    }

    return textContent.items[textContent.items.length - 1]['transform'][5];
  }

  async calculateTextCoordinates({
    users,
    numberOfPages,
    lastContentElementY,
    heightGap,
    pageHeight,
  }: IPDFSettings): Promise<ICoords> {
    const result: IUserWithCoords[] = [];
    let currentPage = numberOfPages;
    let currentY = lastContentElementY;
    let newPagesCount = 0;
    users.forEach((user) => {
      if (currentY < heightGap) {
        currentPage += 1;
        newPagesCount += 1;
        currentY = pageHeight - heightGap;
      } else {
        currentY -= heightGap;
      }

      result.push({
        ...user,
        ycord: Math.round(currentY),
        pageNumber: currentPage,
      });
    });

    return {
      result,
      newPagesCount,
    };
  }

  async insertInitials(
    pdfDoc: PDFDocument,
    pdfSettings: ICoords,
  ): Promise<PDFDocument> {
    const defaultFontSize = 14;
    const defaultFont = await pdfDoc.embedFont('Helvetica');
    const userEmailFormX = 50;

    const users = pdfSettings.result;
    users.forEach((user) => {
      pdfDoc.getPages()[user.pageNumber - 1].drawText(`${user.name}`, {
        x: userEmailFormX,
        y: Math.round(user.ycord),
        size: defaultFontSize,
        font: defaultFont,
        color: rgb(0, 0, 0),
      });

      pdfDoc.getPages()[user.pageNumber - 1].drawText(`${user.email}`, {
        x: userEmailFormX,
        y: Math.round(user.ycord - 15),
        size: defaultFontSize - 2,
        font: defaultFont,
        color: rgb(13 / 255, 22 / 255, 41 / 255),
        opacity: 0.7,
      });
    });

    return pdfDoc;
  }
}
