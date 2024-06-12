import '@ungap/with-resolvers';
import * as fontkit from '@pdf-lib/fontkit';
import { Injectable } from '@nestjs/common';
import { degrees, PDFDocument, rgb } from 'pdf-lib';
import { format } from 'date-fns';
import {
  ICoords,
  IDocumentWithInitials,
  IPDFSettings,
  IUserWithCoords,
} from './interfaces/pdf.interface';
import { User } from '../database/entities/user.entity';
import { FontUrls } from '../common/enums/fonts.enum';
import { pdfToPng } from 'pdf-to-png-converter';

@Injectable()
export class PdfService {
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

    const sortedUsers = users.sort((a, b) => a.position - b.position);

    const pdfSettings = await this.calculateTextCoordinates({
      users: sortedUsers,
      numberOfPages,
      lastContentElementY,
      heightGap,
      pageHeight,
    });

    for (let i = 0; i < pdfSettings.newPagesCount; i++) {
      pdfDoc.addPage();
    }

    const pdfWithInitials = await this.insertInitials(pdfDoc, pdfSettings);
    const pagesCount = pdfWithInitials.getPages().length;
    return {
      file: Buffer.from(await pdfWithInitials.save()),
      usersWithCoords: pdfSettings.result,
      pagesCount,
    };
  }

  async createSignature(pdfBuffer: Buffer, user: User): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const signedPdf = await this.insertSignature(pdfDoc, user);

    return Buffer.from(await signedPdf.save());
  }

  async findLowestLine(
    pdfDoc: PDFDocument,
    pageHeight: number,
  ): Promise<number> {
    const data = await pdfDoc.save();
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(doc.numPages);

    const textContent = await page.getTextContent();

    if (!textContent) {
      return pageHeight;
    }

    if (textContent.items.length === 0) {
      return 50;
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
    let currentY = lastContentElementY - 20;
    let newPagesCount = 0;

    users.forEach((user, index) => {
      if (currentY < heightGap) {
        currentPage += 1;
        newPagesCount += 1;
        currentY = pageHeight - heightGap;
      } else {
        currentY -= heightGap;
      }

      if (currentY < 30) {
        currentY = 30;
      }

      result.push({
        ...user,
        ycord: Math.round(currentY),
        pageNumber: currentPage,
      });

      if (user.name.length > 23 && index < users.length - 1) {
        currentY -= 15;
      }

      currentY = Math.max(currentY, 30);
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
    const pageSize = pdfDoc.getPages()[0].getSize();
    const maxUsernameWidth = (pageSize.width - userEmailFormX) / 3;

    const users = pdfSettings.result;

    users.forEach((user) => {
      const usernameWidth = defaultFont.widthOfTextAtSize(
        user.name,
        defaultFontSize,
      );

      if (usernameWidth > maxUsernameWidth) {
        const [firstName, ...surnameParts] = user.name.split(' ');
        const surname = surnameParts.join(' ');

        pdfDoc.getPages()[user.pageNumber - 1].drawText(firstName, {
          x: userEmailFormX,
          y: Math.round(user.ycord),
          size: defaultFontSize,
          font: defaultFont,
          color: rgb(0, 0, 0),
        });

        pdfDoc.getPages()[user.pageNumber - 1].drawText(surname, {
          x: userEmailFormX,
          y: Math.round(user.ycord - 15),
          size: defaultFontSize,
          font: defaultFont,
          color: rgb(0, 0, 0),
        });
        pdfDoc.getPages()[user.pageNumber - 1].drawText(user.email, {
          x: userEmailFormX,
          y: Math.round(user.ycord - 30),
          size: defaultFontSize - 2,
          font: defaultFont,
          color: rgb(13 / 255, 22 / 255, 41 / 255),
          opacity: 0.7,
        });
      } else {
        pdfDoc.getPages()[user.pageNumber - 1].drawText(user.name, {
          x: userEmailFormX,
          y: Math.round(user.ycord),
          size: defaultFontSize,
          font: defaultFont,
          color: rgb(0, 0, 0),
        });

        pdfDoc.getPages()[user.pageNumber - 1].drawText(user.email, {
          x: userEmailFormX,
          y: Math.round(user.ycord - 15),
          size: defaultFontSize - 2,
          font: defaultFont,
          color: rgb(13 / 255, 22 / 255, 41 / 255),
          opacity: 0.7,
        });
      }
    });

    return pdfDoc;
  }

  async insertSignature(pdfDoc: PDFDocument, user: User): Promise<PDFDocument> {
    pdfDoc.registerFontkit(fontkit);

    const signatureFontName = user.signatures[0].signFont;
    const username = user.name;
    const signatureDate = format(user.signatures[0].signDate, 'MM.dd.yyyy');
    const page = user.signatures[0].pageNumber;
    const yCord = user.signatures[0].yCoordinate;
    const signatureFontUrl =
      FontUrls[`${signatureFontName}`] ?? FontUrls['italianno-regular'];
    const fontBytes = await fetch(signatureFontUrl).then((res) =>
      res.arrayBuffer(),
    );
    const customFont = await pdfDoc.embedFont(fontBytes);
    const defaultFont = await pdfDoc.embedFont('Helvetica');
    const signatureFontSize = user.signatures[0].fontSize ?? 20;
    const dateFontSize = 14;

    const pageSize = pdfDoc.getPages()[0].getSize();
    const dateFormX = pageSize.width / 2 - 25;
    const signatureFormX = Math.round((pageSize.width * 2) / 3);
    const usernameWidth = customFont.widthOfTextAtSize(
      user.name,
      signatureFontSize,
    );

    if (usernameWidth > 150) {
      const [firstName, ...surnameParts] = user.name.split(' ');
      const surname = surnameParts.join(' ');
      const firstNameWidth = customFont.widthOfTextAtSize(
        firstName,
        signatureFontSize,
      );
      const surnameWidth = customFont.widthOfTextAtSize(
        surname,
        signatureFontSize,
      );
      const indent = Math.round(Math.abs(firstNameWidth - surnameWidth) / 2);

      if (firstNameWidth > surnameWidth) {
        pdfDoc.getPages()[page - 1].drawText(firstName, {
          x: signatureFormX,
          y: yCord,
          size: signatureFontSize,
          font: customFont,
          color: rgb(0, 0, 1),
        });
        pdfDoc.getPages()[page - 1].drawText(surname, {
          x: signatureFormX + indent,
          y: yCord,
          size: signatureFontSize,
          font: customFont,
          color: rgb(0, 0, 1),
        });
      } else {
        pdfDoc.getPages()[page - 1].drawText(firstName, {
          x: signatureFormX + indent,
          y: yCord,
          size: signatureFontSize,
          font: customFont,
          color: rgb(0, 0, 0),
        });
        pdfDoc.getPages()[page - 1].drawText(surname, {
          x: signatureFormX,
          y: yCord - signatureFontSize - 5,
          size: signatureFontSize,
          font: customFont,
          color: rgb(0, 0, 0),
        });
      }
    } else {
      pdfDoc.getPages()[page - 1].drawText(`${username}`, {
        x: signatureFormX,
        y: yCord,
        size: signatureFontSize,
        font: customFont,
        color: rgb(0, 0, 0),
      });
    }
    pdfDoc.getPages()[page - 1].drawText(`${signatureDate}`, {
      x: dateFormX,
      y: yCord - dateFontSize / 2,
      size: dateFontSize,
      font: defaultFont,
      color: rgb(0, 0, 0),
    });

    return pdfDoc;
  }

  async convertPdfToPng(pdfBuffer: Buffer): Promise<any> {
    const pngPage = await pdfToPng(pdfBuffer, {
      useSystemFonts: false,
      pagesToProcess: [1],
      viewportScale: 1,
    });

    return pngPage[0].content;
  }
}
