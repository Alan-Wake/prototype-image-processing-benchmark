import { Context, Handler, Callback } from 'aws-lambda';
import * as Sharp from 'sharp';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
interface IPreset {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const buildRespose = (input: any, message: any, code: number): any=> ({
  statusCode: code,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({
    message: message,
    input,
  }),
})

export const download = async (bucketName: string, key: string): Promise<any> => {
  return await s3.getObject({ Bucket: bucketName, Key: key }).promise();
}

export const flatten = (arr: any, depth = 1) =>
  arr.reduce((a: any, v: any) => a.concat(depth > 1 && Array.isArray(v) ? flatten(v, depth - 1) : v), []);

export const crop = (image: Sharp.Sharp, preset: IPreset): Promise<Buffer> => {
  try {
    return image.extract({ ...preset }).toBuffer();
  } catch (e) {
    throw new Error(e);
  }
}

export const uploadImage: Handler = async (event: any, context: Context, cb: Callback) => {
  const { cols, rows, name } = event;

  try {
    const file = await download('alanwake',name);
    await Sharp.cache(false);
    const idata = await Sharp(file.Body).sequentialRead(true).limitInputPixels(0);
    const metadata = await idata.metadata();
    const presets: IPreset[][] = [...Array(cols).keys()].map(col => {
      return [...Array(rows).keys()].map(row => {
        return {
          top: Math.floor(metadata.height as number / cols) * col,
          left: Math.floor(metadata.width as number / rows) * row,
          width: Math.floor(metadata.width as number / rows),
          height: Math.floor(metadata.height as number / cols)
        }
      })
    });

    const result = await Promise.all(flatten(presets).map((p: IPreset) => crop(idata, p)));
    cb(null, buildRespose(null, "Cropped", 200));

  } catch (e) {
    cb(null, buildRespose(e.message, "Error", 520))
  }
}