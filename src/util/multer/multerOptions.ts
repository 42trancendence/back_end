import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import uuidRandom from './uuidRandom';

export const multerOptions = {
  fileFilter: (req: any, file: any, cb: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|svg)$/)) {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
      return;
    }
    cb(null, true);
  },
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const uploadPath = 'public';

      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath);
      }

      cb(null, uploadPath);
    },

    filename: (req: any, file: any, cb: any) => {
      cb(null, uuidRandom(file));
    },
  }),
};
