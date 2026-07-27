import '@ungap/with-resolvers';
import * as fontkit from '@pdf-lib/fontkit';
import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
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
import { ReadDocumentDto } from '../documents/dto/read-document.dto';
import { AuditLog } from '../database/entities/auditLog.entity';
import { formatDateString, sizeFormatter } from '../common/utils/format.util';
import { BlockchainTypes, UserRoles } from '../common/enums/entities.enum';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isCyrillic } from '../common/utils/font.util';

const BLOCKCHAIN_LABELS: Record<string, string> = {
  [BlockchainTypes.POLYGON]: 'Polygon',
  [BlockchainTypes.BSC]: 'BSC',
  [BlockchainTypes.SOLANA]: 'Solana',
  [BlockchainTypes.MONAD]: 'Monad',
  [BlockchainTypes.BASE]: 'Base',
  [BlockchainTypes.BITCOIN]: 'Bitcoin',
  [BlockchainTypes.SEI]: 'SEI',
};

@Injectable()
export class PdfService {
  async createInitials(
    pdfBuffer: Buffer,
    users: User[],
  ): Promise<IDocumentWithInitials> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const numberOfPages = pdfDoc.getPages().length;
    const pageSize = pdfDoc.getPages()[numberOfPages - 1].getSize();
    const heightGap = 70;
    const pageHeight = pageSize.height;
    const pageWidth = pageSize.width;

    const lastContentElementY = await this.findLowestLine(pdfDoc, pageHeight);

    const sortedUsers = users.sort((a, b) => a.position - b.position);

    const pdfSettings = await this.calculateTextCoordinates({
      users: sortedUsers,
      numberOfPages,
      lastContentElementY,
      heightGap,
      pageHeight,
    });

    for (let i = 0; i < pdfSettings.newPagesCount; i++) {
      pdfDoc.addPage([pageWidth, pageHeight]);
    }

    const pdfWithInitials = await this.insertInitials(pdfDoc, pdfSettings);
    const pagesCount = pdfWithInitials.getPages().length;
    return {
      file: Buffer.from(await pdfWithInitials.save()),
      usersWithCoords: pdfSettings.result,
      pagesCount,
      pageSize,
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
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(doc.numPages);

    const textContent = await page.getTextContent();
    const operatorList = await page.getOperatorList();
    const hasImages = operatorList.fnArray.includes(
      pdfjsLib.OPS.paintImageXObject,
    );

    if (!textContent) {
      return pageHeight;
    }

    if (textContent.items.length === 0 || hasImages) {
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
    pdfDoc.registerFontkit(fontkit);

    const defaultFontSize = 14;
    const defaultFontBytes = await this.readDefaultFontBytes('default');
    const defaultFont = await pdfDoc.embedFont(defaultFontBytes);
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
    const signatureImage = user.signatures[0].signImage;
    const username = user.name;
    const signatureDate = format(user.signatures[0].signDate, 'MM.dd.yyyy');
    const page = user.signatures[0].pageNumber;
    const yCord = user.signatures[0].yCoordinate;

    const defaultFontBytes = await this.readDefaultFontBytes('default');
    const defaultFont = await pdfDoc.embedFont(defaultFontBytes);

    const signatureFontSize = user.signatures[0].fontSize ?? 20;
    const dateFontSize = 14;

    const pageSize = pdfDoc.getPages()[0].getSize();
    const dateFormX = pageSize.width / 2 - 25;
    const signatureFormX = Math.round((pageSize.width * 2) / 3);

    if (signatureImage) {
      const image = await this.embedSignatureImage(pdfDoc, signatureImage);
      const scale = Math.min(150 / image.width, 50 / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;

      pdfDoc.getPages()[page - 1].drawImage(image, {
        x: signatureFormX,
        y: yCord - Math.max(0, (height - signatureFontSize) / 2),
        width,
        height,
      });
      pdfDoc.getPages()[page - 1].drawText(`${signatureDate}`, {
        x: dateFormX,
        y: yCord,
        size: dateFontSize,
        font: defaultFont,
        color: rgb(0, 0, 0),
      });

      return pdfDoc;
    }

    let fontBytes = await this.fetchFontBytes(signatureFontName);

    if (isCyrillic(username)) {
      fontBytes = await this.fetchFontBytes('marck-script-regular');
    }

    const customFont = await pdfDoc.embedFont(fontBytes);
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
          y: yCord - signatureFontSize - 7,
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
          y: yCord - signatureFontSize - 7,
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
      y: yCord,
      size: dateFontSize,
      font: defaultFont,
      color: rgb(0, 0, 0),
    });

    return pdfDoc;
  }

