import { User } from '../../database/entities/user.entity';

export interface IUserWithCoords extends User {
  ycord: number;
  pageNumber: number;
}

export interface IPDFSettings {
  users: User[];
  numberOfPages: number;
  lastContentElementY: number;
  heightGap: number;
  pageHeight: number;
}

export interface ICoords {
  result: IUserWithCoords[];
  newPagesCount: number;
}

export interface IDocumentWithInitials {
  file: Buffer;
  usersWithCoords: IUserWithCoords[];
}