  async stampBlockchainHash(
    pdfBuffer: Buffer,
    blockchain: string,
    transactionHash: string,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await this.readDefaultFontBytes('default');
    const font = await pdfDoc.embedFont(fontBytes);

    const label = BLOCKCHAIN_LABELS[blockchain] ?? 'Blockchain';
    const text = `${label} Signing Hash: ${transactionHash}`;

    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    const marginX = 40;
    const maxWidth = width - marginX * 2;

    let fontSize = 7;
    while (
      fontSize > 4.5 &&
      font.widthOfTextAtSize(text, fontSize) > maxWidth
    ) {
      fontSize -= 0.25;
    }

    page.drawText(text, {
      x: marginX,
      y: height - 15,
      size: fontSize,
      font,
      color: rgb(0.55, 0.58, 0.65),
    });

    return Buffer.from(await pdfDoc.save());
  }

  async convertPdfToPng(pdfBuffer: Buffer): Promise<Buffer> {
    const pngPage = await pdfToPng(pdfBuffer, {
      useSystemFonts: false,
      pagesToProcess: [1],
      viewportScale: 1,
    });

    return pngPage[0].content;
  }

  async convertImageToPdf(file: Express.Multer.File): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const buf = file.buffer;
    let image: PDFImage;
    if (file?.mimetype && file.mimetype === 'image/png') {
      image = await pdfDoc.embedPng(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      );
    } else if (file.mimetype === 'image/jpeg') {
      image = await pdfDoc.embedJpg(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      );
    } else {
      throw new Error('Unsupported image format');
    }
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: 595,
      height: 842,
    });

    return Buffer.from(await pdfDoc.save());
  }

  async generateAuditLogPdf(
    document: ReadDocumentDto,
    auditLogs: AuditLog[],
    transactionHash: string,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();

    let page = pdfDoc.addPage([595, 842]);
    pdfDoc.registerFontkit(fontkit);

    const defaultFontBytes = await this.readDefaultFontBytes('default');
    const defaultFont = await pdfDoc.embedFont(defaultFontBytes);
    const defaultBoldFontBytes = await this.readDefaultFontBytes('defaultBold');
    const defaultFontBold = await pdfDoc.embedFont(defaultBoldFontBytes);

    const logoUrl = 'https://docuchain.io/app/assets/logo-big.png';
    const logoImageBytes = await fetch(logoUrl).then((res) =>
      res.arrayBuffer(),
    );
    const logoImage = await pdfDoc.embedPng(logoImageBytes);

    const logoFontSize = 18;
    const titleFontSize = 12;
    const fontSize = 10;

    const leftX = 50;
    const rightX = 200;

    page.drawImage(logoImage, {
      x: leftX,
      y: 792,
      width: 30,
      height: 30,
    });

    page.drawText('DocuChain', {
      x: leftX + 35,
      y: 800,
      size: logoFontSize,
      font: defaultFont,
    });

    page.drawText('Certificate of Completion', {
      x: rightX + 130,
      y: 800,
      size: logoFontSize,
      font: defaultFont,
    });

    page.drawText(`Document ID: ${document.shortId.toUpperCase()}`, {
      x: leftX,
      y: 770,
      size: titleFontSize,
      font: defaultFontBold,
    });

    page.drawLine({
      start: { x: 30, y: 765 },
      end: { x: 565, y: 765 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawText(
      `${document.name.endsWith('.pdf') ? document.name : document.name + '.pdf'}  ${sizeFormatter(document.size)}`,
      {
        x: leftX,
        maxWidth: rightX - leftX,
        y: 750,
        size: fontSize,
        font: defaultFontBold,
        lineHeight: 14,
      },
    );

    page.drawText('Original SHA256:', {
      x: rightX,
      y: 750,
      size: fontSize,
      font: defaultFontBold,
    });

    page.drawText(`${document.originalHash}`, {
      x: rightX,
      y: 730,
      size: fontSize,
      font: defaultFont,
    });

    page.drawText('Result SHA256:', {
      x: rightX,
      y: 710,
      size: fontSize,
      font: defaultFontBold,
    });

    page.drawText(`${document.hash}`, {
      x: rightX,
      y: 690,
      size: fontSize,
      font: defaultFont,
    });

    page.drawText('Blockchain tx:', {
      x: rightX,
      y: 670,
      size: fontSize,
      font: defaultFontBold,
    });

    page.drawText(`${transactionHash}`, {
      x: rightX,
      y: 650,
      size: fontSize,
      font: defaultFont,
    });

    page.drawText(`Generated at:`, {
      x: rightX,
      y: 630,
      size: fontSize,
      font: defaultFontBold,
    });

    page.drawText(`${formatDateString(new Date())}`, {
      x: rightX + 70,
      y: 630,
      size: fontSize,
      font: defaultFont,
    });

    page.drawLine({
      start: { x: 30, y: 620 },
      end: { x: 565, y: 620 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    let yCord = 620 - 15;
    const signers = document.users.filter(
      (user) => user.role === UserRoles.SIGNER,
    );

    const signerSectionHeight = 105;
    for (const user of signers) {
      const signatureFontSize = user.signatures[0]?.fontSize ?? 22;
      const signatureFont = user.signatures[0]?.signFont ?? 'italianno-regular';
      const signatureImage = user.signatures[0]?.signImage;

      page.drawText(`${user.email}`, {
        x: leftX,
        y: yCord,
        size: fontSize,
        font: defaultFontBold,
      });

      page.drawText(`User ID: ${user.id}`, {
        x: leftX,
        y: yCord - 20,
        size: fontSize,
        font: defaultFont,
      });

      page.drawText(`IP: ${user.ip}`, {
        x: leftX,
        y: yCord - 40,
        size: fontSize,
        font: defaultFont,
      });

      page.drawText(`User Agent: ${user.userAgent?.slice(0, -30)}`, {
        x: leftX,
        y: yCord - 60,
        size: fontSize,
        font: defaultFont,
      });

      page.drawText('Signature:', {
        x: leftX,
        y: yCord - 80,
        size: fontSize,
        font: defaultFont,
      });

      if (signatureImage) {
        const image = await this.embedSignatureImage(pdfDoc, signatureImage);
        const scale = Math.min(150 / image.width, 26 / image.height, 1);

        page.drawImage(image, {
          x: leftX + 50,
          y: yCord - 88,
          width: image.width * scale,
          height: image.height * scale,
        });
      } else {
        let fontBytes = await this.fetchFontBytes(signatureFont);

        if (isCyrillic(user.name)) {
          fontBytes = await this.fetchFontBytes('marck-script-regular');
        }
        const customFont = await pdfDoc.embedFont(fontBytes);

        page.drawText(`${user.name}`, {
          x: leftX + 50,
          y: yCord - 80,
          size: signatureFontSize,
          font: customFont,
        });
      }

      page.drawLine({
        start: { x: 30, y: yCord - 90 },
        end: { x: 565, y: yCord - 90 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      yCord = yCord - signerSectionHeight;

      if (yCord - signerSectionHeight < 0) {
        pdfDoc.addPage([595, 842]);
        yCord = 800;
        page = pdfDoc.getPage(pdfDoc.getPages().length - 1);
      }
    }
    yCord -= 5;

    page.drawText('Event Log', {
      x: leftX,
      y: yCord,
      size: titleFontSize,
      font: defaultFontBold,
    });

    let yCord2 = yCord;
    await Promise.all(
      auditLogs.map(async (auditLog) => {
        yCord2 = yCord2 - 20;
        page.drawText(`${formatDateString(auditLog.createdAt)}`, {
          x: leftX,
          y: yCord2,
          size: fontSize,
          font: defaultFont,
        });
        const userEmail = document.users.find(
          (user) => user.id === auditLog.userId,
        )?.email;
        page.drawText(`${auditLog.eventName} by ${userEmail}`, {
          x: rightX,
          y: yCord2,
          size: fontSize,
          font: defaultFont,
        });
        if (yCord2 < 50) {
          pdfDoc.addPage([595, 842]);
          yCord2 = 800;
          page = pdfDoc.getPage(pdfDoc.getPages().length - 1);
        }
      }),
    );

    return Buffer.from(await pdfDoc.save());
  }

  private async embedSignatureImage(
    pdfDoc: PDFDocument,
    dataUrl: string,
  ): Promise<PDFImage> {
    const match = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);

    if (!match) {
      throw new Error('Unsupported signature image format');
    }

    const imageBytes = Buffer.from(match[2], 'base64');

    return match[1] === 'png'
      ? pdfDoc.embedPng(imageBytes)
      : pdfDoc.embedJpg(imageBytes);
  }

  async fetchFontBytes(signatureFont: string): Promise<ArrayBuffer> {
    let fontBytes: ArrayBuffer;
    const signatureFontUrl =
      FontUrls[`${signatureFont}`] ?? 'italianno-regular';
    try {
      fontBytes = await fetch(signatureFontUrl).then((res) =>
        res.arrayBuffer(),
      );
    } catch (error) {
      console.error(
        'Error fetching the initial font, fetching from fallback font',
        error,
      );
      fontBytes = await fetch(FontUrls['italianno-regular']).then((res) =>
        res.arrayBuffer(),
      );
    }

    return fontBytes;
  }

  async readDefaultFontBytes(signatureFont: string): Promise<ArrayBuffer> {
    let defaultFontBytes: ArrayBuffer;
    const defaultFontPath = FontUrls[`${signatureFont}`] ?? FontUrls['default'];

    try {
      const filePath = path.join(__dirname, '..', defaultFontPath);
      defaultFontBytes = fs.readFileSync(filePath);
    } catch (error) {
      console.error(
        'Error fetching the initial font, fetching from fallback font',
        error,
      );
    }
    return defaultFontBytes;
  }
}
